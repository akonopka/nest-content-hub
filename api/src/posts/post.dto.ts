import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PostCreateDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
