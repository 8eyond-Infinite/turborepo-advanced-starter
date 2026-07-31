import { ApiError } from "./api-client";

export type ErrorSource = "application" | "route" | "auth" | "realtime";

export interface ErrorReport {
  id: string;
  occurredAt: string;
  source: ErrorSource;
  name: string;
  message: string;
  stack?: string;
  route?: string;
  operation?: string;
  correlationId?: string;
  componentStack?: string;
}

export interface ErrorReportContext {
  source: ErrorSource;
  route?: string;
  operation?: string;
  correlationId?: string;
  componentStack?: string | null;
}

export type ObservabilitySink = (report: ErrorReport) => void;

export interface ObservabilityRateLimitOptions {
  windowMs?: number;
  maxReportsPerWindow?: number;
  maxReportsPerFingerprint?: number;
  now?: () => number;
}

const REDACTED = "[REDACTED]";
const BEARER_TOKEN_PATTERN = /\bBearer\s+\S+/gi;
const JWT_PATTERN = /\beyJ[\w-]*\.[\w-]+\.[\w-]+\b/g;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(password|secret|token|authorization|cookie)\s*[:=]\s*([^\s,;]+)/gi;

const redact = (value: string): string =>
  value
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(
      SENSITIVE_ASSIGNMENT_PATTERN,
      (_match, key: string) => `${key}=${REDACTED}`,
    );

const createIncidentId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `incident-${Date.now()}`;
};

const defaultSink: ObservabilitySink = (report) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ErrorReport>("admin:observability-error", {
        detail: report,
      }),
    );
  }

  if (import.meta.env.DEV) {
    console.error("[AdminObservability]", report);
  }
};

let sink: ObservabilitySink = defaultSink;

const requirePositiveInteger = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

export const createRateLimitedObservabilitySink = (
  nextSink: ObservabilitySink,
  options: ObservabilityRateLimitOptions = {},
): ObservabilitySink => {
  const windowMs = requirePositiveInteger(
    options.windowMs ?? 60_000,
    "windowMs",
  );
  const maxReportsPerWindow = requirePositiveInteger(
    options.maxReportsPerWindow ?? 50,
    "maxReportsPerWindow",
  );
  const maxReportsPerFingerprint = requirePositiveInteger(
    options.maxReportsPerFingerprint ?? 5,
    "maxReportsPerFingerprint",
  );
  const now = options.now ?? Date.now;
  let windowStartedAt = now();
  let reportsInWindow = 0;
  const fingerprintCounts = new Map<string, number>();

  return (report) => {
    const currentTime = now();
    if (
      currentTime < windowStartedAt ||
      currentTime - windowStartedAt >= windowMs
    ) {
      windowStartedAt = currentTime;
      reportsInWindow = 0;
      fingerprintCounts.clear();
    }

    const fingerprint = JSON.stringify([
      report.source,
      report.name,
      report.message,
      report.route ?? "",
      report.operation ?? "",
    ]);
    const fingerprintCount = fingerprintCounts.get(fingerprint) ?? 0;
    if (
      reportsInWindow >= maxReportsPerWindow ||
      fingerprintCount >= maxReportsPerFingerprint
    ) {
      return;
    }

    reportsInWindow += 1;
    fingerprintCounts.set(fingerprint, fingerprintCount + 1);
    nextSink(report);
  };
};

export const configureObservabilitySink = (
  nextSink: ObservabilitySink,
  rateLimitOptions?: ObservabilityRateLimitOptions,
): (() => void) => {
  const previousSink = sink;
  sink = createRateLimitedObservabilitySink(nextSink, rateLimitOptions);
  return () => {
    sink = previousSink;
  };
};

export const reportError = (
  error: unknown,
  context: ErrorReportContext,
): string => {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));
  const correlationId =
    context.correlationId ??
    (error instanceof ApiError ? error.correlationId : undefined);
  const report: ErrorReport = {
    id: createIncidentId(),
    occurredAt: new Date().toISOString(),
    source: context.source,
    name: normalizedError.name,
    message: redact(normalizedError.message),
    ...(normalizedError.stack
      ? { stack: redact(normalizedError.stack) }
      : undefined),
    ...(context.route ? { route: context.route } : undefined),
    ...(context.operation ? { operation: context.operation } : undefined),
    ...(correlationId ? { correlationId } : undefined),
    ...(context.componentStack
      ? { componentStack: redact(context.componentStack) }
      : undefined),
  };

  try {
    sink(report);
  } catch {
    // Observability must never break the user flow or recursively report itself.
  }

  return report.id;
};
