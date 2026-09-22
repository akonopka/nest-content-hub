import { Module } from '@nestjs/common';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  exports: [AskService],
  providers: [AskService],
  controllers: [AskController],
})
export class AskModule {}
