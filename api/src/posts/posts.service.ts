import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '../generated/prisma/client';
import { PostCreateDto } from './post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async findAll(): Promise<Post[]> {
    return this.prisma.post.findMany();
  }

  async create(data: PostCreateDto): Promise<Post> {
    const post = {
      content: data.content,
      email: data.email,
      content_type: 'text/plain',
    };

    return this.prisma.post.create({
      data: post,
    });
  }
}
