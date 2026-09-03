import { Router } from 'express';
import { prisma } from '../db/index.js';
import requireAuth from '../middleware/requireAuth.js';
import { isBlocked } from '../services/blocks.js';
import { buildKey, getUploadUrl, getDownloadUrl } from '../services/s3.js';
import { UserMediaSlot } from '../db/generated/enums.js';
import { isValidZipCode, isValidPhone } from '../services/validation.js';
import {
  geocodePostalCode,
  reverseGeocode,
} from '../services/geocoding.js';

const router = Router();

export const BIO_MAX_LENGTH = 250;

const VALID_SLOTS = ['avatar', 'banner'] as const;
type MediaSlotParam = typeof VALID_SLOTS[number];

const toSlotEnum = (slot: MediaSlotParam): UserMediaSlot => (
  slot === 'avatar' ? UserMediaSlot.AVATAR : UserMediaSlot.BANNER
);

const getUserMediaUrls = async (
  userMedia?: { slot: string; media: { s3Key: string } }[],
) => {
  if (!userMedia) return { avatarUrl: null, bannerUrl: null };

  const findUrl = async (slot: string) => {
    const item = userMedia.find((m) => m.slot === slot);
    if (!item) return null;
    return getDownloadUrl(item.media.s3Key).catch((err) => {
      console.error(`S3 error for user media slot ${slot}: `, err);
      return null;
    });
  };

  const [avatarUrl, bannerUrl] = await Promise.all([findUrl('AVATAR'), findUrl('BANNER')]);
  return { avatarUrl, bannerUrl };
};

router.post('/', async (req, res) => {
  try {
    const {
      email, name, phone,
    } = req.body.user ?? {};

    if (!email) {
      return res.status(400).json({ error: 'email REQUIRED' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name REQUIRED' });
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name.trim(),
        phone,
      },
    });
    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return res.status(409).json({ error: 'email in use already' });
    }
    return res.sendStatus(500);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        posts: true,
        userMedia: { include: { media: true } },
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    const { userMedia, ...userRest } = user;
    return res.status(200).json({ ...userRest, ...(await getUserMediaUrls(userMedia)) });
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  const {
    name, bio, phone, zipCode, country, emailVisible, tradeHistoryVisible,
  } = req.body.user ?? {};

  if (name !== undefined && (!name || !name.trim())) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }

  if (bio !== undefined && bio !== null && bio.length > BIO_MAX_LENGTH) {
    return res.status(400).json({ error: `bio must be ${BIO_MAX_LENGTH} characters or fewer` });
  }

  if (phone !== undefined && phone !== null && phone !== '' && !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }

  if (zipCode !== undefined && zipCode !== null && zipCode !== '' && !isValidZipCode(zipCode)) {
    return res.status(400).json({ error: 'Please enter a valid zip code.' });
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        zipCode: true,
        country: true,
        lat: true,
        lng: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'user not found' });
    }

    let locationData: {
      zipCode?: string | null;
      country?: string | null;
      lat?: number | null;
      lng?: number | null;
    } = {};

    if (zipCode !== undefined || country !== undefined) {
      const nextZipCode = typeof zipCode === 'string' ? zipCode.trim() : '';
      const nextCountry = typeof country === 'string' ? country.trim() : '';

      if (!nextZipCode || !nextCountry) {
        return res.status(400).json({
          error: 'Location does not exist: please enter valid location.',
        });
      }

      const locationChanged = (
        nextZipCode !== currentUser.zipCode
        || nextCountry !== currentUser.country
      );

      if (locationChanged) {
        const location = await geocodePostalCode(nextZipCode, nextCountry);

        if (!location) {
          return res.status(400).json({
            error: 'Location does not exist: please enter valid location.',
          });
        }

        locationData = {
          zipCode: location.postalCode,
          country: location.country,
          lat: location.lat,
          lng: location.lng,
        };
      } else {
        locationData = {
          zipCode: currentUser.zipCode,
          country: currentUser.country,
          lat: currentUser.lat,
          lng: currentUser.lng,
        };
      }
    }

    const bioChanged = bio !== undefined;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        phone,
        emailVisible: typeof emailVisible === 'boolean' ? emailVisible : undefined,
        tradeHistoryVisible: typeof tradeHistoryVisible === 'boolean' ? tradeHistoryVisible : undefined,
        ...locationData,
        ...(bioChanged ? { bio } : {}),
      },
      include: { userMedia: { include: { media: true } } },
    });
    const { userMedia, ...userRest } = user;
    return res.status(200).json({ ...userRest, ...(await getUserMediaUrls(userMedia)) });
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

// PATCH: allows a user to update their location
router.patch('/me/location', requireAuth, async (req, res) => {
  try {
    const {
      postalCode, country, lat, lng, termsAccepted,
    } = req.body ?? {};

    let location;

    if (postalCode !== undefined || country !== undefined) {
      const nextPostalCode = typeof postalCode === 'string' ? postalCode.trim() : '';
      const nextCountry = typeof country === 'string' ? country.trim() : '';

      if (!nextPostalCode || !nextCountry) {
        return res.status(400).json({
          error: 'Location does not exist: please enter valid location.',
        });
      }

      location = await geocodePostalCode(nextPostalCode, nextCountry);
    } else {
      const numericLat = Number(lat);
      const numericLng = Number(lng);

      if (!Number.isFinite(numericLat) || !Number.isFinite(numericLng)) {
        return res.status(400).json({
          error: 'A postal code and country or valid coordinates are required.',
        });
      }

      location = await reverseGeocode(numericLat, numericLng);
    }

    if (!location) {
      return res.status(400).json({
        error: 'Location does not exist: please enter valid location.',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        zipCode: location.postalCode,
        country: location.country,
        lat: location.lat,
        lng: location.lng,
        termsAccepted: termsAccepted === true ? true : undefined,
      },
    });

    return res.json(user);
  } catch (err) {
    console.error('Failed to update location:', err);
    return res.status(500).json({ error: 'Unable to update location.' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'invalid user id' });
  }
  try {
    if (req.user && await isBlocked(req.user.id, id)) {
      return res.status(404).json({ error: 'user not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: { where: { isRemoved: false, isPendingScreening: false } },
        userMedia: { include: { media: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    const isSelf = req.user?.id === id;
    const { userMedia, ...userRest } = user;
    return res.status(200).json({
      ...userRest,
      email: isSelf || user.emailVisible ? user.email : null,
      ...(await getUserMediaUrls(userMedia)),
    });
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

// Upload avatar/banner
router.post('/me/media/:slot', requireAuth, async (req, res) => {
  const slot = req.params.slot as MediaSlotParam;
  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Invalid media slot.' });
  }

  const { filename, contentType } = req.body ?? {};
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required.' });
  }
  if (typeof contentType !== 'string' || !contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image uploads are allowed.' });
  }

  try {
    const key = buildKey(req.user!.id, filename, `${slot}s`);
    const uploadUrl = await getUploadUrl(key, contentType);
    return res.json({ uploadUrl, key });
  } catch (err) {
    console.error('Failed to generate upload URL:', err);
    return res.status(500).json({ error: 'Unable to generate upload URL.' });
  }
});

// Use uploaded avatar/banner
router.put('/me/media/:slot', requireAuth, async (req, res) => {
  const slot = req.params.slot as MediaSlotParam;
  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Invalid media slot.' });
  }

  const { s3Key } = req.body ?? {};
  if (!s3Key) {
    return res.status(400).json({ error: 's3Key is required.' });
  }

  const userId = req.user!.id;
  const slotEnum = toSlotEnum(slot);

  try {
    const media = await prisma.$transaction(async (tx) => {
      const existing = await tx.userMedia.findUnique({
        where: { userId_slot: { userId, slot: slotEnum } },
      });

      const newMedia = await tx.media.create({
        data: { s3Key, uploaderId: userId },
      });

      await tx.userMedia.upsert({
        where: { userId_slot: { userId, slot: slotEnum } },
        create: { userId, mediaId: newMedia.id, slot: slotEnum },
        update: { mediaId: newMedia.id },
      });

      if (existing) {
        await tx.media.delete({ where: { id: existing.mediaId } }).catch(() => {});
      }

      return newMedia;
    });

    const url = await getDownloadUrl(media.s3Key);
    return res.json({ url });
  } catch (err) {
    console.error('Failed to save media:', err);
    return res.status(500).json({ error: 'Unable to save media.' });
  }
});

// Remove an avatar/banner
router.delete('/me/media/:slot', requireAuth, async (req, res) => {
  const slot = req.params.slot as MediaSlotParam;
  if (!VALID_SLOTS.includes(slot)) {
    return res.status(400).json({ error: 'Invalid media slot.' });
  }

  const userId = req.user!.id;
  const slotEnum = toSlotEnum(slot);

  try {
    const existing = await prisma.userMedia.findUnique({
      where: { userId_slot: { userId, slot: slotEnum } },
    });
    if (existing) {
      await prisma.userMedia.delete({ where: { id: existing.id } });
      await prisma.media.delete({ where: { id: existing.mediaId } }).catch(() => {});
    }
    return res.sendStatus(200);
  } catch (err) {
    console.error('Failed to remove media:', err);
    return res.status(500).json({ error: 'Unable to remove media.' });
  }
});

export default router;
