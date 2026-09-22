import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { OllamaService } from '../src/ollama/ollama.service';

describe('Ask (e2e)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<typeof request>;
  let ollamaService: { chat: jest.Mock; embed: jest.Mock };

  beforeEach(async () => {
    ollamaService = {
      chat: jest.fn(),
      embed: jest
        .fn()
        .mockResolvedValue(
          Array(Number(process.env.POSTS_COLLECTION_SIZE)).fill(0.1),
        ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OllamaService)
      .useValue(ollamaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    server = request(app.getHttpServer());
  });

  it('asks a question', async () => {
    const question = 'some question';
    const expectedModelResponse = 'some response';

    ollamaService.chat.mockResolvedValue({
      role: 'assistant',
      content: expectedModelResponse,
    });

    const httpResponse = await server
      .post('/ask')
      .send({ question })
      .expect(201);

    const responseBody = httpResponse.body;

    const modelResponse = responseBody.response;

    expect(modelResponse).toBe(expectedModelResponse);
  });

  it('asks without a question', async () => {
    await server.post('/ask').expect(400);
  });

  it('asks with an empty question', async () => {
    await server.post('/ask').send({ question: '' }).expect(400);
  });

  it('asks a question with Ollama error', async () => {
    const question = 'some question';

    ollamaService.chat.mockRejectedValue(new Error());

    await server.post('/ask').send({ question }).expect(500);
  });

  afterEach(async () => {
    await app.close();
  });
});
