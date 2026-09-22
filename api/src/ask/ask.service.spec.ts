import { Test, TestingModule } from '@nestjs/testing';
import { AskService } from './ask.service';
import { OllamaService } from '../ollama/ollama.service';

describe('AskService', () => {
  let askService: AskService;
  let ollamaService: { chat: jest.Mock };

  beforeEach(async () => {
    ollamaService = { chat: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AskService,
        { provide: OllamaService, useValue: ollamaService },
      ],
    }).compile();

    askService = testingModule.get<AskService>(AskService);
  });

  it('asks a question', async () => {
    const question = 'some question';
    const response = 'some response';

    ollamaService.chat.mockResolvedValue(response);

    const result = await askService.ask({ question });
    expect(ollamaService.chat).toHaveBeenCalledWith(question);

    expect(result).toBe(response);
  });
});
