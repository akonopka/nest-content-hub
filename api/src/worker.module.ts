import { Module } from '@nestjs/common';
import { PostsWorkerController } from './worker/posts-worker.controller';

@Module({
  imports: [],
  controllers: [PostsWorkerController],
  providers: [],
})
export class WorkerModule {}
