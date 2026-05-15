import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'ADMIN') {
      const [totalTasks, totalProjects, totalUsers, completedTasks] = await Promise.all([
        prisma.task.count(),
        prisma.project.count(),
        prisma.user.count(),
        prisma.task.count({ where: { status: 'DONE' } }),
      ]);

      res.json({
        totalTasks,
        completedTasks,
        projectsCount: totalProjects,
        usersCount: totalUsers,
        isAdmin: true
      });
      return;
    }

    // Projects user is part of
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);

    // Tasks in these projects
    const tasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const assignedToMe = tasks.filter((t) => t.assigneeId === userId);
    
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
    ).length;

    const tasksDueToday = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return (
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear() &&
        t.status !== 'DONE'
      );
    }).length;

    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    res.json({
      totalTasks,
      completedTasks,
      assignedToMeCount: assignedToMe.length,
      overdueTasks,
      tasksDueToday,
      completionRate,
      projectsCount: projectIds.length,
      isAdmin: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
