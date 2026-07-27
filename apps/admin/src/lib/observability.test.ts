import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import {
  configureObservabilitySink,
  reportError,
  type ErrorReport,
} from "./observability";

describe("frontend observability adapter", () => {
  let restoreSink: (() => void) | undefined;

  afterEach(() => {
    restoreSink?.();
    restoreSink = undefined;
  });

  it("emits a structured report and keeps the backend correlation ID", () => {
    const sink = vi.fn<(report: ErrorReport) => void>();
    restoreSink = configureObservabilitySink(sink);
    const error = new ApiError("Service unavailable", 503, {
      correlationId: "correlation-123",
    });

    const incidentId = reportError(error, {
      source: "route",
      route: "/users",
      operation: "render-route",
    });

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        id: incidentId,
        source: "route",
        route: "/users",
        operation: "render-route",
        correlationId: "correlation-123",
        message: "Service unavailable",
      }),
    );
  });

  it("redacts bearer tokens, JWTs and sensitive assignments", () => {
    const sink = vi.fn<(report: ErrorReport) => void>();
    restoreSink = configureObservabilitySink(sink);

    reportError(
      new Error(
        "authorization=top-secret Bearer access-value token=refresh-value eyJabc.def.ghi",
      ),
      { source: "application" },
    );

    const report = sink.mock.calls[0]?.[0];
    expect(report?.message).not.toContain("top-secret");
    expect(report?.message).not.toContain("access-value");
    expect(report?.message).not.toContain("refresh-value");
    expect(report?.message).not.toContain("eyJabc.def.ghi");
    expect(report?.message).toContain("[REDACTED]");
  });

  it("does not let a failing telemetry provider break the caller", () => {
    restoreSink = configureObservabilitySink(() => {
      throw new Error("provider unavailable");
    });

    expect(() =>
      reportError(new Error("render failed"), { source: "application" }),
    ).not.toThrow();
  });
});
