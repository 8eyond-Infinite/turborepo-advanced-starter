import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("refreshSessionSingleFlight", () => {
  it("shares one backend refresh across concurrent requests", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const { refreshSessionSingleFlight } = await import("./refresh-session");

    const first = refreshSessionSingleFlight("same-refresh-token");
    const second = refreshSessionSingleFlight("same-refresh-token");

    expect(fetchMock).toHaveBeenCalledOnce();
    resolveResponse(
      new Response(
        JSON.stringify({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      { accessToken: "new-access", refreshToken: "new-refresh" },
      { accessToken: "new-access", refreshToken: "new-refresh" },
    ]);
  });
});
