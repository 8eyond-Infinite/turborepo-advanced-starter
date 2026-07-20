import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(RealtimeGateway.name);
    // Maps userId -> Set of Socket IDs
    private readonly activeConnections = new Map<string, Set<string>>();
    // Maps socketId -> userId
    private readonly socketUsers = new Map<string, string>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const authHeader = client.handshake.headers.authorization;
            const queryToken = client.handshake.query.token as string | undefined;
            
            let token = queryToken;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }

            if (!token) {
                this.logger.warn(`Disconnecting socket ${client.id}: No auth token provided`);
                client.disconnect(true);
                return;
            }

            const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'secret';
            const payload = this.jwtService.verify(token, { secret });
            const userId = payload.sub;

            if (!userId) {
                this.logger.warn(`Disconnecting socket ${client.id}: Invalid token payload`);
                client.disconnect(true);
                return;
            }

            // Bind socket to user
            this.socketUsers.set(client.id, userId);
            if (!this.activeConnections.has(userId)) {
                this.activeConnections.set(userId, new Set());
            }
            this.activeConnections.get(userId)!.add(client.id);

            this.logger.log(`User ${userId} connected on socket ${client.id}`);
        } catch (error) {
            this.logger.warn(`Disconnecting socket ${client.id}: Authentication failed`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.socketUsers.get(client.id);
        if (userId) {
            this.socketUsers.delete(client.id);
            const userSockets = this.activeConnections.get(userId);
            if (userSockets) {
                userSockets.delete(client.id);
                if (userSockets.size === 0) {
                    this.activeConnections.delete(userId);
                }
            }
            this.logger.log(`Socket ${client.id} disconnected from user ${userId}`);
        }
    }

    getSocketsForUser(userId: string): string[] {
        const sockets = this.activeConnections.get(userId);
        return sockets ? Array.from(sockets) : [];
    }
}
