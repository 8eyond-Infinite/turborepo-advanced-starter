import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { REALTIME_AUTH_ERROR_CODE } from '@repo/contracts';
import type { JwtPayload } from '@shared/application/auth/jwt-payload';
import { parseCorsOrigins } from '../../config/environment';
import { buildRedisConnection } from '../cache/redis-connection';
import { AccessTokenValidator } from '@iam/auth/application/services/access-token-validator.service';

// Decorator options are evaluated at import time; main.ts loads dotenv first
// so CORS_ORIGINS is available here. Same allowlist as the HTTP layer —
// '*' would bypass the app's CORS policy entirely.
@WebSocketGateway({
  cors: {
    origin: parseCorsOrigins(process.env.CORS_ORIGINS ?? ''),
    credentials: true,
  },
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationShutdown
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accessTokenValidator: AccessTokenValidator,
  ) {}

  // Redis adapter cho phép chạy nhiều API instance: emit từ instance này
  // được phát tới socket đang nối vào instance khác qua Redis pub/sub.
  afterInit(server: Server): void {
    server.use((client, next) => {
      void this.authenticate(client).then(
        () => next(),
        () => next(this.authenticationError()),
      );
    });
    this.pubClient = new Redis(buildRedisConnection(this.configService));
    this.subClient = this.pubClient.duplicate();
    server.adapter(createAdapter(this.pubClient, this.subClient));
    this.logger.log('Socket.IO Redis adapter attached');
  }

  // onApplicationShutdown chạy SAU khi WebSocket server đã đóng — đóng
  // pub/sub sớm hơn (onModuleDestroy) sẽ làm adapter dùng kết nối đã chết.
  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.pubClient?.quit(), this.subClient?.quit()]);
  }

  handleConnection(client: Socket): void {
    const userId = (client.data as { userId: string }).userId;
    void client.join(RealtimeGateway.userRoom(userId));
    this.logger.log(`User ${userId} connected on socket ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: string }).userId;
    if (userId) {
      this.logger.log(`Socket ${client.id} disconnected from user ${userId}`);
    }
  }

  static userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private async authenticate(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Rejecting socket ${client.id}: No auth token provided`);
      throw this.authenticationError();
    }

    try {
      const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      const principal = await this.accessTokenValidator.validate(payload);
      if (!principal) {
        throw this.authenticationError();
      }
      (client.data as { userId?: string }).userId = principal.id;
    } catch {
      this.logger.warn(`Rejecting socket ${client.id}: Authentication failed`);
      throw this.authenticationError();
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    const queryToken =
      typeof client.handshake.query.token === 'string'
        ? client.handshake.query.token
        : undefined;

    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length);
    }
    return authToken ?? queryToken;
  }

  private authenticationError(): Error & { data: { code: string } } {
    return Object.assign(new Error('Authentication failed'), {
      data: { code: REALTIME_AUTH_ERROR_CODE },
    });
  }
}
