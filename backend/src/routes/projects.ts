import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// Create project
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = projectSchema.parse(req.body);
    const userId = req.user.id;

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: 'Bad Request' });
  }
});

// Get all projects for user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is member
    const isMember = project.members.some((m: any) => m.userId === userId);
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit project
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const data = projectSchema.parse(req.body);

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member || member.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name: data.name, description: data.description },
    });

    res.json(project);
  } catch (error) {
    res.status(400).json({ error: 'Bad Request' });
  }
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member || member.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Member
router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const adminId = req.user.id;
    const { email, role } = req.body;

    const adminMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: adminId } },
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'User is already a member' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove Member
router.delete('/:id/members/:memberId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const adminId = req.user.id;
    const targetUserId = req.params.memberId;

    const adminMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: adminId } },
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    if (adminId === targetUserId) {
      res.status(400).json({ error: 'Cannot remove yourself' });
      return;
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
