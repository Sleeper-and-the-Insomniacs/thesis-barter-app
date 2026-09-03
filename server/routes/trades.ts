import { Router } from 'express';
import { prisma } from '../db/index';
import requireAuth from '../middleware/requireAuth';
import { Status } from '../db/generated/client';
import { getIo } from '../middleware/socket';
import { enqueueJob } from '../services/jobQueue';

const trades = Router();

// Make new trade and update the correlated post to accepted
trades.post('/', requireAuth, async (req, res) => {
  try {
    const ownerId = (req.user as { id: number }).id;
    const { postId, requesterId } = req.body;

    if (!Number.isInteger(postId) || !Number.isInteger(requesterId)) {
      return res.status(400).json({ error: 'postId and requesterId are required.' });
    }

    if (requesterId === ownerId) {
      return res.status(400).json({ error: 'Trade requires two parties :/' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.userId !== ownerId) {
      return res.sendStatus(403);
    }

    if (post.status !== Status.OPEN) {
      return res.status(400).json({
        error: 'Trade already exists.',
      });
    }

    const trade = await prisma.$transaction(async (tx) => {
      const newTrade = await tx.trade.create({
        data: {
          postId,
          ownerId,
          requesterId,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          status: Status.ACCEPTED,
        },
      });

      return newTrade;
    });
    return res.status(201).json(trade);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Unable to create trade.',
    });
  }
});

// Get all my trades (owner or requester)
trades.get('/mine', requireAuth, async (req, res) => {
  try {
    const userId = (req.user as { id: number }).id;

    const myTrades = await prisma.trade.findMany({
      where: {
        OR: [{ ownerId: userId }, { requesterId: userId }],
      },
      include: {
        post: { select: { id: true, title: true } },
        owner: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(myTrades);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to retrieve trades.' });
  }
});

// Get a trade by its id
// eslint-disable-next-line consistent-return
trades.get('/:id', requireAuth, async (req, res) => {
  const userId = (req.user as { id: number }).id;

  if (Number.isNaN(Number(req.params.id))) {
    return res.sendStatus(400);
  }

  try {
    const trade = await prisma.trade.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
        post: true,
        reviews: true,
      },
    });

    if (!trade) {
      return res.sendStatus(404);
    }

    if (userId !== trade.ownerId && userId !== trade.requesterId) {
      return res.sendStatus(403);
    }

    return res.json(trade);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// One party marks trade to be completed. If second, update post status too
// eslint-disable-next-line consistent-return
trades.patch('/:id/complete', requireAuth, async (req, res) => {
  const userId = (req.user as { id: number }).id;

  if (Number.isNaN(Number(req.params.id))) {
    return res.sendStatus(400);
  }

  try {
    const trade = await prisma.trade.findUnique({
      where: { id: Number(req.params.id) },
      include: { post: { select: { title: true } } },
    });

    if (!trade) {
      return res.sendStatus(404);
    }

    if (userId !== trade.ownerId && userId !== trade.requesterId) {
      return res.sendStatus(403);
    }

    if (trade.status !== Status.IN_PROGRESS && trade.status !== Status.WAITING_FOR_OTHER_USER) {
      return res.status(400).json({
        error: `Trade cannot be updated from status ${trade.status}.`,
      });
    }

    const data: {
      ownerCompl?: boolean,
      reqCompl?: boolean,
      status?: Status,
    } = {};

    if (userId === trade.ownerId) {
      data.ownerCompl = true;
    } else {
      data.reqCompl = true;
    }

    const ownerCompl = data.ownerCompl ?? trade.ownerCompl;
    const reqCompl = data.reqCompl ?? trade.reqCompl;

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: trade.id },
        data: {
          ...data,
          status: ownerCompl && reqCompl
            ? Status.COMPLETED
            : Status.WAITING_FOR_OTHER_USER,
        },
      });

      if (ownerCompl && reqCompl) {
        await tx.tradeOffer.updateMany({
          where: {
            postId: trade.postId,
            offererId: trade.requesterId,
            status: 'ACCEPTED',
            isRemoved: false,
          },
          data: {
            status: 'COMPLETED',
            ownerApproved: true,
            offererApproved: true,
          },
        });

        await tx.post.update({
          where: { id: trade.postId },
          data: { status: Status.COMPLETED },
        });
        getIo().emit('posts:changed');
        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: trade.ownerId,
          type: 'TRADE_COMPLETED',
          title: `Trade completed: "${trade.post.title}"`,
          body: 'Leave a review for your trade partner!',
          link: `/profile/history/${trade.postId}`,
          entityType: 'TRADE',
          entityId: trade.id,
        });
        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: trade.requesterId,
          type: 'TRADE_COMPLETED',
          title: `Trade completed: "${trade.post.title}"`,
          body: 'Leave a review for your trade partner!',
          link: `/profile/history/${trade.postId}`,
          entityType: 'TRADE',
          entityId: trade.id,
        });
      } else {
        const otherUserId = userId === trade.ownerId ? trade.requesterId : trade.ownerId;
        await enqueueJob(tx, 'SEND_NOTIFICATION', {
          userId: otherUserId,
          type: 'TRADE_PARTNER_COMPLETED',
          title: 'Your trade partner completed their side of the trade',
          body: `Finish "${trade.post.title}" by marking your side complete.`,
          link: `/trade/${trade.postId}`,
          entityType: 'TRADE',
          entityId: trade.id,
        });
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// cancel a trade
// eslint-disable-next-line consistent-return
trades.patch('/:id/cancel', requireAuth, async (req, res) => {
  const userId = (req.user as { id: number }).id;

  if (Number.isNaN(Number(req.params.id))) {
    return res.sendStatus(400);
  }

  try {
    const trade = await prisma.trade.findUnique({
      where: {
        id: Number(req.params.id),
      },
    });

    if (!trade) {
      return res.sendStatus(404);
    }

    if (userId !== trade.ownerId && userId !== trade.requesterId) {
      return res.sendStatus(403);
    }

    if (userId !== trade.ownerId && userId !== trade.requesterId) {
      return res.sendStatus(403);
    }

    if (trade.status === Status.COMPLETED || trade.status === Status.CANCELLED) {
      return res.status(400).json({
        error: `Trade cannot be cancelled from status ${trade.status}.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: {
          id: trade.id,
        },
        data: {
          status: Status.CANCELLED,
        },
      });

      await tx.post.update({
        where: {
          id: trade.postId,
        },
        data: {
          status: Status.OPEN,
        },
      });
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default trades;
