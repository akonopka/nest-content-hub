import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { QdrantService } from './qdrant/qdrant.service';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL!],
      queue: process.env.EMBEDDING_QUEUE!,
      queueOptions: { durable: false },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL!],
      queue: process.env.ASK_QUEUE!,
      queueOptions: { durable: false },
    },
  });

  await app.startAllMicroservices();

  const qdrantService = app.get(QdrantService);
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
}
bootstrap();
