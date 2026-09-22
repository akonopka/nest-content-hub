import { Global, Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';

@Global()
@Module({
  exports: [OllamaService],
  providers: [OllamaService],
})
export class OllamaModule {}
