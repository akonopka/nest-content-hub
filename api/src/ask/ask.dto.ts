import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '../generated/prisma/enums';

export class AskResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Id of the created question',
  })
  questionId: number;

  @ApiProperty({
    example: 'READY',
    description: 'PENDING | PROCESSING | READY | FAILED',
  })
  status: QuestionStatus;
}
