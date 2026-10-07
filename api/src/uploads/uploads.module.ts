import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
