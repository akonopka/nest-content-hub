import { Body, Controller, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskDto } from './ask.dto';

@Controller('ask')
export class AskController {
  constructor(private askService: AskService) {}

  @Post()
  async ask(@Body() dto: AskDto): Promise<{ response: string }> {
    const response = await this.askService.ask(dto);
    return { response };
  }
}
