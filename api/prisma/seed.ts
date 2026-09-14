import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.post.createMany({
    data: [
      {
        content_type: 'text/plain',
        status: 'READY',
        content:
          'Pierwszy przykładowy post tekstowy do testowania wyszukiwania.',
      },
      {
        content_type: 'text/plain',
        status: 'READY',
        content: 'Drugi przykładowy post, o czymś zupełnie innym niż pierwszy.',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
