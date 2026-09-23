import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PostStatus } from '../src/generated/prisma/enums';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<typeof request>;
  let prismaService: {
    post: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
  };
  let rabbitMQService: { sendToEmbeddingQueue: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      post: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    };
    rabbitMQService = { sendToEmbeddingQueue: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .overrideProvider(RabbitMQService)
      .useValue(rabbitMQService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    server = request(app.getHttpServer());
  });

  it('creates a post', async () => {
    const createdPost = {
      id: 1,
      content: 'testowy post e2e',
      content_type: 'text/plain',
      status: PostStatus.PENDING,
      email: 'someone@example.com',
      file_path: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    prismaService.post.create.mockResolvedValue(createdPost);

    const postsPostResponse = await server
      .post('/posts')
      .send({ content: createdPost.content, email: createdPost.email })
      .expect(201);

    const postsPostResponseBody = postsPostResponse.body;

    const createdPostId = postsPostResponseBody.id;

    expect(createdPostId).toBeDefined();
    expect(postsPostResponseBody.content_type).toBe('text/plain');
    expect(postsPostResponseBody.content).toBe(createdPost.content);
    expect(postsPostResponseBody.status).toBe(createdPost.status);
    expect(postsPostResponseBody.email).toBe(createdPost.email);
    expect(postsPostResponseBody.file_path).toBeNull();
    expect(postsPostResponseBody.created_at).toBeDefined();
    expect(postsPostResponseBody.updated_at).toBeDefined();

    expect(prismaService.post.create).toHaveBeenCalledWith({
      data: {
        content: createdPost.content,
        email: createdPost.email,
        content_type: createdPost.content_type,
      },
    });

    prismaService.post.findMany.mockResolvedValue([createdPost]);

    const postsGetResponse = await server.get('/posts').expect(200);

    const postsGetBody = postsGetResponse.body;

    expect(postsGetBody).toContainEqual(
      expect.objectContaining({ id: createdPostId }),
    );

    prismaService.post.findUnique.mockResolvedValue(createdPost);

    const postsGetSingleResponse = await server
      .get('/posts/' + createdPostId)
      .expect(200);

    const postsGetSingleResponseBody = postsGetSingleResponse.body;

    expect(postsGetSingleResponseBody.content).toBe(createdPost.content);

    expect(prismaService.post.findUnique).toHaveBeenCalledWith({
      where: { id: createdPost.id },
    });
  });

  it('creates a post without content', async () => {
    await server.post('/posts').expect(400);
  });

  it('creates a post with invalid email', async () => {
    await server
      .post('/posts')
      .send({ email: 'some_invalid_email' })
      .expect(400);
  });

  it('gets a post with not existing id', async () => {
    await server.get('/posts/999999').expect(404);
  });

  it('gets a post with invalid id', async () => {
    await server.get('/posts/some_invalid_id').expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
