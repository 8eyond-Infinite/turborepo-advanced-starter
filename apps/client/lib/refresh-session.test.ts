import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
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

  it("reuses a completed success while the browser applies the new cookie", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const { refreshSessionSingleFlight } = await import("./refresh-session");

    const first = await refreshSessionSingleFlight("grace-refresh-token");
    const lateConcurrent = await refreshSessionSingleFlight(
      "grace-refresh-token",
    );

    expect(lateConcurrent).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(5_001);
    await refreshSessionSingleFlight("grace-refresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retain a failed refresh", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const { refreshSessionSingleFlight } = await import("./refresh-session");

    await expect(
      refreshSessionSingleFlight("failed-refresh-token"),
    ).resolves.toBeNull();
    await expect(
      refreshSessionSingleFlight("failed-refresh-token"),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a malformed success body as a refresh failure", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { refreshSessionSingleFlight } = await import("./refresh-session");

    await expect(
      refreshSessionSingleFlight("malformed-refresh-token"),
    ).resolves.toBeNull();
  });
});
