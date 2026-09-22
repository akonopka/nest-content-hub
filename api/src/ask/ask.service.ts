import { Injectable } from '@nestjs/common';
import { AskDto } from './ask.dto';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '../generated/prisma/client';
import type { Message } from 'ollama';
import { searchContentTool } from './ask.tools';

@Injectable()
export class AskService {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly qdrantService: QdrantService,
    private readonly prismaService: PrismaService,
  ) {}

  async ask(data: AskDto): Promise<string> {
    const messages: Message[] = [{ role: 'user', content: data.question }];
    const message = await this.ollamaService.chat(messages, [
      searchContentTool,
    ]);

    let question: string;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      question = data.question;
    } else {
      const toolCall = message.tool_calls[0];
      question = toolCall.function.arguments.question as string;
    }

    const posts = await this.searchContent(question);

    const fullMessages = [
      ...messages,
      message,
      {
        role: 'tool',
        content: JSON.stringify(posts),
        tool_name: 'search_content',
      },
    ];

    const finalMessage = await this.ollamaService.chat(fullMessages);

    return finalMessage.content;
  }

  async searchContent(question: string): Promise<Post[]> {
    const vector = await this.ollamaService.embed(question);

    const result = await this.qdrantService.search(
      process.env.POSTS_COLLECTION!,
      vector,
      Number(process.env.SEARCH_CONTENT_LIMIT!),
      Number(process.env.SEARCH_CONTENT_SCORE_THRESHOLD!),
    );

    const postIds = result.points.map(
      (point) => point.payload!.post_id as number,
    );

    return this.prismaService.post.findMany({
      where: { id: { in: postIds } },
    });
  }
}
