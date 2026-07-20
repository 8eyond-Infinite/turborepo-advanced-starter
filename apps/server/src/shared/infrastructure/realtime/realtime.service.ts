import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
    constructor(private readonly gateway: RealtimeGateway) {}

    /**
     * Emits a real-time event to all connected sockets of a specific user.
     */
    sendToUser(userId: string, event: string, payload: any): void {
        const socketIds = this.gateway.getSocketsForUser(userId);
        if (socketIds.length > 0 && this.gateway.server) {
            for (const socketId of socketIds) {
                this.gateway.server.to(socketId).emit(event, payload);
            }
        }
    }

    /**
     * Broadcasts a real-time event to all connected users.
     */
    broadcast(event: string, payload: any): void {
        if (this.gateway.server) {
            this.gateway.server.emit(event, payload);
        }
    }
}
