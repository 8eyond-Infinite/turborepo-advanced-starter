import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import {
  configureObservabilitySink,
  createRateLimitedObservabilitySink,
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

  it("limits repeated incidents by stable fingerprint", () => {
    const provider = vi.fn<(report: ErrorReport) => void>();
    let now = 1_000;
    restoreSink = configureObservabilitySink(provider, {
      windowMs: 60_000,
      maxReportsPerWindow: 10,
      maxReportsPerFingerprint: 2,
      now: () => now,
    });

    for (let index = 0; index < 3; index += 1) {
      reportError(new Error("socket disconnected"), {
        source: "realtime",
        operation: "socket-error",
        correlationId: `correlation-${index}`,
      });
    }
    expect(provider).toHaveBeenCalledTimes(2);

    now += 60_000;
    reportError(new Error("socket disconnected"), {
      source: "realtime",
      operation: "socket-error",
    });
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it("limits total distinct incidents in one window", () => {
    const provider = vi.fn<(report: ErrorReport) => void>();
    restoreSink = configureObservabilitySink(provider, {
      maxReportsPerWindow: 2,
      maxReportsPerFingerprint: 2,
    });

    for (const message of ["first", "second", "third"]) {
      reportError(new Error(message), { source: "application" });
    }

    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid rate-limit policy during composition", () => {
    expect(() =>
      createRateLimitedObservabilitySink(() => undefined, {
        maxReportsPerWindow: 0,
      }),
    ).toThrow("maxReportsPerWindow must be a positive integer");
  });
});
