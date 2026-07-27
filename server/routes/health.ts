import { Router } from 'express';
import { prisma } from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/db', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({ status: 'ok', userCount: users.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
