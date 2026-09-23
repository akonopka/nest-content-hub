import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
