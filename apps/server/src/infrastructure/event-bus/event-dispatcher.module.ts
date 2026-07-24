import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DomainEventDispatcher } from './domain-event-dispatcher';

@Global()
@Module({
    imports: [CqrsModule],
    providers: [DomainEventDispatcher],
    exports: [DomainEventDispatcher],
})
export class EventDispatcherModule {}
