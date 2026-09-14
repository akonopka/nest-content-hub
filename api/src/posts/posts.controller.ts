import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post as PostModel } from '../generated/prisma/client';
import { PostCreateDto } from './post.dto';

@Controller('posts')
export class PostsController {
  constructor(private postService: PostsService) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PostModel> {
    const post = await this.postService.findOne(id);
    if (post == null) throw new NotFoundException();
    return post;
  }

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
