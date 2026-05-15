import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data in reverse order of relations
  await prisma.activityLog.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.taskSession.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  const lead = await prisma.user.create({
    data: {
      email: 'lead@demo.com',
      password,
      name: 'Project Lead',
      role: 'PLS',
    },
  });

  const tasker = await prisma.user.create({
    data: {
      email: 'member@demo.com',
      password,
      name: 'Demo Tasker',
      role: 'TASKER',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Enterprise Platform Overhaul',
      description: 'Main project for Phase 2 workforce transition.',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: lead.id, role: 'MEMBER' },
          { userId: tasker.id, role: 'MEMBER' },
        ],
      },
    },
  });

  await prisma.task.createMany({
    data: [
      { title: 'Redesign Login Portal', description: 'Implement glassmorphism and role selection', status: 'DONE', priority: 'HIGH', projectId: project.id, assigneeId: admin.id },
      { title: 'Backend Workforce Logic', description: 'Implement attendance and session APIs', status: 'IN_PROGRESS', priority: 'HIGH', projectId: project.id, assigneeId: lead.id },
      { title: 'Frontend Dashboard', description: 'Build workforce command center', status: 'TODO', priority: 'MEDIUM', projectId: project.id, assigneeId: tasker.id },
    ],
  });

  console.log('Phase 2 Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
