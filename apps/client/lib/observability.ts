import "server-only";

export interface ApiFailureEvent {
  event: "client.bff.api_failed";
  correlationId: string;
  method: string;
  path: string;
  kind: string;
  status: number | null;
  retryable: boolean;
  durationMs: number;
}

type EventSink = (event: ApiFailureEvent) => void;
const consoleSink: EventSink = (event) =>
  console.error(JSON.stringify({ level: "error", ...event }));
let sink: EventSink = consoleSink;

export const reportApiFailure = (event: ApiFailureEvent): void => sink(event);
export const setApiFailureSinkForTest = (next?: EventSink): void => {
  sink = next ?? consoleSink;
};
