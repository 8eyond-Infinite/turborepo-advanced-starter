import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DomainEventDispatcher } from '@shared/application/events/domain-event-dispatcher';

@Global()
@Module({
    imports: [CqrsModule],
    providers: [DomainEventDispatcher],
    exports: [DomainEventDispatcher],
})
export class EventDispatcherModule {}
