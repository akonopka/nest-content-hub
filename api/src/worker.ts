import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const worker = await NestFactory.createMicroservice<MicroserviceOptions>(
    WorkerModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL!],
        queue: 'posts_embedding_queue',
        queueOptions: {
          durable: false,
        },
      },
    },
  );
  await worker.listen();
}
bootstrap();
