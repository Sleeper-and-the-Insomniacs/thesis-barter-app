import Router from 'express';
import { prisma } from '../db/index';

const router = Router();

router.get('/', async (req, res) => {
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

router.get('/:dmId', async (req, res) => {
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

router.post('/', (req, res) => {
  // const { recipientId } = req.body;
  try {
    res.status(201).json();
  } catch (err) {
    console.error('Failed to create new DM:', err);
    res.sendStatus(500);
  }
});

export default router;
