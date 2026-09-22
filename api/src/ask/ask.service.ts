import { Injectable } from '@nestjs/common';
import { AskDto } from './ask.dto';
import { OllamaService } from '../ollama/ollama.service';

@Injectable()
export class AskService {
  constructor(private ollamaService: OllamaService) {}

  async ask(data: AskDto): Promise<string> {
    return await this.ollamaService.chat(data.question);
  }
}
