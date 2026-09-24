import { Test, TestingModule } from '@nestjs/testing';
import { AskWorkerController } from './ask-worker.controller';
import { QuestionsService } from '../questions/questions.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { PostsService } from '../posts/posts.service';

describe('AskWorkerController', () => {
  let askWorkerController: AskWorkerController;

  let questionsService: {
    markFailed: jest.Mock;
    findOne: jest.Mock;
  };
  let ollamaService: { embed: jest.Mock; chat: jest.Mock };
  let postsService: { findByIds: jest.Mock };
  let qdrantService: { search: jest.Mock };

  beforeEach(async () => {
    questionsService = { markFailed: jest.fn(), findOne: jest.fn() };
    ollamaService = { embed: jest.fn(), chat: jest.fn() };
    postsService = { findByIds: jest.fn() };
    qdrantService = { search: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: QuestionsService, useValue: questionsService },
        { provide: OllamaService, useValue: ollamaService },
        { provide: PostsService, useValue: postsService },
        { provide: QdrantService, useValue: qdrantService },
      ],
      controllers: [AskWorkerController],
    }).compile();

    askWorkerController =
      testingModule.get<AskWorkerController>(AskWorkerController);
  });

  it('throws when the question object is not found', async () => {
    const questionId = 1;

    questionsService.findOne.mockResolvedValue(null);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).rejects.toThrow('Question 1 not found');

    expect(questionsService.findOne).toHaveBeenCalledWith(questionId);
    expect(ollamaService.chat).not.toHaveBeenCalled();
  });

  it.each([
    ['question is empty', { id: 1, email: 'someone@example.com' }],
    ['email is empty', { id: 1, question: 'some question' }],
  ])('throws when %s', async (_name, question) => {
    const questionId = question.id;

    questionsService.findOne.mockResolvedValue(question);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).rejects.toThrow(`Question ${questionId} is missing question or email`);

    expect(questionsService.findOne).toHaveBeenCalledWith(questionId);
    expect(ollamaService.chat).not.toHaveBeenCalled();
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
  });
});
