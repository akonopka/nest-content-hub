import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [PostsModule, PrismaModule, RabbitMQModule],
})
export class AppModule {}
