import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, clearSession, getSession } = vi.hoisted(() => ({
  redirect: vi.fn(),
  clearSession: vi.fn<() => Promise<void>>(),
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/session", () => ({
  clearSession,
  getSession,
  setSession: vi.fn(),
}));

import { logout } from "./auth";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  clearSession.mockResolvedValue();
});

describe("logout", () => {
  it("revokes the backend refresh session before clearing the BFF cookie", async () => {
    getSession.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer refresh" },
      }),
    );
    expect(clearSession).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("still clears the cookie when the backend is unavailable", async () => {
    getSession.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
    });
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await logout();

    expect(clearSession).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
