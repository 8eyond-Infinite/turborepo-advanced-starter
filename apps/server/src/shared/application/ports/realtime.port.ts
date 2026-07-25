export const REALTIME_PORT = Symbol('REALTIME_PORT');

export interface IRealtimePort {
  sendToUser(userId: string, event: string, payload: unknown): void;
  broadcast(event: string, payload: unknown): void;
}
