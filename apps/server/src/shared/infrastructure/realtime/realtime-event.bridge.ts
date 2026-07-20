import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { REALTIME_PORT } from '../../domain/ports/realtime.port';
import type { IRealtimePort } from '../../domain/ports/realtime.port';
import type { IRealtimeEvent } from '../../domain/events/realtime-event.interface';

@Injectable()
export class RealtimeEventBridge implements OnModuleInit {
    private readonly logger = new Logger(RealtimeEventBridge.name);

    constructor(
        private readonly eventBus: EventBus,
        @Inject(REALTIME_PORT)
        private readonly realtime: IRealtimePort,
    ) {}

    onModuleInit() {
        this.logger.log('Initializing Realtime Event Bridge to listen to all Domain Events...');
        
        this.eventBus.subject$.subscribe({
            next: (event) => {
                if (this.isRealtimeEvent(event)) {
                    const eventName = event.getRealtimeEventName();
                    const userId = event.getTargetUserId();
                    const payload = event.toRealtimePayload();

                    this.logger.log(`Bridging Domain Event to Realtime: Event='${eventName}' TargetUser='${userId || 'ALL'}'`);

                    try {
                        if (userId) {
                            this.realtime.sendToUser(userId, eventName, payload);
                        } else {
                            this.realtime.broadcast(eventName, payload);
                        }
                    } catch (error: any) {
                        this.logger.error(`Failed to bridge event '${eventName}' to WebSockets: ${error.message}`);
                    }
                }
            },
            error: (err) => {
                this.logger.error(`Error in event stream: ${err.message}`);
            }
        });
    }

    private isRealtimeEvent(event: any): event is IRealtimeEvent {
        return event && typeof event.getRealtimeEventName === 'function';
    }
}
