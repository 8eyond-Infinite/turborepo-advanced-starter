export const REALTIME_PORT = Symbol('RealtimePort');

export interface IRealtimePort {
    sendToUser(userId: string, event: string, payload: any): void;
    broadcast(event: string, payload: any): void;
}
