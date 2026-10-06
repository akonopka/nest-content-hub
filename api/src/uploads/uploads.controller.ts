import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('uploads')
export class UploadsController {
  constructor(private s3Service: S3Service) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const buffer = file.buffer;
    const mimetype = file.mimetype;

    const key = await this.s3Service.saveFile(buffer, mimetype);

    return { key };
  }
}
