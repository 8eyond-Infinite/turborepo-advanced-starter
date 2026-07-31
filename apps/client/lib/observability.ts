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

export interface ApiFailureSuppressionEvent {
  event: "client.bff.api_failures_suppressed";
  scope: "fingerprint" | "global";
  suppressedCount: number;
  windowMs: number;
  method?: string;
  path?: string;
  kind?: string;
  status?: number | null;
}

export type BffObservabilityEvent =
  | ApiFailureEvent
  | ApiFailureSuppressionEvent;
export type BffObservabilitySink = (event: BffObservabilityEvent) => void;

export interface BffObservabilityRateLimitOptions {
  windowMs?: number;
  maxEventsPerWindow?: number;
  maxEventsPerFingerprint?: number;
  now?: () => number;
}

const consoleSink: BffObservabilitySink = (event) =>
  console.error(JSON.stringify({ level: "error", ...event }));

const requirePositiveInteger = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const isPowerOfTwo = (value: number): boolean =>
  value > 0 && (value & (value - 1)) === 0;

const emitSafely = (
  nextSink: BffObservabilitySink,
  event: BffObservabilityEvent,
): void => {
  try {
    nextSink(event);
  } catch {
    // Telemetry failure must not turn an API failure into a BFF failure.
  }
};

export const createRateLimitedBffObservabilitySink = (
  nextSink: BffObservabilitySink,
  options: BffObservabilityRateLimitOptions = {},
): BffObservabilitySink => {
  const windowMs = requirePositiveInteger(
    options.windowMs ?? 60_000,
    "windowMs",
  );
  const maxEventsPerWindow = requirePositiveInteger(
    options.maxEventsPerWindow ?? 100,
    "maxEventsPerWindow",
  );
  const maxEventsPerFingerprint = requirePositiveInteger(
    options.maxEventsPerFingerprint ?? 5,
    "maxEventsPerFingerprint",
  );
  const now = options.now ?? Date.now;
  let windowStartedAt = now();
  let emittedInWindow = 0;
  let globallySuppressed = 0;
  const fingerprintCounts = new Map<string, number>();
  const fingerprintSuppressed = new Map<string, number>();

  return (event) => {
    if (event.event !== "client.bff.api_failed") {
      emitSafely(nextSink, event);
      return;
    }

    const currentTime = now();
    if (
      currentTime < windowStartedAt ||
      currentTime - windowStartedAt >= windowMs
    ) {
      windowStartedAt = currentTime;
      emittedInWindow = 0;
      globallySuppressed = 0;
      fingerprintCounts.clear();
      fingerprintSuppressed.clear();
    }

    const fingerprint = JSON.stringify([
      event.method,
      event.path,
      event.kind,
      event.status,
    ]);
    const fingerprintCount = fingerprintCounts.get(fingerprint) ?? 0;

    if (fingerprintCount >= maxEventsPerFingerprint) {
      const suppressed = (fingerprintSuppressed.get(fingerprint) ?? 0) + 1;
      fingerprintSuppressed.set(fingerprint, suppressed);
      if (isPowerOfTwo(suppressed)) {
        emitSafely(nextSink, {
          event: "client.bff.api_failures_suppressed",
          scope: "fingerprint",
          suppressedCount: suppressed,
          windowMs,
          method: event.method,
          path: event.path,
          kind: event.kind,
          status: event.status,
        });
      }
      return;
    }

    if (emittedInWindow >= maxEventsPerWindow) {
      globallySuppressed += 1;
      if (isPowerOfTwo(globallySuppressed)) {
        emitSafely(nextSink, {
          event: "client.bff.api_failures_suppressed",
          scope: "global",
          suppressedCount: globallySuppressed,
          windowMs,
        });
      }
      return;
    }

    emittedInWindow += 1;
    fingerprintCounts.set(fingerprint, fingerprintCount + 1);
    emitSafely(nextSink, event);
  };
};

let sink: BffObservabilitySink =
  createRateLimitedBffObservabilitySink(consoleSink);

export const configureBffObservabilitySink = (
  nextSink: BffObservabilitySink,
  options?: BffObservabilityRateLimitOptions,
): (() => void) => {
  const previousSink = sink;
  sink = createRateLimitedBffObservabilitySink(nextSink, options);
  return () => {
    sink = previousSink;
  };
};

export const reportApiFailure = (event: ApiFailureEvent): void => sink(event);
