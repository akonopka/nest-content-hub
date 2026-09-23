import { Injectable } from '@nestjs/common';
import { QuestionsService } from '../questions/questions.service';
import { Question } from '../generated/prisma/client';
import { QuestionCreateDto } from '../questions/question.dto';

export interface QuestionAskedEvent {
  questionId: number;
}

@Injectable()
export class AskService {
  constructor(private readonly questionsService: QuestionsService) {}

  async ask(data: QuestionCreateDto): Promise<Question> {
    const question = await this.questionsService.create(data);
    return question;
  }
}
