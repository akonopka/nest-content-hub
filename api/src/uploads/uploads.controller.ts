import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type Response } from 'express';

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
  @ApiResponse({
    status: 400,
    description: 'File is too large or has an unsupported type',
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const buffer = file.buffer;
    const mimetype = file.mimetype;

    const key = await this.s3Service.saveFile(buffer, mimetype);

    return { key };
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Download an uploaded file',
    description:
      'Returns the file previously stored under this key by POST /uploads, with its original Content-Type.',
  })
  @ApiResponse({
    status: 200,
    description: 'File found and returned',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiResponse({ status: 400, description: 'Key is not a valid UUID' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async get(
    @Param('key', ParseUUIDPipe) key: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const response = await this.s3Service.getFile(key);
    const buffer = response.buffer;
    const mimeType = response.mimeType;

    res.set('Content-Type', mimeType);

    return new StreamableFile(buffer);
  }
}
