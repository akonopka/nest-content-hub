import { Module } from '@nestjs/common';
import { PostsWorkerController } from './worker/posts-worker.controller';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { OllamaModule } from './ollama/ollama.module';

@Module({
  imports: [
    PostsModule,
    OllamaModule,
    PrismaModule,
    RabbitMQModule,
    QdrantModule,
  ],
  controllers: [PostsWorkerController],
  providers: [],
})
export class WorkerModule {}
