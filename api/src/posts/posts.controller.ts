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
  constructor(private postsService: PostsService) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PostModel> {
    const post = await this.postsService.findOne(id);
    if (post == null) throw new NotFoundException();
    return post;
  }

  @Get()
  async findAll(): Promise<PostModel[]> {
    const posts = await this.postsService.findAll();
    return posts;
  }

  @Post()
  async create(@Body() dto: PostCreateDto): Promise<PostModel> {
    return this.postsService.create(dto);
  }
}
