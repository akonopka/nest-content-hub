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

      console.log(finalMessage);

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
}
