import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureBffObservabilitySink,
  createRateLimitedBffObservabilitySink,
  reportApiFailure,
  type ApiFailureEvent,
  type BffObservabilityEvent,
} from "./observability";

const failure = (
  overrides: Partial<ApiFailureEvent> = {},
): ApiFailureEvent => ({
  event: "client.bff.api_failed",
  correlationId: "request-1",
  method: "GET",
  path: "/users/me",
  kind: "network",
  status: null,
  retryable: true,
  durationMs: 20,
  ...overrides,
});

describe("BFF observability", () => {
  let restoreSink: (() => void) | undefined;

  afterEach(() => {
    restoreSink?.();
    restoreSink = undefined;
  });

  it("emits a vendor-neutral structured event", () => {
    const provider = vi.fn<(event: BffObservabilityEvent) => void>();
    restoreSink = configureBffObservabilitySink(provider);
    const event = failure();

    reportApiFailure(event);

    expect(provider).toHaveBeenCalledWith(event);
  });

  it("isolates a failing telemetry provider from the BFF flow", () => {
    restoreSink = configureBffObservabilitySink(() => {
      throw new Error("provider unavailable");
    });

    expect(() => reportApiFailure(failure())).not.toThrow();
  });

  it("bounds repeated failures and emits logarithmic suppression summaries", () => {
    const provider = vi.fn<(event: BffObservabilityEvent) => void>();
    restoreSink = configureBffObservabilitySink(provider, {
      maxEventsPerFingerprint: 2,
      maxEventsPerWindow: 20,
    });

    for (let index = 0; index < 10; index += 1) {
      reportApiFailure(failure({ correlationId: `request-${index}` }));
    }

    const events = provider.mock.calls.map(([event]) => event);
    expect(
      events.filter((event) => event.event === "client.bff.api_failed"),
    ).toHaveLength(2);
    expect(
      events.filter((event) => event.event.endsWith("suppressed")),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: "fingerprint", suppressedCount: 1 }),
        expect.objectContaining({ scope: "fingerprint", suppressedCount: 2 }),
        expect.objectContaining({ scope: "fingerprint", suppressedCount: 4 }),
        expect.objectContaining({ scope: "fingerprint", suppressedCount: 8 }),
      ]),
    );
  });

  it("bounds distinct failures globally and resets after the window", () => {
    const provider = vi.fn<(event: BffObservabilityEvent) => void>();
    let now = 1_000;
    restoreSink = configureBffObservabilitySink(provider, {
      windowMs: 60_000,
      maxEventsPerWindow: 2,
      maxEventsPerFingerprint: 2,
      now: () => now,
    });

    for (const path of ["/one", "/two", "/three", "/four"]) {
      reportApiFailure(failure({ path }));
    }
    expect(
      provider.mock.calls.filter(
        ([event]) => event.event === "client.bff.api_failed",
      ),
    ).toHaveLength(2);
    expect(provider).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "global", suppressedCount: 1 }),
    );

    now += 60_000;
    reportApiFailure(failure({ path: "/after-reset" }));
    expect(provider).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "/after-reset" }),
    );
  });

  it("rejects an invalid policy during composition", () => {
    expect(() =>
      createRateLimitedBffObservabilitySink(() => undefined, {
        windowMs: 0,
      }),
    ).toThrow("windowMs must be a positive integer");
  });
});
