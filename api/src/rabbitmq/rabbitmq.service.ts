import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('RABBITMQ_CLIENT') private readonly rabbitMQClient: ClientProxy,
  ) {}

  async sendToQueue(pattern: string, data: unknown) {
    try {
      await firstValueFrom(this.rabbitMQClient.emit(pattern, data));
    } catch (err) {
      console.error('Failed to send to queue:', err);
    }
  }
}
