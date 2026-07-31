import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, clearSession, getSession, setSession, apiFetchPublic } =
  vi.hoisted(() => ({
    redirect: vi.fn(),
    clearSession: vi.fn<() => Promise<void>>(),
    getSession: vi.fn(),
    setSession: vi.fn(),
    apiFetchPublic: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetchPublic };
});
vi.mock("@/lib/session", () => ({
  clearSession,
  getSession,
  setSession,
}));

import { ApiError } from "@/lib/api";
import { login, logout } from "./auth";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.clearAllMocks();
  clearSession.mockResolvedValue();
});

describe("login", () => {
  const form = (email: string, password: string, next = "/me") => {
    const data = new FormData();
    data.set("email", email);
    data.set("password", password);
    data.set("next", next);
    return data;
  };

  it("returns typed field errors without calling the API", async () => {
    await expect(
      login({ status: "idle" }, form("bad", "123")),
    ).resolves.toMatchObject({
      status: "error",
      fieldErrors: {
        email: [expect.any(String)],
        password: [expect.any(String)],
      },
    });
    expect(apiFetchPublic).not.toHaveBeenCalled();
  });

  it("maps invalid credentials without exposing backend details", async () => {
    apiFetchPublic.mockRejectedValue(
      new ApiError({
        kind: "unauthenticated",
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "internal",
      }),
    );
    const result = await login(
      { status: "idle" },
      form("member@example.com", "wrong-password"),
    );
    expect(result).toEqual({
      status: "error",
      formError: "Email hoặc mật khẩu không đúng.",
      values: { email: "member@example.com" },
    });
  });

  it("sets the session then redirects outside the API catch block", async () => {
    apiFetchPublic.mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
    });
    await login(
      { status: "idle" },
      form("member@example.com", "password", "//evil.example"),
    );
    expect(setSession).toHaveBeenCalledWith({
      accessToken: "access",
      refreshToken: "refresh",
    });
    expect(redirect).toHaveBeenCalledWith("/me");
  });
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
