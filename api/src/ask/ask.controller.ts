import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { QuestionCreateDto } from '../questions/question.dto';
import { QuestionStatus } from '../generated/prisma/enums';

@Controller('ask')
export class AskController {
  constructor(private askService: AskService) {}

  @Post()
  @HttpCode(202)
  async ask(
    @Body() dto: QuestionCreateDto,
  ): Promise<{ questionId: number; status: QuestionStatus }> {
    const question = await this.askService.ask(dto);
    return { questionId: question.id, status: question.status };
  }
}
