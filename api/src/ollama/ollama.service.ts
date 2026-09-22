import { Injectable } from '@nestjs/common';
import { Ollama } from 'ollama';
import type { Message, Tool } from 'ollama';

@Injectable()
export class OllamaService {
  private client = new Ollama({ host: process.env.OLLAMA_URL });

  async chat(messages: Message[], tools?: Tool[]): Promise<Message> {
    const response = await this.client.chat({
      model: process.env.OLLAMA_CHAT_MODEL!,
      messages,
      tools,
    });

    return response.message;
  }
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: process.env.OLLAMA_EMBEDD_MODEL!,
      input: text,
    });

    return response.embeddings[0];
  }
}
