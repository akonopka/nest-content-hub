import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionGetDto } from './question.dto';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<QuestionGetDto> {
    const question = await this.questionsService.findOne(id);
    if (question == null) throw new NotFoundException();

    return {
      id: question.id,
      question: question.question,
      status: question.status,
      answer: question.answer,
    };
  }
}
