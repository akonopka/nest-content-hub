import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type QuestionAskedEvent } from '../ask/ask.service';
import { QuestionsService } from '../questions/questions.service';
import { Message, ToolCall } from 'ollama';
import { Post, PostStatus } from '../generated/prisma/client';
import { OllamaService } from '../ollama/ollama.service';
import { searchContentTool, queryContentTool } from '../ask/ask.tools';
import { QdrantService } from '../qdrant/qdrant.service';
import { PostsService } from '../posts/posts.service';
import { MailService } from '../mail/mail.service';
import escapeHtml from 'escape-html';

@Controller()
export class AskWorkerController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly ollamaService: OllamaService,
    private readonly qdrantService: QdrantService,
    private readonly postsService: PostsService,
    private readonly mailService: MailService,
  ) {}

  @EventPattern('question.asked')
  async handleQuestionAsked(data: QuestionAskedEvent): Promise<void> {
    const questionId = data.questionId;
    const questionObj = await this.questionsService.findOne(questionId);

    if (!questionObj) {
      throw new Error(`Question ${questionId} not found`);
    }

    if (!questionObj.question || !questionObj.email) {
      await this.questionsService.markFailed(questionId);
      throw new Error(`Question ${questionId} is missing question or email`);
    }

    await this.questionsService.markProcessing(questionId);

    try {
      const messages: Message[] = [
        { role: 'system', content: process.env.ASK_SYSTEM_PROMPT! },
        { role: 'user', content: questionObj.question },
      ];
      const message: Message = await this.ollamaService.chat(messages, [
        searchContentTool,
        queryContentTool,
      ]);

      const fullMessages = [...messages, message];

      if (!message.tool_calls || message.tool_calls.length === 0) {
        let toolName = 'search_content';
        let toolResult = await this.searchContent(questionObj.question);

        fullMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          tool_name: toolName,
        });
      } else {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          let toolResult;

          if (toolName === 'search_content') {
            const question = toolCall.function.arguments.question as string;
            toolResult = await this.searchContent(question);
          } else if (toolName === 'query_posts') {
            const status = toolCall.function.arguments.status as PostStatus;
            const date_from = toolCall.function.arguments.date_from
              ? new Date(toolCall.function.arguments.date_from)
              : undefined;
            const date_to = toolCall.function.arguments.date_to
              ? new Date(toolCall.function.arguments.date_to)
              : undefined;
            toolResult = await this.queryPosts(status, date_from, date_to);
          }
          fullMessages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_name: toolName,
          });
        }
      }

      const finalMessage = await this.ollamaService.chat(fullMessages);

      const content = finalMessage.content;

      if (!content) {
        await this.questionsService.markFailed(questionId);
        return;
      }

      await this.questionsService.saveAnswer(questionId, content);

      const text = `
Cześć,

Twoje pytanie:
${questionObj.question}

Odpowiedź:
${content}

--
nest-content-hub
`;

      const html = `
<p>Cześć,</p>
<p><strong>Twoje pytanie:</strong><br>${escapeHtml(questionObj.question)}</p>
<p><strong>Odpowiedź:</strong><br>${escapeHtml(content).replace(/\n/g, '<br>')}</p>
<hr>
<p><small>nest-content-hub</small></p>
`;

      const mailSent = await this.mailService.send(
        questionObj.email,
        'Odpowiedź na Twoje pytanie',
        text,
        html,
      );

      if (mailSent) {
        await this.questionsService.markReady(questionId);
      } else {
        await this.questionsService.markFailed(questionId);
      }
    } catch (error) {
      console.error(`Failed to process question ${questionId}`, error);
      await this.questionsService.markFailed(questionId);
    }
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

  async queryPosts(
    status?: PostStatus,
    date_from?: Date,
    date_to?: Date,
  ): Promise<Post[]> {
    return this.postsService.queryPosts(status, date_from, date_to);
  }
}
