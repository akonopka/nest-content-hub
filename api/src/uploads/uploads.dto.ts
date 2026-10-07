import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional } from 'class-validator';

export class UploadCreateDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Image file to upload (PNG or JPEG, up to 20 MB)',
  })
  file: any;
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    example: 'test@example.com',
    description: 'Optional, not currently used for post notifications',
  })
  email?: string;
}

export class UploadCreateResponseDto {
  @ApiProperty()
  key: string;
}
