import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reportApiFailure,
  setApiFailureSinkForTest,
  type ApiFailureEvent,
} from "./observability";

afterEach(() => setApiFailureSinkForTest());

describe("reportApiFailure", () => {
  it("emits a vendor-neutral structured event", () => {
    const sink = vi.fn<(event: ApiFailureEvent) => void>();
    setApiFailureSinkForTest(sink);
    const event: ApiFailureEvent = {
      event: "client.bff.api_failed",
      correlationId: "request-1",
      method: "POST",
      path: "/auth/login",
      kind: "network",
      status: null,
      retryable: true,
      durationMs: 20,
    };
    reportApiFailure(event);
    expect(sink).toHaveBeenCalledWith(event);
  });
});
