import {
  Body,
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
import { PostsService } from '../posts/posts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { type Response } from 'express';
import { UploadCreateDto, UploadCreateResponseDto } from './uploads.dto';

@Controller('uploads')
export class UploadsController {
  constructor(
    private s3Service: S3Service,
    private postsService: PostsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Upload a file',
    description:
      'Accepts a file as multipart/form-data under the "file" field and stores it in MinIO. Returns the storage key of the saved object.',
  })
  @ApiBody({
    type: UploadCreateDto,
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'File uploaded',
    type: UploadCreateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'File is too large or has an unsupported type',
  })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize:
              parseInt(process.env.MAX_UPLOAD_FILE_SIZE_MB!) * 1024 * 1024,
          }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadCreateDto,
  ) {
    const buffer = file.buffer;
    const mimetype = file.mimetype;

    const key = await this.s3Service.saveFile(buffer, mimetype);
    await this.postsService.create({
      filePath: key,
      contentType: mimetype,
      email: dto.email,
    });

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
