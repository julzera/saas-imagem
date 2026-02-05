// server/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Criar Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vixel.com' },
    update: {},
    create: {
      email: 'admin@vixel.com',
      password: '123', // Em produção use hash!
      name: 'Admin Vixel',
      role: 'admin',
      plan: 'pro',
      credits: 9999
    },
  });

  // Criar Cliente
  const client = await prisma.user.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      email: 'cliente@teste.com',
      password: '123',
      name: 'Cliente Teste',
      role: 'user',
      plan: 'free',
      credits: 10
    },
  });

  console.log({ admin, client });
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) });