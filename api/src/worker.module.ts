import { Module } from '@nestjs/common';
import { PostsWorkerController } from './worker/posts-worker.controller';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { OllamaModule } from './ollama/ollama.module';
import { AskWorkerController } from './worker/ask-worker.controller';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [
    PostsModule,
    OllamaModule,
    PrismaModule,
    RabbitMQModule,
    QdrantModule,
    QuestionsModule,
  ],
  controllers: [PostsWorkerController, AskWorkerController],
  providers: [],
})
export class WorkerModule {}
