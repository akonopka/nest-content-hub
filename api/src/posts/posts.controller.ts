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
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single post by id' })
  @ApiResponse({ status: 200, description: 'Post found' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 400, description: 'Invalid id' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PostModel> {
    const post = await this.postsService.findOne(id);
    if (post == null) throw new NotFoundException();
    return post;
  }

  @Get()
  @ApiOperation({ summary: 'List all posts' })
  @ApiResponse({ status: 200, description: 'List of posts' })
  async findAll(): Promise<PostModel[]> {
    const posts = await this.postsService.findAll();
    return posts;
  }

  @Post()
  @ApiOperation({
    summary: 'Add a text post',
    description:
      'Stores the post and queues it for asynchronous embedding (Ollama) and indexing in Qdrant, so it becomes searchable via POST /ask.',
  })
  @ApiResponse({ status: 201, description: 'Post created' })
  @ApiResponse({ status: 400, description: 'Missing or invalid content/email' })
  async create(@Body() dto: PostCreateDto): Promise<PostModel> {
    return this.postsService.create(dto);
  }
}
