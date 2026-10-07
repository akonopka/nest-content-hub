import { Global, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post, PostStatus, Prisma } from '../generated/prisma/client';
import { PostCreateDto } from './post.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PostContentType } from '../worker/post-payload.interface';

export interface PostCreatedEvent {
  postId: number;
}

export const OrderPostsBy = {
  CREATED_AT_ASC: 'CREATED_AT_ASC',
  CREATED_AT_DESC: 'CREATED_AT_DESC',
} as const;

export type OrderPostsBy = (typeof OrderPostsBy)[keyof typeof OrderPostsBy];

@Global()
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

  async findByIds(ids: number[]): Promise<Post[]> {
    return this.prismaService.post.findMany({ where: { id: { in: ids } } });
  }

  async create(data: PostCreateDto): Promise<Post> {
    const postData = {
      content: data.content,
      email: data.email,
      content_type: data.contentType,
      file_path: data.filePath,
    };

    const post = await this.prismaService.post.create({
      data: postData,
    });

    if (data.contentType === PostContentType.TEXT_PLAIN) {
      await this.rabbitMQService.sendToEmbeddingQueue('post.created', {
        postId: post.id,
      } as PostCreatedEvent);
    }

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

  async queryPosts(
    status?: PostStatus,
    dateFrom?: Date,
    dateTo?: Date,
    orderBy?: OrderPostsBy,
    limit?: number,
  ): Promise<Post[]> {
    let query: {
      where: Prisma.PostWhereInput;
      take?: number;
      orderBy?: Prisma.PostOrderByWithRelationInput;
    } = {
      where: { status: {}, created_at: {} },
    };

    if (status) {
      query.where.status = { equals: status };
    }

    const createdAtFilter: Prisma.DateTimeFilter<'Post'> = {};

    if (dateFrom) {
      createdAtFilter.gte = dateFrom;
    }

    if (dateTo) {
      createdAtFilter.lte = dateTo;
    }

    query.where.created_at = createdAtFilter;

    if (orderBy == OrderPostsBy.CREATED_AT_ASC) {
      query.orderBy = { created_at: 'asc' };
    } else if (orderBy == OrderPostsBy.CREATED_AT_DESC) {
      query.orderBy = { created_at: 'desc' };
    }

    if (limit && Number.isInteger(limit) && limit > 0) {
      query.take = limit;
    }

    return this.prismaService.post.findMany(query);
  }
}
