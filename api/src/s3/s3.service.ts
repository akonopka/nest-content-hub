import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
  NoSuchKey,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly client: S3Client;
  private readonly logger: Logger;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.MINIO_S3_ENDPOINT!,
      region: process.env.MINIO_REGION!,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER!,
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
      },
    });
    this.logger = new Logger(S3Service.name);
  }
  async onModuleInit() {
    const headBucketCommandInput = {
      Bucket: process.env.MINIO_BUCKET!,
    };

    try {
      const headBucketCommand = new HeadBucketCommand(headBucketCommandInput);
      const response = await this.client.send(headBucketCommand);
      if (response.BucketRegion) {
        this.logger.log('Bucket already exists.');
      }
    } catch (error) {
      if (
        error instanceof Error &&
        '$metadata' in error &&
        typeof error.$metadata === 'object' &&
        error.$metadata &&
        'httpStatusCode' in error.$metadata &&
        error.$metadata.httpStatusCode === 404
      ) {
        this.logger.log('Bucket does not exist.');

        const createBucketCommandInput = {
          Bucket: process.env.MINIO_BUCKET!,
          CreateBucketConfiguration: {
            Tags: [{ Key: 'Name', Value: process.env.MINIO_BUCKET_TAG! }],
          },
        };

        const createBucketCommand = new CreateBucketCommand(
          createBucketCommandInput,
        );

        await this.client.send(createBucketCommand);
      } else {
        throw error;
      }
    }
  }

  async saveFile(buffer: Buffer, mimeType: string): Promise<string> {
    const key = crypto.randomUUID();

    const input = {
      Bucket: process.env.MINIO_BUCKET!,
      Body: buffer,
      ContentType: mimeType,
      Key: key,
    };

    const putObjectCommand = new PutObjectCommand(input);
    await this.client.send(putObjectCommand);

    return key;
  }

  async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const input = {
      Bucket: process.env.MINIO_BUCKET!,
      Key: key,
    };

    const getObjectCommand = new GetObjectCommand(input);
    let response: GetObjectCommandOutput;

    try {
      response = await this.client.send(getObjectCommand);
    } catch (error) {
      if (error instanceof NoSuchKey) {
        throw new NotFoundException();
      }
      throw error;
    }

    const body = response.Body;
    let mimeType = response.ContentType;

    if (!body) {
      throw new Error(`Empty response body for key ${key}`);
    }

    if (!mimeType) {
      mimeType = 'application/octet-stream';
    }

    const bytes = await body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    return { buffer, mimeType };
  }
}
