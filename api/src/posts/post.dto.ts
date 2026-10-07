import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class PostCreateDto {
  @IsString()
  @ApiProperty({
    example:
      'NestJS to framework do budowy aplikacji Node.js oparty o TypeScript, korzystający z dependency injection i modułowej architektury inspirowanej Angularem.',
    description: 'Text content to store and make searchable via POST /ask',
  })
  content?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    example: 'test@example.com',
    description: 'Optional, not currently used for post notifications',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '',
    description: 'Optional, used only for non-text posts',
  })
  filePath?: string;

  @IsString()
  @ApiProperty({
    example: 'text/plain',
    description: 'MIME type of the post content',
  })
  contentType: string;
}
