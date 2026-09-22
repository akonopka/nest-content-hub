import { Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';

@Injectable()
export class OllamaService {
  private client = new Ollama({ host: process.env.OLLAMA_URL });

  async chat(question: string): Promise<string> {
    const response = await this.client.chat({
      model: process.env.OLLAMA_CHAT_MODEL!,
      messages: [{ role: 'user', content: question }],
    });

    return response.message.content;
  }
}
