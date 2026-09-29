import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { AskModule } from './ask/ask.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { OllamaModule } from './ollama/ollama.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PostsModule,
    AskModule,
    OllamaModule,
    PrismaModule,
    RabbitMQModule,
    QdrantModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
