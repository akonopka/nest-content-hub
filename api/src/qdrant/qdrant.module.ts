import { Global, Module } from '@nestjs/common';
import { QdrantService } from './qdrant.service';

@Global()
@Module({
  exports: [QdrantService],
  providers: [QdrantService],
})
export class QdrantModule {}
