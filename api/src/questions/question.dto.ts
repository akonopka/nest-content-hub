import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class QuestionCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Z czego korzysta NestJS do zarządzania zależnościami?',
    description: 'Question to ask about the stored content',
  })
  question: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({
    example: 'test@example.com',
    description: 'Where to send the answer once ready',
  })
  email: string;
}

export class QuestionGetResponseDto {
  @ApiProperty({ example: 1, description: 'Question id' })
  id: number;

  @ApiProperty({
    example: 'Z czego korzysta NestJS do zarządzania zależnościami?',
    description: 'The original question',
  })
  question: string;

  @ApiProperty({
    example: 'NestJS korzysta z wbudowanego mechanizmu dependency injection.',
    description: 'The generated answer, null until status is READY',
    nullable: true,
  })
  answer: string | null;

  @ApiProperty({
    example: 'READY',
    description: 'PENDING | PROCESSING | READY | FAILED',
  })
  status: string;
}
