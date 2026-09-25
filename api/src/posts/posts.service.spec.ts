import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PostStatus } from '../generated/prisma/enums';

describe('PostsService', () => {
  let postsService: PostsService;
  let prismaService: {
    post: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let rabbitMQService: { sendToEmbeddingQueue: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      post: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    rabbitMQService = { sendToEmbeddingQueue: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        // { provide: PostsService, useClass: PostsService },
        { provide: PrismaService, useValue: prismaService },
        { provide: RabbitMQService, useValue: rabbitMQService },
      ],
    }).compile();

    postsService = testingModule.get<PostsService>(PostsService);
  });

  it('returns a post by id', async () => {
    const postId = 1;
    const foundPost = { id: postId, content: 'test', email: null };
    prismaService.post.findUnique.mockResolvedValue(foundPost);

    const result = await postsService.findOne(postId);

    expect(prismaService.post.findUnique).toHaveBeenCalledWith({
      where: { id: postId },
    });

    expect(result).toBe(foundPost);
  });

  it('creates a post and emits an event to the queue', async () => {
    const createdPost = { id: 1, content: 'test' };
    prismaService.post.create.mockResolvedValue(createdPost);

    const result = await postsService.create({ content: 'test' });

    expect(prismaService.post.create).toHaveBeenCalledWith({
      data: {
        content: createdPost.content,
        email: undefined,
        content_type: 'text/plain',
      },
    });
    expect(rabbitMQService.sendToEmbeddingQueue).toHaveBeenCalledWith(
      'post.created',
      {
        postId: createdPost.id,
      },
    );
    expect(result).toBe(createdPost);
  });

  it('marks a post as ready', async () => {
    const postId = 1;

    await postsService.markReady(postId);

    expect(prismaService.post.update).toHaveBeenCalledWith({
      data: { status: PostStatus.READY },
      where: { id: postId },
    });
  });
});
