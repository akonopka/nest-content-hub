import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { AskModule } from './ask/ask.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [PostsModule, AskModule, PrismaModule, RabbitMQModule],
})
export class AppModule {}
