import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { PostCreatedEvent } from '../posts/posts.service';
import type { QuestionAskedEvent } from '../ask/ask.service';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('RABBITMQ_EMBEDDING_CLIENT')
    private readonly rabbitMQEmbeddingClient: ClientProxy,
    @Inject('RABBITMQ_ASK_CLIENT')
    private readonly rabbitMQAskClient: ClientProxy,
  ) {}

  async sendToQueue(
    pattern: string,
    data: PostCreatedEvent | QuestionAskedEvent,
    client: ClientProxy,
  ) {
    try {
      await firstValueFrom(client.emit(pattern, data));
    } catch (err) {
      console.error('Failed to send to queue:', err);
    }
  }
  sendToEmbeddingQueue(pattern: string, data: PostCreatedEvent) {
    return this.sendToQueue(pattern, data, this.rabbitMQEmbeddingClient);
  }
  sendToAskQueue(pattern: string, data: QuestionAskedEvent) {
    return this.sendToQueue(pattern, data, this.rabbitMQAskClient);
  }
}
