/* eslint-disable max-len */
/* eslint-disable object-curly-newline */
import { Router, type Request } from 'express';
import { prisma } from '../db/index.js';
import requireAuth from '../middleware/requireAuth.js';
import { getDownloadUrl } from '../services/s3.js';
import { getBlockedRelationshipIds, isBlocked } from '../services/blocks.js';
import { Status } from '../db/generated/enums.js';
import { enqueueJob } from '../services/jobQueue.js';
import { getAvatarUrlMap } from '../services/userMedia.js';

const artTradeOffers = Router();

// type definitions
interface MediaItem {
  variant?: string | null;
  s3Key: string;
}

interface NestedMediaItem {
  media?: MediaItem | null;
}

// helpers

const getUserId = (req: Request): number => req.user!.id;

const getMediaUrls = async (
  mediaArray?: NestedMediaItem[],
  allowFull: boolean = false,
  fallbackPreviewToFirst: boolean = false,
) => {
  if (!mediaArray) return { previewUrl: null, fullUrl: null };
  const items = mediaArray.map((m) => m.media).filter(Boolean) as MediaItem[];
  const [firstItem] = items;

  const fetchUrl = async (variant: string, useFallback: boolean = false) => {
    const item = items.find((m) => m.variant === variant) || (useFallback ? firstItem : undefined);

    if (!item || !item.s3Key) return null;
    return getDownloadUrl(item.s3Key).catch((err) => {
      console.error(`S3 error for key ${item.s3Key}:`, err);
      return null;
    });
  };

  const [previewUrl, fullUrl] = await Promise.all([
    fetchUrl('PREVIEW', fallbackPreviewToFirst),
    allowFull ? fetchUrl('FULL') : Promise.resolve(null),
  ]);

  return { previewUrl, fullUrl };
};

// GET: the receiver of offers will be able to view them, others will not (including the user who offered trade)
artTradeOffers.get('/', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const numericPostId = req.query.postId ? Number(req.query.postId) : undefined;
    let post = null;

    if (numericPostId) {
      post = await prisma.post.findUnique({
        where: { id: numericPostId },
        include: { postMedia: { include: { media: true } } },
      });

      if (!post || post.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized or post not found.' });
      }
    }

    const blockedIds = await getBlockedRelationshipIds(userId);
    const notBlocked = blockedIds.length ? { offererId: { notIn: blockedIds } } : {};

    const rawOffers = await prisma.tradeOffer.findMany({
      where: numericPostId ? {
        postId: numericPostId,
        isPendingScreening: false,
        isRemoved: false,
        ...(post?.status === Status.OPEN ? { status: 'PENDING' } : { status: 'COMPLETED' }),
      } : {
        post: { userId, status: Status.OPEN },
        status: 'PENDING',
        isPendingScreening: false,
        isRemoved: false,
        ...notBlocked,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        offerer: { select: { id: true, name: true, email: true } },
        post: { include: { postMedia: { include: { media: true } } } },
        tradeOfferMedia: { include: { media: true } },
      },
    });

    const avatarMap = await getAvatarUrlMap(rawOffers.map((offer) => offer.offererId));

    const offers = await Promise.all(
      rawOffers.map(async (offer) => {
        const urls = await getMediaUrls(offer.tradeOfferMedia, offer.status === 'COMPLETED', true);

        return {
          id: offer.id,
          message: offer.message,
          createdAt: offer.createdAt,
          status: offer.status,
          ownerApproved: offer.ownerApproved,
          offererApproved: offer.offererApproved,
          offerer: { ...offer.offerer, avatarUrl: avatarMap.get(offer.offererId) ?? null },
          post: { id: offer.post.id, title: offer.post.title },
          ...urls,
        };
      }),
    );

    if (numericPostId && post) {
      const { previewUrl: postPreviewUrl, fullUrl: postFullUrl } = await getMediaUrls(post.postMedia, post.status === Status.COMPLETED, false);

      return res.json({
        isOwner: true,
        status: post.status,
        postPreviewUrl,
        postFullUrl,
        offers,
      });
    }

    return res.json(offers);
  } catch (error) {
    console.error('Failed to get trade offers:', error);
    return res.status(500).json({ error: 'Unable to retrieve trade offers.' });
  }
});

// GET: get the logged-in user's pending art trade offers
artTradeOffers.get('/sent', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);

    const offers = await prisma.tradeOffer.findMany({
      where: {
        offererId: userId,
        status: 'PENDING',
        isRemoved: false,
        post: { status: Status.OPEN },
      },
      select: {
        id: true,
        postId: true,
        status: true,
      },
    });

    return res.json(offers);
  } catch (error) {
    console.error('Failed to get sent trade offers:', error);
    return res.status(500).json({ error: 'Unable to retrieve sent trade offers.' });
  }
});

// POST: submit a new offer
artTradeOffers.post('/', requireAuth, async (req, res) => {
  try {
    const offererId = getUserId(req);
    const { postId, message, previewMediaId, fullMediaId } = req.body;

    const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
    if (!post || post.status !== Status.OPEN) {
      return res.status(400).json({ error: 'Post not found or trade already completed.' });
    }

    if (post.userId === offererId) {
      return res.status(400).json({ error: 'Cannot offer on your own post.' });
    }

    // Blocking is mutual, reuses not-found message, response does not reveal that a block exists
    if (await isBlocked(offererId, post.userId)) {
      return res.status(400).json({ error: 'Post not found or trade already completed.' });
    }

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.tradeOffer.create({
        data: {
          postId: Number(postId),
          offererId,
          message,
          tradeOfferMedia: {
            create: [
              { mediaId: Number(previewMediaId), sortOrder: 0 },
              { mediaId: Number(fullMediaId), sortOrder: 1 },
            ],
          },
        },
        include: {
          offerer: { select: { id: true, name: true, email: true } },
          tradeOfferMedia: { include: { media: true } },
        },
      });

      const preview = message && message.length > 80 ? `${message.slice(0, 80)}...` : message;
      await enqueueJob(tx, 'SEND_NOTIFICATION', {
        userId: post.userId,
        type: 'TRADE_OFFER_RECEIVED',
        title: `New trade offer on "${post.title}"`,
        body: preview || undefined,
        link: `/profile/offers/${created.id}`,
        entityType: 'TRADE_OFFER',
        entityId: created.id,
      });

      return created;
    });

    return res.status(201).json(offer);
  } catch (error) {
    console.error('Failed to submit trade offer:', error);
    return res.status(500).json({ error: 'Unable to submit trade offer.' });
  }
});

// PATCH: withdraw a pending art trade offer
artTradeOffers.patch('/:offerId/cancel', requireAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const userId = getUserId(req);

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.offererId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to withdraw this offer.' });
    }

    if (offer.status !== 'PENDING' || offer.isRemoved) {
      return res.status(400).json({ error: 'Trade offer is no longer pending.' });
    }

    await prisma.tradeOffer.update({
      where: { id: offerId },
      data: { isRemoved: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to withdraw art trade offer:', error);
    return res.status(500).json({ error: 'Unable to withdraw the trade offer.' });
  }
});

// PATCH: post owner rejects a pending art trade offer
artTradeOffers.patch('/:offerId/reject', requireAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const userId = getUserId(req);

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
      include: {
        post: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({ error: 'Trade offer not found.' });
    }

    if (offer.post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to reject this offer.' });
    }

    if (offer.status !== 'PENDING' || offer.isRemoved) {
      return res.status(400).json({ error: 'Trade offer is no longer pending.' });
    }

    await prisma.tradeOffer.update({
      where: { id: offerId },
      data: { isRemoved: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to reject art trade offer:', error);
    return res.status(500).json({ error: 'Unable to reject the trade offer.' });
  }
});

// PATCH: mutual approval for trade logic
artTradeOffers.patch('/:offerId/approve', requireAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const userId = getUserId(req);

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
      include: { post: true },
    });

    if (!offer || offer.post.status !== Status.OPEN) {
      return res.status(400).json({ error: 'Trade offer unavailable or already completed.' });
    }

    const isOwner = offer.post.userId === userId;
    const isOfferer = offer.offererId === userId;

    if (!isOwner && !isOfferer) {
      return res.status(403).json({ error: 'Unauthorized to approve this offer.' });
    }

    const newOwnerApproved = isOwner ? true : offer.ownerApproved;
    const newOffererApproved = isOfferer ? true : offer.offererApproved;
    const isBothApproved = newOwnerApproved && newOffererApproved;

    const updatedOffer = await prisma.$transaction(async (tx) => {
      const updated = await tx.tradeOffer.update({
        where: { id: offerId },
        data: {
          ownerApproved: newOwnerApproved,
          offererApproved: newOffererApproved,
          status: isBothApproved ? 'COMPLETED' : 'PENDING',
        },
      });

      if (isBothApproved) {
        const existingTrade = await tx.trade.findFirst({
          where: {
            postId: offer.postId,
            ownerId: offer.post.userId,
            requesterId: offer.offererId,
          },
        });

        if (existingTrade) {
          await tx.trade.update({
            where: { id: existingTrade.id },
            data: {
              ownerCompl: true,
              reqCompl: true,
              status: Status.COMPLETED,
            },
          });
        } else {
          await tx.trade.create({
            data: {
              postId: offer.postId,
              ownerId: offer.post.userId,
              requesterId: offer.offererId,
              ownerCompl: true,
              reqCompl: true,
              status: Status.COMPLETED,
            },
          });
        }

        await tx.post.update({
          where: { id: offer.postId },
          data: { status: Status.COMPLETED },
        });

        await tx.tradeOffer.deleteMany({
          where: {
            postId: offer.postId,
            id: { not: offerId },
          },
        });

        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: offer.post.userId,
          type: 'TRADE_OFFER_ACCEPTED',
          title: `Trade completed: "${offer.post.title}"`,
          body: 'Your trade offer was fully approved and marked complete',
          link: `/profile/history/${offer.postId}`,
          entityType: 'TRADE_OFFER',
          entityId: offerId,
        });

        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: offer.offererId,
          type: 'TRADE_OFFER_ACCEPTED',
          title: `Trade completed: "${offer.post.title}"`,
          body: 'Your trade offer was fully approved and marked complete',
          link: `/profile/history/${offer.postId}`,
          entityType: 'TRADE_OFFER',
          entityId: offerId,
        });
      }

      return updated;
    });

    return res.json({
      success: true,
      tradeCompleted: isBothApproved,
      offerStatus: updatedOffer.status,
    });
  } catch (error) {
    console.error('Failed to approve trade offer:', error);
    return res.status(500).json({ error: 'Unable to approve trade offer.' });
  }
});

// PATCH: single-sided accept logic
artTradeOffers.patch('/:offerId/accept', requireAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const userId = getUserId(req);

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
      include: {
        post: {
          include: {
            postMedia: { include: { media: true } },
          },
        },
      },
    });

    if (!offer || offer.post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized. Only post owner can accept.' });
    }

    if (offer.post.status !== Status.OPEN) {
      return res.status(400).json({ error: 'Trade is already completed.' });
    }

    const isDigitalPost = offer.post.postMedia.some(
      (item) => item.media?.variant === 'PREVIEW' || item.media?.variant === 'FULL',
    );

    await prisma.$transaction(async (tx) => {
      if (isDigitalPost) {
        const existingTrade = await tx.trade.findFirst({
          where: {
            postId: offer.postId,
            ownerId: offer.post.userId,
            requesterId: offer.offererId,
          },
        });

        if (existingTrade) {
          await tx.trade.update({
            where: { id: existingTrade.id },
            data: {
              ownerCompl: true,
              reqCompl: true,
              status: Status.COMPLETED,
            },
          });
        } else {
          await tx.trade.create({
            data: {
              postId: offer.postId,
              ownerId: offer.post.userId,
              requesterId: offer.offererId,
              ownerCompl: true,
              reqCompl: true,
              status: Status.COMPLETED,
            },
          });
        }

        await tx.post.update({
          where: { id: offer.postId },
          data: { status: Status.COMPLETED },
        });

        await tx.tradeOffer.update({
          where: { id: offerId },
          data: {
            status: 'COMPLETED',
            ownerApproved: true,
            offererApproved: true,
          },
        });

        await tx.tradeOffer.deleteMany({
          where: {
            postId: offer.postId,
            id: { not: offerId },
          },
        });

        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: offer.offererId,
          type: 'TRADE_OFFER_ACCEPTED',
          title: `Trade completed: "${offer.post.title}"`,
          body: 'The post owner accepted your offer and marked the trade complete',
          link: `/profile/history/${offer.postId}`,
          entityType: 'TRADE_OFFER',
          entityId: offerId,
        });
      } else {
        await tx.trade.create({
          data: {
            postId: offer.postId,
            ownerId: offer.post.userId,
            requesterId: offer.offererId,
          },
        });

        await tx.post.update({
          where: { id: offer.postId },
          data: { status: Status.ACCEPTED },
        });

        await tx.tradeOffer.update({
          where: { id: offerId },
          data: {
            status: 'ACCEPTED',
            ownerApproved: true,
          },
        });

        await tx.tradeOffer.deleteMany({
          where: {
            postId: offer.postId,
            id: { not: offerId },
          },
        });

        await tx.tradeRequest.deleteMany({
          where: {
            postId: offer.postId,
            status: 'PENDING',
          },
        });

        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: offer.offererId,
          type: 'TRADE_OFFER_ACCEPTED',
          title: 'Your trade offer was accepted',
          body: `Your trade offer for "${offer.post.title}" was accepted.`,
          link: `/trade/${offer.postId}`,
          entityType: 'TRADE_OFFER',
          entityId: offerId,
        });
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to accept digital trade:', error);
    return res.status(500).json({ error: 'Unable to accept the trade.' });
  }
});

export default artTradeOffers;
