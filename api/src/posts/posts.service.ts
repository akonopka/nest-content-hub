import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post, PostStatus } from '../generated/prisma/client';
import { PostCreateDto } from './post.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

export interface PostCreatedEvent {
  postId: number;
}

@Injectable()
export class PostsService {
  constructor(
    private prismaService: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async findOne(id: number): Promise<Post | null> {
    return this.prismaService.post.findUnique({ where: { id } });
  }

  async findAll(): Promise<Post[]> {
    return this.prismaService.post.findMany();
  }

  async create(data: PostCreateDto): Promise<Post> {
    const postData = {
      content: data.content,
      email: data.email,
      content_type: 'text/plain',
    };

    const post = await this.prismaService.post.create({
      data: postData,
    });

    await this.rabbitMQService.sendToEmbeddingQueue('post.created', {
      postId: post.id,
    } as PostCreatedEvent);

    return post;
  }

  async updateStatus(postId: number, status: PostStatus): Promise<void> {
    await this.prismaService.post.update({
      data: { status },
      where: { id: postId },
    });
  }

  async markFailed(postId: number): Promise<void> {
    await this.updateStatus(postId, PostStatus.FAILED);
  }

  async markReady(postId: number): Promise<void> {
    await this.updateStatus(postId, PostStatus.READY);
  }
}
