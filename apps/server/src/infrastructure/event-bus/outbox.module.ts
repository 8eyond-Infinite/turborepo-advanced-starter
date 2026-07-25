import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxPublisherService } from './outbox/outbox-publisher.service';
import { OutboxEventRouter } from './outbox/outbox-event.router';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [OutboxEventRouter, OutboxPublisherService],
  exports: [OutboxPublisherService],
})
export class OutboxModule {}
