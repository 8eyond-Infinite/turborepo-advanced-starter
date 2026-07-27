import { describe, expect, it } from "vitest";
import { getRouteErrorMessage } from "./route-error.presentation";

describe("route error presentation", () => {
  it("does not expose an unexpected technical error message", () => {
    const message = getRouteErrorMessage(
      new Error("Authorization token was abc-secret"),
    );

    expect(message).not.toContain("abc-secret");
    expect(message).toContain("Trang gặp sự cố");
  });

  it("keeps an actionable message for a missing route resource", () => {
    const message = getRouteErrorMessage({
      status: 404,
      statusText: "Not Found",
      internal: false,
      data: null,
    });

    expect(message).toBe("Trang bạn yêu cầu không tồn tại.");
  });
});
