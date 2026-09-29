import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionGetDto } from './question.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get the status and answer for a question asked via POST /ask',
    description:
      'answer stays null until status is READY. Does not return the email address on purpose.',
  })
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
