import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PostCreateDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example:
      'NestJS to framework do budowy aplikacji Node.js oparty o TypeScript, korzystający z dependency injection i modułowej architektury inspirowanej Angularem.',
    description: 'Text content to store and make searchable via POST /ask',
  })
  content: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    example: 'test@example.com',
    description: 'Optional, not currently used for post notifications',
  })
  email?: string;
}
