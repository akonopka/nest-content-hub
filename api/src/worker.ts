import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { QdrantClient } from '@qdrant/js-client-rest';

async function bootstrap() {
  const worker = await NestFactory.createMicroservice<MicroserviceOptions>(
    WorkerModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL!],
        queue: process.env.EMBEDDING_QUEUE!,
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  const client = new QdrantClient({ url: process.env.QDRANT_URL! });
  try {
    await client.getCollection(process.env.POSTS_COLLECTION!);
  } catch {
    await client.createCollection(process.env.POSTS_COLLECTION!, {
      vectors: {
        size: Number(process.env.POSTS_COLLECTION_SIZE!),
        distance: 'Cosine',
      },
    });
  }

  await worker.listen();
}
bootstrap();
