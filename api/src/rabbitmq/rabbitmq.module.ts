import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_EMBEDDING_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL!],
          queue: process.env.EMBEDDING_QUEUE!,
          queueOptions: {
            durable: false,
          },
        },
      },
      {
        name: 'RABBITMQ_ASK_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL!],
          queue: process.env.ASK_QUEUE!,
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
