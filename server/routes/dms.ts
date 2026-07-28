import Router from 'express';
import { prisma } from '../db/index';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  try {
    const dms = await prisma.dM.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
    });

    res.status(200).json(dms);
  } catch (err) {
    console.error('Failed to findMany DMs:', err);
    res.sendStatus(500);
  }
});

router.get('/:dmId', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const dmId = Number(req.params.dmId);

  try {
    const messages = await prisma.message.findMany({
      where: { dmId },
    });
    const sendObj = {
      sent: messages.filter(({ senderId }) => senderId === userId),
      received: messages.filter(({ senderId }) => senderId !== userId),
    };

    res.status(200).json(sendObj);
  } catch (err) {
    console.error('Failed to find messages for DM:', err);
    res.sendStatus(500);
  }
});

router.post('/', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const { recipientId } = req.body;
  try {
    let dm = await prisma.dM.findFirst({
      where: {
        OR: [{ user1Id: recipientId }, { user2Id: recipientId }],
      },
    });

    if (!dm) {
      dm = await prisma.dM.create({
        data: {
          user1Id: userId!,
          user2Id: recipientId,
        },
      });
    }

    res.status(201).json(dm);
  } catch (err) {
    console.error('Failed to create new DM:', err);
    res.sendStatus(500);
  }
});

export default router;
