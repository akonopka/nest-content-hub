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
    private prisma: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async findOne(id: number): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async findAll(): Promise<Post[]> {
    return this.prisma.post.findMany();
  }

  async create(data: PostCreateDto): Promise<Post> {
    const postData = {
      content: data.content,
      email: data.email,
      content_type: 'text/plain',
    };

    const post = await this.prisma.post.create({
      data: postData,
    });

    await this.rabbitMQService.sendToQueue('post.created', {
      postId: post.id,
    } as PostCreatedEvent);

    return post;
  }

  async updateStatus(postId: number, status: PostStatus): Promise<void> {
    await this.prisma.post.update({
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
