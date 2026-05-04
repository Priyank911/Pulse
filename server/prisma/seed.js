const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create users
  const adminPass = await bcrypt.hash('admin123', 12);
  const devPass = await bcrypt.hash('dev123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pulse.app' },
    update: {},
    create: { name: 'Alex Morgan', email: 'admin@pulse.app', password: adminPass, role: 'ADMIN' },
  });

  const dev1 = await prisma.user.upsert({
    where: { email: 'sarah@pulse.app' },
    update: {},
    create: { name: 'Sarah Chen', email: 'sarah@pulse.app', password: devPass, role: 'MEMBER' },
  });

  const dev2 = await prisma.user.upsert({
    where: { email: 'james@pulse.app' },
    update: {},
    create: { name: 'James Walker', email: 'james@pulse.app', password: devPass, role: 'MEMBER' },
  });

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration',
      deadline: new Date('2026-06-30'),
      members: {
        create: [
          { userId: admin.id, role: 'MAINTAINER' },
          { userId: dev1.id, role: 'DEVELOPER' },
          { userId: dev2.id, role: 'DEVELOPER' },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Redesign',
      description: 'UI/UX overhaul for the mobile application',
      deadline: new Date('2026-07-15'),
      members: {
        create: [
          { userId: admin.id, role: 'MAINTAINER' },
          { userId: dev1.id, role: 'DEVELOPER' },
        ],
      },
    },
  });

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: { title: 'Setup database schema', description: 'Design and implement PostgreSQL schema', status: 'DONE', priority: 'HIGH', projectId: project1.id, creatorId: admin.id, assigneeId: dev1.id, dueDate: new Date('2026-05-10') },
    }),
    prisma.task.create({
      data: { title: 'Implement auth flow', description: 'JWT-based authentication with refresh tokens', status: 'IN_PROGRESS', priority: 'HIGH', projectId: project1.id, creatorId: admin.id, assigneeId: dev2.id, dueDate: new Date('2026-05-20') },
    }),
    prisma.task.create({
      data: { title: 'Product listing page', status: 'TODO', priority: 'MEDIUM', projectId: project1.id, creatorId: admin.id, assigneeId: dev1.id, dueDate: new Date('2026-05-25') },
    }),
    prisma.task.create({
      data: { title: 'Payment gateway integration', status: 'TODO', priority: 'URGENT', projectId: project1.id, creatorId: admin.id, dueDate: new Date('2026-06-15') },
    }),
    prisma.task.create({
      data: { title: 'Design system audit', status: 'IN_REVIEW', priority: 'HIGH', projectId: project2.id, creatorId: admin.id, assigneeId: dev1.id, dueDate: new Date('2026-05-12') },
    }),
    prisma.task.create({
      data: { title: 'Navigation redesign', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: project2.id, creatorId: admin.id, assigneeId: dev1.id, dueDate: new Date('2026-05-30') },
    }),
  ]);

  // Create progress logs
  await prisma.progressLog.createMany({
    data: [
      { taskId: tasks[0].id, userId: dev1.id, percentage: 100, description: 'Completed all table designs and migrations' },
      { taskId: tasks[1].id, userId: dev2.id, percentage: 60, description: 'Login and register endpoints done, working on token refresh' },
      { taskId: tasks[4].id, userId: dev1.id, percentage: 85, description: 'Audited all components, documenting findings' },
      { taskId: tasks[5].id, userId: dev1.id, percentage: 40, description: 'Bottom nav prototype complete, starting side drawer' },
    ],
  });

  // Create notes
  await prisma.note.createMany({
    data: [
      { senderId: admin.id, receiverId: dev1.id, content: 'Great progress on the schema design. Please start on the product listing once review is done.' },
      { senderId: dev2.id, receiverId: admin.id, content: 'Need clarification on the refresh token expiry policy. Can we discuss?' },
      { senderId: admin.id, receiverId: dev2.id, content: 'Let us go with 7-day refresh tokens. Update the config accordingly.' },
    ],
  });

  console.log('Seeding complete.');
  console.log('Demo accounts:');
  console.log('  Admin: admin@pulse.app / admin123');
  console.log('  Developer: sarah@pulse.app / dev123');
  console.log('  Developer: james@pulse.app / dev123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
