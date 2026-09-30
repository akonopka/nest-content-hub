import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { QuestionCreateDto } from '../questions/question.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AskResponseDto } from './ask.dto';

@Controller('ask')
export class AskController {
  constructor(private askService: AskService) {}

  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  @ApiOperation({
    summary: 'Ask a question about the stored content',
    description:
      'Queues the question for asynchronous processing by an AI agent (tool-use over the stored content) and returns immediately. Poll GET /questions/:id for the status and answer. The answer is also emailed to the given address once ready.',
  })
  @ApiResponse({
    status: 202,
    description: 'Question accepted for processing',
    type: AskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid question/email',
  })
  async ask(@Body() dto: QuestionCreateDto): Promise<AskResponseDto> {
    const question = await this.askService.ask(dto);
    return {
      questionId: question.id,
      status: question.status,
    };
  }
}
