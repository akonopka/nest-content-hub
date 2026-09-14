import { Body, Controller, Get, Post } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post as PostModel } from '../generated/prisma/client';
import { PostCreateDto } from './post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postService: PostsService) {}

  @Get()
  async findAll(): Promise<PostModel[]> {
    const posts = await this.postService.findAll();
    return posts;
  }

  @Post()
  async create(@Body() dto: PostCreateDto): Promise<PostModel> {
    return this.postService.create(dto);
  }
}
