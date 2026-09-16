import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PostStatus } from '../src/generated/prisma/enums';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates a post', async () => {
    const server = request(app.getHttpServer());

    const postContent = 'testowy post e2e';

    const postResponse = await server
      .post('/posts')
      .send({ content: postContent })
      .expect(201);

    const postBody = postResponse.body;

    const createdPostId = postBody.id;

    expect(createdPostId).toBeDefined();
    expect(postBody.content_type).toBe('text/plain');
    expect(postBody.content).toBe(postContent);
    expect(postBody.status).toBe(PostStatus.PENDING);
    expect(postBody.email).toBeNull();
    expect(postBody.file_path).toBeNull();
    expect(postBody.created_at).toBeDefined();
    expect(postBody.updated_at).toBeDefined();

    const postsResponse = await server.get('/posts').expect(200);

    const postsBody = postsResponse.body;

    expect(postsBody).toContainEqual(
      expect.objectContaining({ id: createdPostId }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
