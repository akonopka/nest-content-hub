import { Test, TestingModule } from '@nestjs/testing';
import { AskWorkerController } from './ask-worker.controller';
import { QuestionsService } from '../questions/questions.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { PostsService } from '../posts/posts.service';
import { type Message } from 'ollama';
import { PostStatus } from '../generated/prisma/enums';

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

  it('uses the raw user question when the model does not call the tool', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: 'some question',
    };
    const questionId = question.id;

    const systemMessage = {
      role: 'system',
      content: process.env.ASK_SYSTEM_PROMPT,
    };
    const userMessage = { role: 'user', content: question.question };

    const response = 'some response';

    const message = {
      role: 'assistant',
      content: response,
    };

    const vectors = [0.1, 0.2, 0.3];

    const posts = [
      {
        email: 'someone@example.com',
        id: 1,
        status: PostStatus.READY,
        created_at: new Date(),
        updated_at: new Date(),
        content_type: 'text/plain',
        content: 'some example post',
      },
      {
        email: 'someoneelse@example.com',
        id: 2,
        status: PostStatus.READY,
        created_at: new Date(),
        updated_at: new Date(),
        content_type: 'text/plain',
        content: 'some another example post',
      },
    ];

    const finalResponse = 'some final response';

    const finalMessage = {
      role: 'assistant',
      content: finalResponse,
    };

    const messages = [
      systemMessage,
      userMessage,
      message,
      {
        role: 'tool',
        content: JSON.stringify(posts),
        tool_name: 'search_content',
      },
    ];

    questionsService.findOne.mockResolvedValue(question);

    ollamaService.chat.mockResolvedValueOnce(message as Message);

    ollamaService.embed.mockResolvedValue(vectors);
    qdrantService.search.mockResolvedValue({
      points: posts.map((post) => ({ payload: { post_id: post.id } })),
    });
    postsService.findByIds.mockResolvedValue(posts);

    ollamaService.chat.mockResolvedValueOnce(finalMessage as Message);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBe(undefined);

    expect(ollamaService.embed).toHaveBeenCalledWith(question.question);
    expect(qdrantService.search).toHaveBeenCalledWith(
      process.env.POSTS_COLLECTION,
      vectors,
      Number(process.env.SEARCH_CONTENT_LIMIT),
      Number(process.env.SEARCH_CONTENT_SCORE_THRESHOLD),
    );

    expect(postsService.findByIds).toHaveBeenCalledWith(
      posts.map((post) => post.id),
    );

    expect(ollamaService.chat).toHaveBeenNthCalledWith(2, messages);

    expect(consoleSpy).toHaveBeenCalledWith({
      role: 'assistant',
      content: finalResponse,
    });
  });
});
