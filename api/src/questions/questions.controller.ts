import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionGetDto } from './question.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get the status and answer for a question asked via POST /ask',
    description:
      'answer stays null until status is READY. Does not return the email address on purpose.',
  })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 400, description: 'Invalid id' })
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
