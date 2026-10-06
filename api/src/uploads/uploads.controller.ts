import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('uploads')
export class UploadsController {
  constructor(private s3Service: S3Service) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a file',
    description:
      'Accepts a file as multipart/form-data under the "file" field and stores it in MinIO. Returns the storage key of the saved object.',
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const buffer = file.buffer;
    const mimetype = file.mimetype;

    const key = await this.s3Service.saveFile(buffer, mimetype);

    return { key };
  }
}
