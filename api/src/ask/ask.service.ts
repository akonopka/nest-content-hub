import { Injectable } from '@nestjs/common';
import { AskDto } from './ask.dto';

@Injectable()
export class AskService {
  ask(data: AskDto): void {}
}
