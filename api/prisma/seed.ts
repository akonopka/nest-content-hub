import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from '../src/app.module';
// import { PostsService } from '../src/posts/posts.service';

// Nie używamy tu PostsService przez NestFactory.createApplicationContext(),
// mimo że to powielałoby logikę create() jeden do jednego.
// Powód: ten skrypt jest uruchamiany przez ts-node (żeby Nest mógł poprawnie
// odczytać metadane dekoratorów potrzebne do DI), a wygenerowany klient Prismy
// importuje pliki z rozszerzeniem .js (styl "nodenext"), których ts-node
// w trybie CJS nie potrafi rozwiązać do rzeczywistych plików .ts — DI Nesta
// i wygenerowany klient Prismy wymagają w tym miejscu różnych transpilerów.
// Dlatego zapis i wysyłka do kolejki są tu zrobione wprost, bez Nesta.

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const client = ClientProxyFactory.create({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL!],
    queue: process.env.EMBEDDING_QUEUE,
    queueOptions: { durable: false },
  },
});

async function main() {
  const postsCount = await prisma.post.count();
  if (postsCount > 0) return;

  const postsData = [
    {
      content_type: 'text/plain',
      content:
        'NestJS to framework do budowy aplikacji Node.js oparty o TypeScript, korzystający z dependency injection i modułowej architektury inspirowanej Angularem.',
    },
    {
      content_type: 'text/plain',
      content:
        'W NestJS kontrolery obsługują żądania HTTP, serwisy zawierają logikę biznesową, a moduły grupują powiązane ze sobą komponenty.',
    },
  ];

  // const context = await NestFactory.createApplicationContext(AppModule);
  // const postService = context.get(PostsService);

  for (const postData of postsData) {
    // await postsService.create(postData);
    const post = await prisma.post.create({ data: postData });
    await firstValueFrom(client.emit('post.created', { postId: post.id }));
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await client.close();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await client.close();
    process.exit(1);
  });
