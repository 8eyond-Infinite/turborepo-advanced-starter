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
import type { JwtPayload } from '@repo/contracts';
import { parseCorsOrigins } from '../../config/environment';

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
  ) {}

  // Redis adapter cho phép chạy nhiều API instance: emit từ instance này
  // được phát tới socket đang nối vào instance khác qua Redis pub/sub.
  afterInit(server: Server): void {
    this.pubClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.configService.get<number>('REDIS_PORT', 6380)),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
    });
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
    try {
      const authHeader = client.handshake.headers.authorization;
      const authToken =
        typeof client.handshake.auth?.token === 'string'
          ? client.handshake.auth.token
          : undefined;
      const queryToken =
        typeof client.handshake.query.token === 'string'
          ? client.handshake.query.token
          : undefined;

      // Browser clients use Socket.IO's auth payload. Header is supported for
      // non-browser clients; query remains a temporary compatibility fallback.
      // Never require a bearer token in the URL because proxies may log it.
      let token = authToken ?? queryToken;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (!token) {
        this.logger.warn(
          `Disconnecting socket ${client.id}: No auth token provided`,
        );
        client.disconnect(true);
        return;
      }

      const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(
          `Disconnecting socket ${client.id}: Invalid token payload`,
        );
        client.disconnect(true);
        return;
      }

      // Mỗi user một room: emit theo room hoạt động xuyên instance nhờ
      // Redis adapter, không cần tự theo dõi socket id trong bộ nhớ.
      (client.data as { userId?: string }).userId = userId;
      void client.join(RealtimeGateway.userRoom(userId));

      this.logger.log(`User ${userId} connected on socket ${client.id}`);
    } catch {
      this.logger.warn(
        `Disconnecting socket ${client.id}: Authentication failed`,
      );
      client.disconnect(true);
    }
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
}
