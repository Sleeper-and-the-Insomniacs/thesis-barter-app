/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */
import { Router, type Request } from 'express';
import { getDistance } from 'geolib';
import type { Prisma } from '../db/generated/client.js';
import { prisma } from '../db/index.js';
import { enqueueJob } from '../services/jobQueue.js';
import requireAuth from '../middleware/requireAuth.js';
import { getDownloadUrl } from '../services/s3.js';
import { getBlockedRelationshipIds } from '../services/blocks.js';
import { getIo } from '../middleware/socket.js';
import { getAvatarUrlMap } from '../services/userMedia.js';
import { isValidZipCode } from '../services/validation.js';
import { geocodePostalCode } from '../services/geocoding.js';

const posts = Router();
const METERS_PER_MILE = 1609.344;

const DISTANCES = [
  5, 6, 7, 8, 9, 10, 15, 20, 30, 40,
  50, 60, 70, 80, 90, 100, 200, 300, '∞',
];

const CONDITIONS = [
  'POOR',
  'AVERAGE',
  'GOOD',
  'EXCELLENT',
  'MINT',
];

// type definitions
interface MediaItem {
  sortOrder?: number;
  media?: {
    id: number;
    variant?: string | null;
    s3Key: string;
  } | null;
}

interface TradeOfferItem {
  offererId: number;
  status: string;
  tradeOfferMedia?: MediaItem[];
  [key: string]: unknown;
}

// helper functions:

const getUserId = (req: Request): number => req.user!.id;

// Signals 'no owned-open post matched' out of a $transaction callback, since you
// can't `return res.status(...)` from inside one
class PostNotFoundForUpdate extends Error {}

// Generate the repeated where-clause for updating/deleting posts
const getOwnedOpenPostWhere = (req: Request) => ({
  id: Number(req.params.id),
  userId: getUserId(req),
  status: 'OPEN' as const,
});

// fetch S3 URLs for preview and full media variants
const getMediaUrls = async (
  mediaArray?: MediaItem[],
  allowFull: boolean = false,
) => {
  if (!mediaArray) return { previewUrl: null, fullUrl: null };

  const fetchUrl = async (variant: string) => {
    const item = mediaArray.find((m) => m.media?.variant === variant);
    if (!item || !item.media?.s3Key) return null;
    return getDownloadUrl(item.media.s3Key).catch((err) => {
      console.error(`Error getting ${variant} URL:`, err);
      return null;
    });
  };

  return {
    previewUrl: await fetchUrl('PREVIEW'),
    fullUrl: allowFull ? await fetchUrl('FULL') : null,
  };
};

const getPostImageData = async (
  mediaArray?: MediaItem[],
) => {
  if (!mediaArray) return { imageUrls: [], imageItems: [] };

  const postImages = mediaArray
    .filter((m) => m.media?.variant == null && m.media?.s3Key)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const imageItems = await Promise.all(
    postImages.map(async (item) => {
      const key = item.media?.s3Key;
      const mediaId = item.media?.id;

      if (!key || !mediaId) return null;

      const url = await getDownloadUrl(key).catch((err) => {
        console.error('Error getting post image URL:', err);
        return null;
      });

      if (!url) return null;

      return { mediaId, url };
    }),
  );

  const filteredImageItems = imageItems.filter(
    (item): item is { mediaId: number; url: string } => Boolean(item),
  );

  return {
    imageUrls: filteredImageItems.map((item) => item.url),
    imageItems: filteredImageItems,
  };
};

// GET: all the categories of active posts + a count of each category (for advanced search feature)
posts.get('/categories', async (req, res) => {
  try {
    const blockedRelationshipIds = req.user
      ? await getBlockedRelationshipIds(getUserId(req))
      : [];

    const rows = await prisma.post.groupBy({
      by: ['category'],
      where: {
        isRemoved: false,
        isPendingScreening: false,
        status: { not: 'COMPLETED' as const },
        category: { not: null },
        ...(blockedRelationshipIds.length
          ? { userId: { notIn: blockedRelationshipIds } }
          : {}),
      },
      _count: {
        _all: true,
      },
    });

    const categories = rows
      .filter((row) => Boolean(row.category))
      .map((row) => ({
        category: row.category!,
        count: row._count._all,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    return res.json(categories);
  } catch (error) {
    console.error('Failed to GET post categories:', error);
    return res.status(500).json({ error: 'Unable to retrieve categories.' });
  }
});

// GET: public feed excludes removed posts: ?mine=true returns
// user's own posts including removed ones, for their Manage Posts view
posts.get('/', async (req, res) => {
  try {
    const search = String(req.query.q ?? '').trim();
    const titleSearch = String(req.query.title ?? '').trim();
    const descriptionSearch = String(req.query.description ?? '').trim();
    const userSearch = String(req.query.user ?? '').trim();
    const listingType = String(req.query.listingType ?? '').trim();
    const conditionSearch = String(req.query.condition ?? '').trim();
    const hasImages = String(req.query.hasImages ?? '').trim() === 'true';
    const includeCompleted = String(req.query.includeCompleted ?? '').trim() === 'true';
    const excludeInactive = String(req.query.excludeInactive ?? '').trim() === 'true';
    const includeOwn = String(req.query.includeOwn ?? '').trim() === 'true';
    const advancedSearch = String(req.query.advancedSearch ?? '').trim() === 'true';
    const dateMode = String(req.query.dateMode ?? '').trim();
    const dateStart = String(req.query.dateStart ?? '').trim();
    const dateEnd = String(req.query.dateEnd ?? '').trim();
    const categorySearch = String(req.query.category ?? '').trim();
    const distanceRange = String(req.query.distanceRange ?? '').trim();
    const distancePostalCode = String(req.query.distancePostalCode ?? '').trim();
    const mine = req.query.mine === 'true';
    const profileUserId = req.query.userId
      ? Number(req.query.userId)
      : undefined;
    const paginationRequested = req.query.offset !== undefined
      || req.query.limit !== undefined;
    const offset = Number(req.query.offset ?? 0);
    const limit = Number(req.query.limit ?? 10);

    if (mine && !req.user) return res.status(401).json({ error: 'Unauthorized' });

    const viewerId = req.user?.id;
    if (
      paginationRequested
      && (
        !Number.isInteger(offset)
        || offset < 0
        || !Number.isInteger(limit)
        || limit < 1
      )
    ) {
      return res.status(400).json({ error: 'Invalid post pagination.' });
    }

    if (
      dateMode
      && dateMode !== 'before'
      && dateMode !== 'after'
      && dateMode !== 'between'
    ) {
      return res.status(400).json({ error: 'Invalid date search.' });
    }

    if (
      listingType
      && listingType !== 'PRODUCT'
      && listingType !== 'SERVICE'
      && listingType !== 'DIGITAL'
    ) {
      return res.status(400).json({ error: 'Invalid listing type.' });
    }

    if (
      conditionSearch
      && !CONDITIONS.includes(conditionSearch)
    ) {
      return res.status(400).json({ error: 'Invalid item condition.' });
    }

    if (
      distanceRange
      && !DISTANCES.some((distance) => distanceRange === String(distance))
    ) {
      return res.status(400).json({ error: 'Invalid distance range.' });
    }

    let viewerCoordinates = null;

    if (distanceRange && distancePostalCode && distanceRange !== '∞') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Sign in to search by distance.',
        });
      }

      const viewer = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: {
          lat: true,
          lng: true,
          zipCode: true,
          country: true,
        },
      });

      if (!viewer || !viewer.country) {
        return res.status(400).json({
          error: 'Set your location before searching by distance.',
        });
      }

      const searchPostalCode = distancePostalCode;

      const savedPostalCode = viewer.zipCode?.trim() || '';

      if (
        savedPostalCode
        && searchPostalCode.toUpperCase() === savedPostalCode.toUpperCase()
        && viewer.lat !== null
        && viewer.lng !== null
      ) {
        viewerCoordinates = {
          lat: viewer.lat,
          lng: viewer.lng,
        };
      } else {
        const geocodedLocation = await geocodePostalCode(
          searchPostalCode,
          viewer.country,
        );

        if (!geocodedLocation) {
          return res.status(400).json({
            error: 'Could not find that postal code.',
          });
        }

        viewerCoordinates = {
          lat: geocodedLocation.lat,
          lng: geocodedLocation.lng,
        };
      }
    }

    const blockedRelationshipIds = !mine && !profileUserId && req.user
      ? await getBlockedRelationshipIds(getUserId(req))
      : [];

    let hideTradeHistory = false;
    if (profileUserId && profileUserId !== viewerId) {
      const profileUser = await prisma.user.findUnique({
        where: { id: profileUserId },
        select: { tradeHistoryVisible: true },
      });
      hideTradeHistory = Boolean(profileUser && !profileUser.tradeHistoryVisible);
    }

    // A user's 'trading history' includes posts they authored, posts where they
    // completed an art trade offer, and posts where they completed a generic
    // trade as the requester - not just posts they own
    const ownedOrCompletedFilter = (userId: number) => ({
      OR: [
        { userId },
        {
          isRemoved: false,
          isPendingScreening: false,
          tradeOffers: {
            some: { offererId: userId, status: 'COMPLETED' as const },
          },
        },
        {
          isRemoved: false,
          isPendingScreening: false,
          trades: {
            some: { requesterId: userId, status: 'COMPLETED' as const },
          },
        },
      ],
    });

    const searchFilter = search
      ? [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { message: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      ]
      : [];

    const advancedFilters: Prisma.PostWhereInput[] = [];

    if (titleSearch) {
      advancedFilters.push({
        title: {
          contains: titleSearch,
          mode: 'insensitive' as const,
        },
      });
    }

    if (descriptionSearch) {
      advancedFilters.push({
        message: {
          contains: descriptionSearch,
          mode: 'insensitive' as const,
        },
      });
    }

    if (userSearch) {
      advancedFilters.push({
        user: {
          name: {
            contains: userSearch,
            mode: 'insensitive' as const,
          },
        },
      });
    }

    if (categorySearch) {
      advancedFilters.push({
        category: {
          equals: categorySearch,
          mode: 'insensitive' as const,
        },
      });
    }

    if (excludeInactive) {
      const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      advancedFilters.push({
        OR: [
          { status: { not: 'OPEN' as const } },
          { user: { lastActive: { gte: activeSince } } },
        ],
      });
    }

    if (dateMode === 'before' || dateMode === 'after') {
      if (!dateStart) {
        return res.status(400).json({ error: 'Date is required.' });
      }

      const selectedDate = new Date(`${dateStart}T00:00:00.000Z`);

      if (Number.isNaN(selectedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date.' });
      }

      if (dateMode === 'before') {
        advancedFilters.push({
          createdAt: {
            lt: selectedDate,
          },
        });
      } else {
        const nextDate = new Date(selectedDate);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);

        advancedFilters.push({
          createdAt: {
            gte: nextDate,
          },
        });
      }
    }

    if (dateMode === 'between') {
      if (!dateStart || !dateEnd) {
        return res.status(400).json({
          error: 'Start date and end date are required.',
        });
      }

      const startDate = new Date(`${dateStart}T00:00:00.000Z`);
      const endDate = new Date(`${dateEnd}T00:00:00.000Z`);

      if (
        Number.isNaN(startDate.getTime())
        || Number.isNaN(endDate.getTime())
      ) {
        return res.status(400).json({ error: 'Invalid date.' });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          error: 'End date must be on or after the start date.',
        });
      }

      const endDateExclusive = new Date(endDate);
      endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);

      advancedFilters.push({
        createdAt: {
          gte: startDate,
          lt: endDateExclusive,
        },
      });
    }

    const buildWhere = () => {
      if (mine) return ownedOrCompletedFilter(getUserId(req));
      if (profileUserId) {
        return {
          AND: [
            { isRemoved: false, isPendingScreening: false },
            ownedOrCompletedFilter(profileUserId),
            ...(hideTradeHistory ? [{ status: { not: 'COMPLETED' as const } }] : []),
            ...searchFilter,
          ],
        };
      }

      return {
        AND: [
          { isRemoved: false, isPendingScreening: false },
          ...(includeCompleted
            ? []
            : [{ status: { not: 'COMPLETED' as const } }]),
          ...(blockedRelationshipIds.length
            ? [{ userId: { notIn: blockedRelationshipIds } }]
            : []),
          ...(advancedSearch && req.user && !includeOwn
            ? [{ userId: { not: getUserId(req) } }]
            : []),
          ...searchFilter,
          ...advancedFilters,
        ],
      };
    };

    const needsPostFilter = Boolean(
      (distanceRange && distancePostalCode && distanceRange !== '∞')
      || listingType
      || conditionSearch
      || hasImages,
    );

    const databasePagination = paginationRequested
      && !mine
      && !profileUserId
      && !needsPostFilter;

    let postTake = mine || profileUserId || needsPostFilter ? undefined : 50;
    let postSkip: number | undefined;

    if (databasePagination) {
      postTake = limit;
      postSkip = offset;
    }

    const rawPosts = await prisma.post.findMany({
      where: buildWhere(),
      take: postTake,
      skip: postSkip,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        products: true,
        services: true,
        comments: {
          // Everyone sees approved comments; the author of a comment still
          // waiting on screening can also see their own until it resolves.
          where: {
            isRemoved: false,
            OR: [
              { isPendingScreening: false },
              ...(viewerId !== undefined ? [{ userId: viewerId }] : []),
            ],
          },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        trades: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            ownerId: true,
            requesterId: true,
            ownerCompl: true,
            reqCompl: true,
          },
        },
        postMedia: { include: { media: true } },
        tradeOffers: {
          where: mine ? undefined : { status: 'COMPLETED' },
          include: {
            offerer: true,
            tradeOfferMedia: { include: { media: true } },
          },
        },
        ...(mine && {
          reports: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              resolver: { select: { id: true, name: true } },
              appeal: true,
            },
          },
        }),
      },
    });

    const filteredPosts = rawPosts.filter((post) => {
      const isDigital = post.postMedia.some(
        (item) => (
          item.media?.variant === 'PREVIEW'
          || item.media?.variant === 'FULL'
        ),
      );

      if (listingType === 'PRODUCT' && post.products.length === 0) {
        return false;
      }

      if (listingType === 'SERVICE' && post.services.length === 0) {
        return false;
      }

      if (listingType === 'DIGITAL' && !isDigital) {
        return false;
      }

      if (
        conditionSearch
        && !post.products.some(
          (product) => product.condition === conditionSearch,
        )
      ) {
        return false;
      }

      if (hasImages) {
        const postImageCount = isDigital
          ? 1
          : post.postMedia.filter(
            (item) => item.media?.variant == null,
          ).length;

        if (postImageCount < 1) {
          return false;
        }
      }

      if (distanceRange && distancePostalCode && distanceRange !== '∞') {
        if (
          !viewerCoordinates
          || post.lat === null
          || post.lng === null
        ) {
          return false;
        }

        const distanceMeters = getDistance(
          {
            latitude: viewerCoordinates.lat,
            longitude: viewerCoordinates.lng,
          },
          {
            latitude: post.lat,
            longitude: post.lng,
          },
        );

        const distanceMiles = distanceMeters / METERS_PER_MILE;
        const selectedDistance = Number(distanceRange);

        return distanceMiles < selectedDistance;
      }

      return true;
    });

    let visibleRawPosts = !mine && !profileUserId
      ? filteredPosts.slice(0, 50)
      : filteredPosts;

    if (paginationRequested && !mine && !profileUserId && needsPostFilter) {
      visibleRawPosts = filteredPosts.slice(offset, offset + limit);
    }

    const authorAvatarMap = await getAvatarUrlMap([
      ...visibleRawPosts.map((post) => post.user.id),
      ...visibleRawPosts.flatMap((post) => post.comments.map((comment) => comment.userId)),
    ]);

    const postsWithUrls = await Promise.all(
      visibleRawPosts.map(async (post) => {
        const { trades, ...postRest } = post;
        const isOwner = viewerId !== undefined && post.userId === viewerId;
        const viewerCompletedOffer = (post.tradeOffers || []).find(
          (o: TradeOfferItem) => o.offererId === viewerId && o.status === 'COMPLETED',
        );
        const viewerCompletedTrade = trades.find(
          (trade) => trade.requesterId === viewerId && trade.status === 'COMPLETED',
        );

        const postUrls = await getMediaUrls(
          post.postMedia,
          isOwner || Boolean(viewerCompletedOffer) || Boolean(viewerCompletedTrade),
        );

        const { imageUrls, imageItems } = await getPostImageData(post.postMedia);
        const previewMedia = post.postMedia.find((item) => item.media?.variant === 'PREVIEW');
        const fullMedia = post.postMedia.find((item) => item.media?.variant === 'FULL');

        const tradeOffers = await Promise.all(
          (post.tradeOffers || []).map(async (offer: TradeOfferItem) => {
            const isOfferer = viewerId !== undefined && offer.offererId === viewerId;
            const offerAllowFull = isOfferer || (isOwner && offer.status === 'COMPLETED');

            return {
              ...offer,
              ...(await getMediaUrls(offer.tradeOfferMedia, offerAllowFull)),
            };
          }),
        );

        return {
          ...postRest,
          user: { ...postRest.user, avatarUrl: authorAvatarMap.get(post.user.id) ?? null },
          comments: post.comments.map((comment) => ({
            ...comment,
            user: { ...comment.user, avatarUrl: authorAvatarMap.get(comment.userId) ?? null },
          })),
          trade: trades[0] ?? null,
          ...postUrls,
          previewMediaId: previewMedia?.media?.id ?? null,
          fullMediaId: fullMedia?.media?.id ?? null,
          imageUrls,
          imageItems,
          tradeOffers,
        };
      }),
    );

    return res.json(postsWithUrls);
  } catch (error) {
    console.error('Failed to GET posts:', error);
    return res.status(500).json({ error: 'Unable to retrieve posts.' });
  }
});

// POST: Allows user to create a new post
// Screens post before creating it, rejecting clear violations outright
posts.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      message,
      isLocal = false,
      zipCode,
      radiusMiles,
      previewMediaId,
      fullMediaId,
      mediaIds,
      offerType,
      category,
      condition,
    } = req.body;

    if (isLocal && (!zipCode || !isValidZipCode(String(zipCode)))) {
      return res.status(400).json({ error: 'Please enter a valid zip code.' });
    }

    const userId = getUserId(req);
    const trimmedCategory = typeof category === 'string' ? category.trim() : '';

    // Doesn't depend on the post existing yet - resolve before opening the transaction
    if (mediaIds !== undefined && !Array.isArray(mediaIds)) {
      return res.status(400).json({ error: 'mediaIds must be an array.' });
    }

    const normalMediaIds = Array.isArray(mediaIds)
      ? mediaIds.map(Number)
      : [];

    if (normalMediaIds.length > 5) {
      return res.status(400).json({ error: 'Image limit is 5.' });
    }

    if (normalMediaIds.some((mediaId) => !Number.isInteger(mediaId) || mediaId <= 0)) {
      return res.status(400).json({ error: 'Invalid media ID.' });
    }

    if (new Set(normalMediaIds).size !== normalMediaIds.length) {
      return res.status(400).json({ error: 'Duplicate media IDs are not allowed.' });
    }

    let mediaKeys: string[] = [];
    let postMediaCreate: { mediaId: number; sortOrder: number }[] = [];

    if (offerType === 'DIGITAL' && previewMediaId && fullMediaId) {
      mediaKeys = (
        await prisma.media.findMany({
          where: {
            id: { in: [Number(previewMediaId), Number(fullMediaId)] },
          },
          select: { s3Key: true },
        })
      ).map((m) => m.s3Key);

      postMediaCreate = [
        { mediaId: Number(previewMediaId), sortOrder: 0 },
        { mediaId: Number(fullMediaId), sortOrder: 1 },
      ];
    } else if (
      (offerType === 'PRODUCT' || offerType === 'SERVICE')
      && normalMediaIds.length > 0
    ) {
      const normalMedia = await prisma.media.findMany({
        where: {
          id: { in: normalMediaIds },
          uploaderId: userId,
          variant: null,
        },
        select: {
          id: true,
          s3Key: true,
        },
      });

      if (normalMedia.length !== normalMediaIds.length) {
        return res.status(400).json({ error: 'One or more post images are invalid.' });
      }

      const normalMediaById = new Map(
        normalMedia.map((mediaItem) => [mediaItem.id, mediaItem]),
      );

      mediaKeys = normalMediaIds.map(
        (mediaId) => normalMediaById.get(mediaId)!.s3Key,
      );

      postMediaCreate = normalMediaIds.map((mediaId, sortOrder) => ({
        mediaId,
        sortOrder,
      }));
    }

    const userLocation = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lat: true,
        lng: true,
      },
    });

    const newPost = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          userId,
          title,
          message,
          category: trimmedCategory || null,
          isLocal,
          zipCode: isLocal ? zipCode : null,
          radiusMiles: isLocal ? radiusMiles : null,
          lat: userLocation?.lat ?? null,
          lng: userLocation?.lng ?? null,
          isPendingScreening: true,
          ...(postMediaCreate.length > 0 && {
            postMedia: {
              create: postMediaCreate,
            },
          }),
        },
      });

      // DIGITAL offers have no Product/Service catalog entry
      // the post + attached media is the offering
      if (
        (offerType === 'PRODUCT' || offerType === 'SERVICE')
        && trimmedCategory
      ) {
        const cat = await tx.cat.upsert({
          where: { name_type: { name: trimmedCategory, type: offerType } },
          create: { name: trimmedCategory, type: offerType },
          update: {},
        });

        if (offerType === 'PRODUCT') {
          await tx.product.create({
            data: {
              postId: post.id,
              userId,
              catId: cat.id,
              name: title,
              condition: condition || 'GOOD',
            },
          });
        } else {
          await tx.service.create({
            data: {
              postId: post.id,
              userId,
              catId: cat.id,
              name: title,
            },
          });
        }
      }

      // Same transaction as the create - a crash between the two would otherwise
      // leave the post stuck isPendingScreening forever with no Job to reclaim it
      await enqueueJob(tx, 'SCREEN_CONTENT', {
        targetType: 'POST',
        targetId: post.id,
        authorId: userId,
        text: `${title}\n\n${message}`,
        imageKeys: mediaKeys,
      });

      return post;
    });

    // Optimistic refresh signal - the processor emits its own post-commit posts:changed later
    getIo().emit('posts:changed');
    return res.status(201).json(newPost);
  } catch (error) {
    console.error('Failed to POST new post:', error);
    return res.status(500).json({ error: 'Unable to create post' });
  }
});

// PATCH: allows user to update an existing post
posts.patch('/:id', requireAuth, async (req, res) => {
  try {
    const {
      title, message, isLocal = false, zipCode, radiusMiles, mediaIds, previewMediaId, fullMediaId,
    } = req.body;

    const userId = getUserId(req);
    const mediaUpdateRequested = mediaIds !== undefined || previewMediaId !== undefined || fullMediaId !== undefined;

    // This screens post edits when they're submitted
    if (
      isLocal
      && (zipCode === undefined || zipCode === null || zipCode === '')
    ) {
      return res
        .status(400)
        .json({ error: 'zipCode is required when isLocal is true.' });
    }

    if (isLocal && !isValidZipCode(String(zipCode))) {
      return res.status(400).json({ error: 'Please enter a valid zip code.' });
    }

    const parsedRadius = isLocal ? Number(radiusMiles) : null;

    if (isLocal && !Number.isFinite(parsedRadius)) {
      return res
        .status(400)
        .json({ error: 'radiusMiles must be a number when isLocal is true.' });
    }

    if (mediaIds !== undefined && !Array.isArray(mediaIds)) {
      return res.status(400).json({ error: 'mediaIds must be an array.' });
    }

    const normalMediaIds = Array.isArray(mediaIds)
      ? mediaIds.map(Number)
      : [];

    if (normalMediaIds.length > 5) {
      return res.status(400).json({ error: 'Image limit is 5.' });
    }

    if (normalMediaIds.some((mediaId) => !Number.isInteger(mediaId) || mediaId <= 0)) {
      return res.status(400).json({ error: 'Invalid media ID.' });
    }

    if (new Set(normalMediaIds).size !== normalMediaIds.length) {
      return res.status(400).json({ error: 'Duplicate media IDs are not allowed.' });
    }

    if (normalMediaIds.length > 0) {
      const normalMedia = await prisma.media.findMany({
        where: {
          id: { in: normalMediaIds },
          uploaderId: userId,
          variant: null,
        },
        select: {
          id: true,
        },
      });

      if (normalMedia.length !== normalMediaIds.length) {
        return res.status(400).json({ error: 'One or more post images are invalid.' });
      }
    }

    if (previewMediaId !== undefined || fullMediaId !== undefined) {
      if (!previewMediaId || !fullMediaId) {
        return res.status(400).json({ error: 'Preview and full media are required for digital posts.' });
      }

      const digitalMedia = await prisma.media.findMany({
        where: {
          id: { in: [Number(previewMediaId), Number(fullMediaId)] },
          uploaderId: userId,
        },
        select: {
          id: true,
          variant: true,
        },
      });

      const hasPreview = digitalMedia.some((mediaItem) => mediaItem.id === Number(previewMediaId) && mediaItem.variant === 'PREVIEW');
      const hasFull = digitalMedia.some((mediaItem) => mediaItem.id === Number(fullMediaId) && mediaItem.variant === 'FULL');

      if (!hasPreview || !hasFull) {
        return res.status(400).json({ error: 'Invalid digital media.' });
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const existingPost = await tx.post.findFirst({
          where: getOwnedOpenPostWhere(req),
          select: {
            title: true,
            message: true,
          },
        });

        if (!existingPost) throw new PostNotFoundForUpdate();

        const textChanged = existingPost.title !== title || existingPost.message !== message;

        await tx.post.update({
          where: {
            id: Number(req.params.id),
          },
          data: {
            title,
            message,
            isLocal,
            zipCode: isLocal ? String(zipCode) : null,
            radiusMiles: parsedRadius,
            ...(textChanged ? { isPendingScreening: true } : {}),
          },
        });

        if (mediaUpdateRequested) {
          await tx.postMedia.deleteMany({
            where: {
              postId: Number(req.params.id),
            },
          });

          if (normalMediaIds.length > 0) {
            await tx.postMedia.createMany({
              data: normalMediaIds.map((mediaId, sortOrder) => ({
                postId: Number(req.params.id),
                mediaId,
                sortOrder,
              })),
            });
          } else if (previewMediaId && fullMediaId) {
            await tx.postMedia.createMany({
              data: [
                {
                  postId: Number(req.params.id),
                  mediaId: Number(previewMediaId),
                  sortOrder: 0,
                },
                {
                  postId: Number(req.params.id),
                  mediaId: Number(fullMediaId),
                  sortOrder: 1,
                },
              ],
            });
          }
        }

        if (textChanged) {
          await enqueueJob(tx, 'SCREEN_CONTENT', {
            targetType: 'POST',
            targetId: Number(req.params.id),
            authorId: getUserId(req),
            text: `${title}\n\n${message}`,
          });
        }
      });
    } catch (err) {
      if (err instanceof PostNotFoundForUpdate) {
        return res
          .status(404)
          .json({ error: 'Post not found to PATCH as update.' });
      }
      throw err; // Falls through to the route's own outer catch
    }

    getIo().emit('posts:changed');
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to PATCH post:', error);
    return res.status(500).json({ error: 'Unable to update post.' });
  }
});

// DELETE: allows user to delete a post
posts.delete('/:id', requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = getUserId(req);

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
      },
      include: {
        trades: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found to DELETE.' });
    }

    const hasBlockingTrade = post.trades.some(
      (trade) => trade.status !== 'CANCELLED',
    );

    if (hasBlockingTrade) {
      return res.status(409).json({
        error: 'Cannot delete post while trade is in progress.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trade.deleteMany({
        where: {
          postId,
          status: 'CANCELLED',
        },
      });

      await tx.post.delete({
        where: {
          id: postId,
        },
      });
    });

    getIo().emit('posts:changed');
    return res.sendStatus(200);
  } catch (error) {
    console.error('Failed to DELETE post:', error);
    return res.status(500).json({ error: 'Unable to delete post.' });
  }
});

export default posts;
