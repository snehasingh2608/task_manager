import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();
router.use(authenticate);

// Punch In
router.post('/punch-in', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Check if already punched in today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already punched in' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        punchIn: new Date(),
        status: 'ACTIVE',
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Punch Out
router.post('/punch-out', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { punchIn: 'desc' },
    });

    if (!existing) {
      return res.status(400).json({ error: 'Not punched in' });
    }

    const punchOut = new Date();
    const totalHours = (punchOut.getTime() - existing.punchIn.getTime()) / (1000 * 60 * 60);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        punchOut,
        totalHours,
        status: 'COMPLETED',
      },
    });

    // Also stop all active task sessions for this user
    await prisma.taskSession.updateMany({
      where: {
        userId,
        endedAt: null,
      },
      data: {
        endedAt: punchOut,
      },
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's attendance
router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
      orderBy: { punchIn: 'desc' },
    });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attendance history
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const history = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { punchIn: 'desc' },
      take: 50,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
