import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Question, QuestionStatus } from '../generated/prisma/client';
import { QuestionCreateDto } from './question.dto';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

export interface QuestionAskedEvent {
  questionId: number;
}

@Injectable()
export class QuestionsService {
  constructor(
    private prismaService: PrismaService,
    private rabbitMQService: RabbitMQService,
  ) {}

  async findOne(id: number): Promise<Question | null> {
    return this.prismaService.question.findUnique({ where: { id } });
  }

  async findAll(): Promise<Question[]> {
    return this.prismaService.question.findMany();
  }

  async create(data: QuestionCreateDto): Promise<Question> {
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

  async updateStatus(
    questionId: number,
    status: QuestionStatus,
  ): Promise<void> {
    await this.prismaService.question.update({
      data: { status },
      where: { id: questionId },
    });
  }

  async markFailed(questionId: number): Promise<void> {
    await this.updateStatus(questionId, QuestionStatus.FAILED);
  }

  async markReady(questionId: number): Promise<void> {
    await this.updateStatus(questionId, QuestionStatus.READY);
  }
}
