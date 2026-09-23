import { Module } from '@nestjs/common';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  exports: [AskService],
  providers: [AskService],
  controllers: [AskController],
  imports: [QuestionsModule],
})
export class AskModule {}
