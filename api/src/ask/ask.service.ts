import { Injectable } from '@nestjs/common';
import { AskDto } from './ask.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Question } from '../generated/prisma/client';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

export interface QuestionAskedEvent {
  questionId: number;
}

@Injectable()
export class AskService {
  constructor(
    private readonly prismaService: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async ask(data: AskDto): Promise<Question> {
    const questionData = {
      question: data.question,
      email: data.email,
    };

    const question = await this.prismaService.question.create({
      data: questionData,
    });

    await this.rabbitMQService.sendToAskQueue('question.asked', {
      questionId: question.id,
    } as QuestionAskedEvent);

    return question;
  }
}
