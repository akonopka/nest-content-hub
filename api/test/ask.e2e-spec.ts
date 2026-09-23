import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QuestionStatus } from '../src/generated/prisma/enums';
import { RabbitMQService } from '../src/rabbitmq/rabbitmq.service';

describe('Ask (e2e)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<typeof request>;
  let prismaService: { question: { create: jest.Mock } };
  let rabbitMQService: { sendToAskQueue: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      question: { create: jest.fn() },
    };
    rabbitMQService = {
      sendToAskQueue: jest.fn(),
    };

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

  it('asks a question', async () => {
    const createdQuestion = {
      id: 1,
      question: 'some question',
      email: 'someone@example.com',
      status: QuestionStatus.PENDING,
    };

    prismaService.question.create.mockResolvedValue(createdQuestion);

    const httpResponse = await server
      .post('/ask')
      .send({
        question: createdQuestion.question,
        email: createdQuestion.email,
      })
      .expect(202);

    const responseBody = httpResponse.body;

    const expectedResponseBody = {
      questionId: createdQuestion.id,
      status: createdQuestion.status,
    };
    expect(responseBody).toEqual(expectedResponseBody);

    expect(prismaService.question.create).toHaveBeenCalledWith({
      data: {
        question: createdQuestion.question,
        email: createdQuestion.email,
      },
    });

    expect(rabbitMQService.sendToAskQueue).toHaveBeenCalledWith(
      'question.asked',
      {
        questionId: createdQuestion.id,
      },
    );
  });

  it('asks without a question', async () => {
    await server
      .post('/ask')
      .send({ email: 'someone@example.com' })
      .expect(400);
  });

  it('asks without an email', async () => {
    await server.post('/ask').send({ question: 'some question' }).expect(400);
  });

  it('asks with an empty question', async () => {
    await server.post('/ask').send({ question: '' }).expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
