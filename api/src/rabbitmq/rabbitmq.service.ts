import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import type { PostCreatedEvent } from '../posts/posts.service';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly rabbitMQClient: ClientProxy,
  ) {}

  async sendToQueue(pattern: string, data: PostCreatedEvent) {
    try {
      await firstValueFrom(this.rabbitMQClient.emit(pattern, data));
    } catch (err) {
      console.error('Failed to send to queue:', err);
    }
  }
}
