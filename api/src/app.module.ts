import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { AskModule } from './ask/ask.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { OllamaModule } from './ollama/ollama.module';
import { QdrantModule } from './qdrant/qdrant.module';

@Module({
  imports: [
    PostsModule,
    AskModule,
    OllamaModule,
    PrismaModule,
    RabbitMQModule,
    QdrantModule,
  ],
})
export class AppModule {}
