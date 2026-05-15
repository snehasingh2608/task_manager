import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string(),
  assigneeId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = taskSchema.parse(req.body);
    const userId = req.user.id;

    // Check if user is member of project
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: data.projectId, userId } },
    });

    if (!member) {
      res.status(403).json({ error: 'Forbidden: Not a member of this project' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        ...data,
      },
      include: { assignee: { select: { id: true, name: true } } },
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: 'Bad Request' });
  }
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({ error: 'projectId query param is required' });
      return;
    }

    // Check membership
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        comments: { include: { author: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
    });

    if (!member) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: { select: { id: true, name: true } } },
    });

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ error: 'Bad Request' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId } },
    });

    if (!member || member.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required to delete task' });
      return;
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // Check if punched in
    const attendance = await prisma.attendance.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (!attendance) {
      return res.status(400).json({ error: 'You must punch in before starting tasks' });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
    });

    const session = await prisma.taskSession.create({
      data: { taskId, userId, startedAt: new Date() },
    });

    res.status(201).json({ task, session });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const session = await prisma.taskSession.findFirst({
      where: { taskId, userId, endedAt: null, pausedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) return res.status(400).json({ error: 'No active session' });

    const now = new Date();
    const duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

    const updatedSession = await prisma.taskSession.update({
      where: { id: session.id },
      data: { 
        pausedAt: now,
        endedAt: now,
        activeDuration: duration
      },
    });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'PAUSED' },
    });

    res.json({ task, session: updatedSession });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/resume', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
    });

    const session = await prisma.taskSession.create({
      data: { taskId, userId, startedAt: new Date() },
    });

    res.status(201).json({ task, session });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // End active session if exists
    const session = await prisma.taskSession.findFirst({
      where: { taskId, userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (session) {
      const now = new Date();
      const duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
      await prisma.taskSession.update({
        where: { id: session.id },
        data: { endedAt: now, activeDuration: duration },
      });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'DONE' },
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
