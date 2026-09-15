import { Module } from '@nestjs/common';
import { PostsWorkerController } from './worker/posts-worker.controller';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [PostsModule, PrismaModule, RabbitMQModule],
  controllers: [PostsWorkerController],
  providers: [],
})
export class WorkerModule {}
