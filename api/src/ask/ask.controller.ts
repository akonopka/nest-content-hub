import { Body, Controller, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskDto } from './ask.dto';

@Controller('ask')
export class AskController {
  constructor(private askService: AskService) {}

  @Post()
  ask(@Body() dto: AskDto): void {
    this.askService.ask(dto);
  }
}
