import { Test, TestingModule } from '@nestjs/testing';
import { AskWorkerController } from './ask-worker.controller';
import { QuestionsService } from '../questions/questions.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { PostsService } from '../posts/posts.service';
import { MailService } from '../mail/mail.service';

import { type Message } from 'ollama';
import { PostStatus } from '../generated/prisma/enums';
import { searchContentTool, queryContentTool } from '../ask/ask.tools';

describe('AskWorkerController', () => {
  let askWorkerController: AskWorkerController;

  let questionsService: {
    markFailed: jest.Mock;
    markProcessing: jest.Mock;
    markReady: jest.Mock;
    findOne: jest.Mock;
    saveAnswer: jest.Mock;
  };
  let ollamaService: { embed: jest.Mock; chat: jest.Mock };
  let postsService: { findByIds: jest.Mock; queryPosts: jest.Mock };
  let qdrantService: { search: jest.Mock };
  let mailService: { send: jest.Mock };

  beforeEach(async () => {
    questionsService = {
      markFailed: jest.fn(),
      markProcessing: jest.fn(),
      markReady: jest.fn(),
      findOne: jest.fn(),
      saveAnswer: jest.fn(),
    };
    ollamaService = { embed: jest.fn(), chat: jest.fn() };
    postsService = { findByIds: jest.fn(), queryPosts: jest.fn() };
    qdrantService = { search: jest.fn() };
    mailService = { send: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: QuestionsService, useValue: questionsService },
        { provide: OllamaService, useValue: ollamaService },
        { provide: PostsService, useValue: postsService },
        { provide: QdrantService, useValue: qdrantService },
        { provide: MailService, useValue: mailService },
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
    ).rejects.toThrow(`Question ${questionId} not found`);

    expect(questionsService.findOne).toHaveBeenCalledWith(questionId);
    expect(ollamaService.chat).not.toHaveBeenCalled();

    expect(questionsService.markProcessing).not.toHaveBeenCalled();
    expect(questionsService.markFailed).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'question is empty',
      question: { id: 1, email: 'someone@example.com' },
    },
    {
      name: 'email is empty',
      question: { id: 1, question: 'some question' },
    },
  ])('throws when $name', async ({ question }) => {
    const questionId = question.id;

    questionsService.findOne.mockResolvedValue(question);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).rejects.toThrow(`Question ${questionId} is missing question or email`);

    expect(questionsService.findOne).toHaveBeenCalledWith(questionId);
    expect(ollamaService.chat).not.toHaveBeenCalled();

    expect(questionsService.markProcessing).not.toHaveBeenCalled();
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
  });

  it.each([
    {
      name: 'uses the raw user question when the model does not call the tool',
      toolCalledByModel: false,
    },
    {
      name: 'uses the question from model when the model does call the tool',
      toolCalledByModel: true,
    },
  ])('$name', async ({ toolCalledByModel }) => {
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

    const toolQuestion = 'refined question from the model';

    const message = toolCalledByModel
      ? {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              function: {
                name: 'searchContent',
                arguments: { question: toolQuestion },
              },
            },
            {
              function: {
                name: 'queryPosts',
                arguments: {
                  status: 'READY',
                  dateFrom: '2026-09-01',
                  dateTo: '2026-09-30',
                },
              },
            },
          ],
        }
      : { role: 'assistant', content: response };

    const expectedEmbedArg = toolCalledByModel
      ? toolQuestion
      : question.question;

    const vectors = [0.1, 0.2, 0.3];

    const posts1 = [
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

    const posts2 = [
      {
        email: 'someone@example.com',
        id: 3,
        status: PostStatus.READY,
        created_at: new Date(),
        updated_at: new Date(),
        content_type: 'text/plain',
        content: 'some example post',
      },
      {
        email: 'someoneelse@example.com',
        id: 4,
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
        content: JSON.stringify(posts1),
        tool_name: 'searchContent',
      },
      ...(toolCalledByModel
        ? [
            {
              role: 'tool',
              content: JSON.stringify(posts2),
              tool_name: 'queryPosts',
            },
          ]
        : []),
    ];

    questionsService.findOne.mockResolvedValue(question);

    ollamaService.chat.mockResolvedValueOnce(message as Message);

    ollamaService.embed.mockResolvedValue(vectors);
    qdrantService.search.mockResolvedValue({
      points: posts1.map((post) => ({ payload: { post_id: post.id } })),
    });
    postsService.findByIds.mockResolvedValue(posts1);

    if (toolCalledByModel) {
      postsService.queryPosts.mockResolvedValue(posts2);
    }

    ollamaService.chat.mockResolvedValueOnce(finalMessage as Message);

    mailService.send.mockResolvedValueOnce(true);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(ollamaService.chat).toHaveBeenNthCalledWith(
      1,
      [systemMessage, userMessage],
      [searchContentTool, queryContentTool],
    );

    expect(ollamaService.embed).toHaveBeenCalledWith(expectedEmbedArg);
    expect(qdrantService.search).toHaveBeenCalledWith(
      process.env.POSTS_COLLECTION,
      vectors,
      Number(process.env.SEARCH_CONTENT_LIMIT),
      Number(process.env.SEARCH_CONTENT_SCORE_THRESHOLD),
    );

    expect(postsService.findByIds).toHaveBeenCalledWith(
      posts1.map((post) => post.id),
    );

    if (toolCalledByModel) {
      expect(postsService.queryPosts).toHaveBeenCalledWith(
        'READY',
        new Date('2026-09-01'),
        new Date('2026-09-30'),
      );
    }

    expect(ollamaService.chat).toHaveBeenNthCalledWith(2, messages);

    expect(questionsService.saveAnswer).toHaveBeenCalledWith(
      questionId,
      finalResponse,
    );

    expect(mailService.send).toHaveBeenCalledWith(
      question.email,
      'Odpowiedź na Twoje pytanie',
      expect.stringContaining(question.question),
      expect.stringContaining(finalResponse),
    );

    const [, , , html] = mailService.send.mock.calls[0];
    expect(html).toContain(question.question);

    expect(questionsService.markProcessing).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).toHaveBeenCalledWith(questionId);
    expect(questionsService.markFailed).not.toHaveBeenCalled();

    const saveOrder = questionsService.saveAnswer.mock.invocationCallOrder[0];
    const sendOrder = mailService.send.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(sendOrder);
  });

  it('escapes mail content', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: '<b>some question</b>',
    };
    const questionId = question.id;

    const systemMessage = {
      role: 'system',
      content: process.env.ASK_SYSTEM_PROMPT,
    };
    const userMessage = { role: 'user', content: question.question };

    const toolQuestion = 'refined question from the model';

    const message = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          function: {
            name: 'searchContent',
            arguments: { question: toolQuestion },
          },
        },
      ],
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
        tool_name: 'searchContent',
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

    mailService.send.mockResolvedValueOnce(true);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(ollamaService.chat).toHaveBeenNthCalledWith(
      1,
      [systemMessage, userMessage],
      [searchContentTool, queryContentTool],
    );

    expect(ollamaService.embed).toHaveBeenCalledWith(toolQuestion);
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

    expect(questionsService.saveAnswer).toHaveBeenCalledWith(
      questionId,
      finalResponse,
    );

    expect(mailService.send).toHaveBeenCalledWith(
      question.email,
      'Odpowiedź na Twoje pytanie',
      expect.stringContaining(question.question),
      expect.stringContaining(finalResponse),
    );

    const [, , , html] = mailService.send.mock.calls[0];
    expect(html).toContain('&lt;b&gt;some question&lt;/b&gt;');
    expect(html).not.toContain('<b>some question</b>');

    expect(questionsService.markProcessing).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).toHaveBeenCalledWith(questionId);
    expect(questionsService.markFailed).not.toHaveBeenCalled();

    const saveOrder = questionsService.saveAnswer.mock.invocationCallOrder[0];
    const sendOrder = mailService.send.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(sendOrder);
  });

  it('marks the question as failed when the model returns an empty answer', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: 'some question',
    };
    const questionId = question.id;

    const message = { role: 'assistant', content: 'some response' };
    const finalMessage = { role: 'assistant', content: '' };

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
    ];

    questionsService.findOne.mockResolvedValue(question);
    ollamaService.chat.mockResolvedValueOnce(message as Message);
    ollamaService.embed.mockResolvedValue(vectors);
    qdrantService.search.mockResolvedValue({
      points: posts.map((post) => ({ payload: { post_id: post.id } })),
    });
    postsService.findByIds.mockResolvedValue(posts);
    ollamaService.chat.mockResolvedValueOnce(finalMessage as Message);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(questionsService.markProcessing).toHaveBeenCalledWith(questionId);
    expect(questionsService.saveAnswer).not.toHaveBeenCalled();
    expect(mailService.send).not.toHaveBeenCalled();
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).not.toHaveBeenCalled();
  });

  it('marks the question as failed when sending the email fails', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: 'some question',
    };
    const questionId = question.id;

    const message = { role: 'assistant', content: 'some response' };
    const finalResponse = 'some final response';
    const finalMessage = { role: 'assistant', content: finalResponse };

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
    ];

    questionsService.findOne.mockResolvedValue(question);
    ollamaService.chat.mockResolvedValueOnce(message as Message);
    ollamaService.embed.mockResolvedValue(vectors);
    qdrantService.search.mockResolvedValue({
      points: posts.map((post) => ({ payload: { post_id: post.id } })),
    });
    postsService.findByIds.mockResolvedValue(posts);
    ollamaService.chat.mockResolvedValueOnce(finalMessage as Message);
    mailService.send.mockResolvedValueOnce(false);

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(questionsService.saveAnswer).toHaveBeenCalledWith(
      questionId,
      finalResponse,
    );
    expect(mailService.send).toHaveBeenCalledWith(
      question.email,
      'Odpowiedź na Twoje pytanie',
      expect.stringContaining(question.question),
      expect.stringContaining(finalResponse),
    );
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).not.toHaveBeenCalled();
  });

  it('marks the question as failed and does not send the email when saving the answer fails', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: 'some question',
    };
    const questionId = question.id;

    const message = { role: 'assistant', content: 'some response' };
    const finalResponse = 'some final response';
    const finalMessage = { role: 'assistant', content: finalResponse };

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
    ];

    questionsService.findOne.mockResolvedValue(question);
    ollamaService.chat.mockResolvedValueOnce(message as Message);
    ollamaService.embed.mockResolvedValue(vectors);
    qdrantService.search.mockResolvedValue({
      points: posts.map((post) => ({ payload: { post_id: post.id } })),
    });
    postsService.findByIds.mockResolvedValue(posts);
    ollamaService.chat.mockResolvedValueOnce(finalMessage as Message);
    questionsService.saveAnswer.mockRejectedValue(new Error('db down'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to process question ${questionId}`,
      expect.any(Error),
    );
    expect(mailService.send).not.toHaveBeenCalled();
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).not.toHaveBeenCalled();
  });

  it('marks the question as failed and logs the error when processing throws', async () => {
    const question = {
      id: 1,
      email: 'someone@example.com',
      question: 'some question',
    };
    const questionId = question.id;

    questionsService.findOne.mockResolvedValue(question);

    ollamaService.chat.mockRejectedValue(new Error('ollama down'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(
      askWorkerController.handleQuestionAsked({ questionId }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to process question ${questionId}`,
      expect.any(Error),
    );
    expect(questionsService.markFailed).toHaveBeenCalledWith(questionId);
    expect(questionsService.markReady).not.toHaveBeenCalled();
    expect(mailService.send).not.toHaveBeenCalled();
  });

  afterEach(() => jest.restoreAllMocks());
});
