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
    const content = 'testowy post e2e';

    const response = await request(app.getHttpServer())
      .post('/posts')
      .send({ content })
      .expect(201);

    const body = response.body;

    expect(body.id).toBeDefined();
    expect(body.content_type).toBe('text/plain');
    expect(body.content).toBe(content);
    expect(body.status).toBe(PostStatus.PENDING);
    expect(body.email).toBeNull();
    expect(body.file_path).toBeNull();
    expect(body.created_at).toBeDefined();
    expect(body.updated_at).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
