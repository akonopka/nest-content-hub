import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type QuestionAskedEvent } from '../ask/ask.service';
import { QuestionsService } from '../questions/questions.service';
import { Message } from 'ollama';
import { Post } from '../generated/prisma/client';
import { OllamaService } from '../ollama/ollama.service';
import { searchContentTool } from '../ask/ask.tools';
import { QdrantService } from '../qdrant/qdrant.service';
import { PostsService } from '../posts/posts.service';

@Controller()
export class AskWorkerController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly ollamaService: OllamaService,
    private readonly qdrantService: QdrantService,
    private readonly postsService: PostsService,
  ) {}

  @EventPattern('question.asked')
  async handleQuestionAsked(data: QuestionAskedEvent): Promise<string> {
    const questionId = data.questionId;
    const questionObj = await this.questionsService.findOne(questionId);

    if (!questionObj) {
      throw new Error(`Question ${questionId} not found`);
    }

    if (!questionObj.question || !questionObj.email) {
      await this.questionsService.markFailed(questionId);
      throw new Error(`Question ${questionId} is missing question or email`);
    }

    const messages: Message[] = [
      { role: 'system', content: process.env.ASK_SYSTEM_PROMPT! },
      { role: 'user', content: questionObj.question },
    ];
    const message = await this.ollamaService.chat(messages, [
      searchContentTool,
    ]);

    let question: string;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      question = questionObj.question;
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

    return this.postsService.findByIds(postIds);
  }
}
