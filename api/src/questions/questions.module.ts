import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Module({
  exports: [QuestionsService],
  providers: [QuestionsService],
  controllers: [],
})
export class QuestionsModule {}
