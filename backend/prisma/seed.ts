import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log(`Admin user created: ${adminUsername}`);
  } else {
    console.log(`Admin user already exists: ${adminUsername}`);
  }

  const tokenCount = await prisma.registrationToken.count();
  if (tokenCount === 0) {
    await prisma.registrationToken.create({
      data: {
        token: 'welcome-token-1',
      },
    });
    await prisma.registrationToken.create({
      data: {
        token: 'welcome-token-2',
      },
    });
    await prisma.registrationToken.create({
      data: {
        token: 'welcome-token-3',
      },
    });
    console.log('Created 3 initial registration tokens');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
