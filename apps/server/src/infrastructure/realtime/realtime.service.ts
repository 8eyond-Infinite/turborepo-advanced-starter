import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { IRealtimePort } from '@shared/application/ports/realtime.port';

@Injectable()
export class RealtimeService implements IRealtimePort {
  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Gửi event tới mọi socket của một user. Emit theo room nên hoạt động
   * xuyên instance khi chạy nhiều replica (nhờ Redis adapter).
   */
  sendToUser(userId: string, event: string, payload: unknown): void {
    if (this.gateway.server) {
      this.gateway.server
        .to(RealtimeGateway.userRoom(userId))
        .emit(event, payload);
    }
  }

  /**
   * Phát event tới tất cả user đang kết nối, trên mọi instance.
   */
  broadcast(event: string, payload: unknown): void {
    if (this.gateway.server) {
      this.gateway.server.emit(event, payload);
    }
  }
}
