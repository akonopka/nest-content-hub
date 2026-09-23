import { Test, TestingModule } from '@nestjs/testing';
import { AskService } from './ask.service';
import { QuestionsService } from '../questions/questions.service';

describe('AskService', () => {
  let askService: AskService;
  let questionsService: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    questionsService = {
      create: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AskService,
        { provide: QuestionsService, useValue: questionsService },
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

    questionsService.create.mockResolvedValue(createdQuestion);

    const result = await askService.ask({
      question: createdQuestion.question,
      email: createdQuestion.email,
    });

    expect(questionsService.create).toHaveBeenCalledWith({
      question: createdQuestion.question,
      email: createdQuestion.email,
    });

    expect(result).toEqual(createdQuestion);
  });
});
