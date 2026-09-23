import { Test, TestingModule } from '@nestjs/testing';
import { AskService } from './ask.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

describe('AskService', () => {
  let askService: AskService;
  let prismaService: {
    post: { findMany: jest.Mock };
    question: { create: jest.Mock };
  };
  let rabbitMQService: { sendToAskQueue: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      post: { findMany: jest.fn() },
      question: { create: jest.fn() },
    };
    rabbitMQService = { sendToAskQueue: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AskService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RabbitMQService, useValue: rabbitMQService },
      ],
    }).compile();

    askService = testingModule.get<AskService>(AskService);
  });

  it('asks a question', async () => {
    const createdQuestion = {
      id: 1,
      question: 'some question',
      email: 'someone@example.com',
    };

    prismaService.question.create.mockResolvedValue(createdQuestion);

    const result = await askService.ask({
      question: createdQuestion.question,
      email: createdQuestion.email,
    });

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

    expect(result).toEqual(createdQuestion);
  });
});
