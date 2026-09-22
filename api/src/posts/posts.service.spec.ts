import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PostStatus } from '../generated/prisma/enums';

describe('PostsService', () => {
  let postsService: PostsService;
  let prisma: {
    post: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let rabbitMQ: { sendToQueue: jest.Mock };

  beforeEach(async () => {
    prisma = {
      post: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    rabbitMQ = { sendToQueue: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        // { provide: PostsService, useClass: PostsService },
        { provide: PrismaService, useValue: prisma },
        { provide: RabbitMQService, useValue: rabbitMQ },
      ],
    }).compile();

    postsService = testingModule.get<PostsService>(PostsService);
  });

  it('returns a post by id', async () => {
    const postId = 1;
    const foundPost = { id: postId, content: 'test', email: null };
    prisma.post.findUnique.mockResolvedValue(foundPost);

    const result = await postsService.findOne(postId);

    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: postId },
    });

    expect(result).toBe(foundPost);
  });

  it('creates a post and emits an event to the queue', async () => {
    const createdPost = { id: 1, content: 'test', email: null };
    prisma.post.create.mockResolvedValue(createdPost);

    const result = await postsService.create({ content: 'test' });

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: { content: 'test', email: undefined, content_type: 'text/plain' },
    });
    expect(rabbitMQ.sendToQueue).toHaveBeenCalledWith('post.created', {
      postId: 1,
    });
    expect(result).toBe(createdPost);
  });

  it('marks a post as ready', async () => {
    const postId = 1;

    await postsService.markReady(postId);

    expect(prisma.post.update).toHaveBeenCalledWith({
      data: { status: PostStatus.READY },
      where: { id: postId },
    });
  });
});
