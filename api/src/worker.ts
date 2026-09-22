import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { QdrantService } from './qdrant/qdrant.service';

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

  const qdrantService = worker.get(QdrantService);
  try {
    await qdrantService.getCollection(process.env.POSTS_COLLECTION!);
  } catch {
    await qdrantService.createCollection(process.env.POSTS_COLLECTION!, {
      vectors: {
        size: Number(process.env.POSTS_COLLECTION_SIZE!),
        distance: 'Cosine',
      },
    });
  }

  await worker.listen();
}
bootstrap();
