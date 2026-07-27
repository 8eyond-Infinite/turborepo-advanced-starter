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

export const configureObservabilitySink = (
  nextSink: ObservabilitySink,
): (() => void) => {
  const previousSink = sink;
  sink = nextSink;
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
