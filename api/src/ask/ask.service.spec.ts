import { Test, TestingModule } from '@nestjs/testing';
import { AskService } from './ask.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { PrismaService } from '../prisma/prisma.service';
import { searchContentTool } from './ask.tools';

describe('AskService', () => {
  let askService: AskService;
  let ollamaService: { chat: jest.Mock; embed: jest.Mock };
  let qdrantService: { search: jest.Mock };
  let prismaService: { post: { findMany: jest.Mock } };

  beforeEach(async () => {
    ollamaService = { chat: jest.fn(), embed: jest.fn() };
    qdrantService = { search: jest.fn() };
    prismaService = { post: { findMany: jest.fn() } };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AskService,
        { provide: OllamaService, useValue: ollamaService },
        { provide: QdrantService, useValue: qdrantService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    askService = testingModule.get<AskService>(AskService);
  });

  it('asks a question', async () => {
    const question = 'some question';
    const response = 'some response';

    ollamaService.chat.mockResolvedValue({
      role: 'assistant',
      content: response,
    });

    qdrantService.search.mockResolvedValue({ points: [] });
    prismaService.post.findMany.mockResolvedValue([]);

    const result = await askService.ask({ question });
    expect(ollamaService.chat).toHaveBeenCalledWith(
      [
        { role: 'system', content: process.env.ASK_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      [searchContentTool],
    );

    expect(result).toBe(response);
  });
});
