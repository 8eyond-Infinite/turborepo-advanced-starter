export interface IRealtimeEvent {
    getRealtimeEventName(): string;
    getTargetUserId(): string | null;
    toRealtimePayload(): any;
}
