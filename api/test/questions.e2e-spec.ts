import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QuestionStatus } from '../src/generated/prisma/enums';

describe('Questions (e2e)', () => {
  let app: INestApplication<App>;
  let server: ReturnType<typeof request>;
  let prismaService: {
    question: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prismaService = {
      question: { findUnique: jest.fn() },
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaService)
      .compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    server = request(app.getHttpServer());
  });

  it('gets a question with existing id', async () => {
    const questionId = 1;

    const existingQuestion = {
      id: questionId,
      question: 'some question',
      email: 'someone@example.com',
      status: QuestionStatus.READY,
      answer: 'some answer',
      created_at: new Date(),
      updated_at: new Date(),
    };

    prismaService.question.findUnique.mockResolvedValue(existingQuestion);

    const response = await server.get('/questions/1').expect(200);

    expect(prismaService.question.findUnique).toHaveBeenCalledWith({
      where: { id: questionId },
    });

    expect(response.body).toEqual({
      id: questionId,
      question: existingQuestion.question,
      status: existingQuestion.status,
      answer: existingQuestion.answer,
    });
  });

  it('gets a question with not existing id', async () => {
    await server.get('/questions/999999').expect(404);
  });

  it('gets a question with invalid id', async () => {
    await server.get('/questions/some_invalid_id').expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
