import { Module } from '@nestjs/common';
import { PostsWorkerController } from './worker/posts-worker.controller';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [PostsWorkerController],
  providers: [],
})
export class WorkerModule {}
