const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAll() {
  await prisma.progressLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  console.log('All demo data cleared.');
}

clearAll()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
