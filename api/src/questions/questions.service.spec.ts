import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from '../questions/questions.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionStatus } from '../generated/prisma/enums';

describe('QuestionsService', () => {
  let questionsService: QuestionsService;

  let rabbitMQService: { sendToAskQueue: jest.Mock };
  let prismaService: {
    question: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    rabbitMQService = { sendToAskQueue: jest.fn() };
    prismaService = {
      question: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: RabbitMQService, useValue: rabbitMQService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    questionsService = testingModule.get<QuestionsService>(QuestionsService);
  });

  it('returns a question by id', async () => {
    const questionId = 1;
    const foundQuestion = {
      id: questionId,
      question: 'some question',
      email: 'someone@example.com',
    };

    prismaService.question.findUnique.mockResolvedValue(foundQuestion);

    const result = await questionsService.findOne(questionId);

    expect(prismaService.question.findUnique).toHaveBeenCalledWith({
      where: { id: questionId },
    });

    expect(result).toBe(foundQuestion);
  });

  it('creates a question and emits an event to the ask queue', async () => {
    const createdQuestion = {
      id: 1,
      question: 'some question',
      email: 'someone@example.com',
    };

    prismaService.question.create.mockResolvedValue(createdQuestion);

    const result = await questionsService.create({
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

    expect(result).toBe(createdQuestion);
  });

  it.each([
    ['ready', QuestionStatus.READY],
    ['failed', QuestionStatus.FAILED],
  ])('marks questions as %s', async (_name, questionStatus: QuestionStatus) => {
    const questionId = 1;

    const updatedQuestion = {
      id: questionId,
      question: 'some question',
      email: 'someone@example.com',
      status: questionStatus,
    };

    prismaService.question.update.mockResolvedValue(updatedQuestion);

    const result = await questionsService.updateStatus(
      questionId,
      questionStatus,
    );

    expect(prismaService.question.update).toHaveBeenCalledWith({
      data: { status: questionStatus },
      where: { id: questionId },
    });

    expect(result).toBeUndefined();
  });
});
