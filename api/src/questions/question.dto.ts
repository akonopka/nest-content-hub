import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class QuestionCreateDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class QuestionGetDto {
  id: number;
  question: string;
  answer: string | null;
  status: string;
}
