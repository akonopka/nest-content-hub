import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PostStatus } from '../src/generated/prisma/enums';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<typeof request>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitMQService)
      .useValue({ sendToEmbeddingQueue: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    server = request(app.getHttpServer());
  });

  it('creates a post', async () => {
    const content = 'testowy post e2e';

    const postsPostResponse = await server
      .post('/posts')
      .send({ content })
      .expect(201);

    const postsPostResponseBody = postsPostResponse.body;

    const createdPostId = postsPostResponseBody.id;

    expect(createdPostId).toBeDefined();
    expect(postsPostResponseBody.content_type).toBe('text/plain');
    expect(postsPostResponseBody.content).toBe(content);
    expect(postsPostResponseBody.status).toBe(PostStatus.PENDING);
    expect(postsPostResponseBody.email).toBeNull();
    expect(postsPostResponseBody.file_path).toBeNull();
    expect(postsPostResponseBody.created_at).toBeDefined();
    expect(postsPostResponseBody.updated_at).toBeDefined();

    const postsGetResponse = await server.get('/posts').expect(200);

    const postsGetBody = postsGetResponse.body;

    expect(postsGetBody).toContainEqual(
      expect.objectContaining({ id: createdPostId }),
    );

    const postsGetSingleResponse = await server
      .get('/posts/' + createdPostId)
      .expect(200);

    const postsGetSingleResponseBody = postsGetSingleResponse.body;

    expect(postsGetSingleResponseBody.content).toBe(content);
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
