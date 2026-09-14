import { Controller, Get } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from '../generated/prisma/client';

@Controller('posts')
export class PostsController {
  constructor(private postService: PostsService) {}

  @Get()
  async findAll(): Promise<Post[]> {
    const posts = await this.postService.findAll();
    return posts;
  }
}
