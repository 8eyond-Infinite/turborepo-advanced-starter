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
import {
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  register,
  verifyEmail,
  resendEmailVerification,
} from "./auth";

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

describe("password reset", () => {
  it("validates the request email before calling the API", async () => {
    const data = new FormData();
    data.set("email", "invalid");
    await expect(
      requestPasswordReset({ status: "idle" }, data),
    ).resolves.toMatchObject({
      status: "error",
      fieldErrors: { email: [expect.any(String)] },
    });
    expect(apiFetchPublic).not.toHaveBeenCalled();
  });

  it("returns the same success state after a reset request", async () => {
    apiFetchPublic.mockResolvedValue({ accepted: true });
    const data = new FormData();
    data.set("email", "member@example.com");
    await expect(
      requestPasswordReset({ status: "idle" }, data),
    ).resolves.toEqual({ status: "success" });
    expect(apiFetchPublic).toHaveBeenCalledWith(
      "/auth/password-reset/request",
      expect.any(Object),
    );
  });

  it("does not submit mismatched replacement passwords", async () => {
    const data = new FormData();
    data.set("token", "t".repeat(43));
    data.set("password", "new-password-123");
    data.set("confirmPassword", "different-password");
    await expect(
      resetPassword({ status: "idle" }, data),
    ).resolves.toMatchObject({
      status: "error",
      fieldErrors: { confirmPassword: [expect.any(String)] },
    });
    expect(apiFetchPublic).not.toHaveBeenCalled();
  });

  it("maps an invalid reset token to a safe public message", async () => {
    apiFetchPublic.mockRejectedValue(
      new ApiError({
        kind: "validation",
        status: 400,
        code: "INVALID_PASSWORD_RESET_TOKEN",
        message: "internal",
      }),
    );
    const data = new FormData();
    data.set("token", "t".repeat(43));
    data.set("password", "new-password-123");
    data.set("confirmPassword", "new-password-123");
    await expect(resetPassword({ status: "idle" }, data)).resolves.toEqual({
      status: "error",
      formError: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
    });
  });
});

describe("email verification", () => {
  it("routes a newly unverified account to the check-email page", async () => {
    apiFetchPublic.mockResolvedValue({ emailVerificationRequired: true });
    const data = new FormData();
    data.set("email", "member@example.com");
    data.set("username", "member");
    data.set("password", "new-password-123");
    data.set("confirmPassword", "new-password-123");
    await register({ status: "idle" }, data);
    expect(redirect).toHaveBeenCalledWith(
      "/check-email?email=member%40example.com",
    );
  });

  it("rejects a malformed verification token before calling the API", async () => {
    const data = new FormData();
    data.set("token", "short");
    await expect(verifyEmail({ status: "idle" }, data)).resolves.toMatchObject({
      status: "error",
    });
    expect(apiFetchPublic).not.toHaveBeenCalled();
  });

  it("returns a uniform success state after requesting another link", async () => {
    apiFetchPublic.mockResolvedValue({ accepted: true });
    const data = new FormData();
    data.set("email", "member@example.com");
    await expect(
      resendEmailVerification({ status: "idle" }, data),
    ).resolves.toEqual({ status: "success" });
  });

  it("maps the not-verified login state without exposing backend details", async () => {
    apiFetchPublic.mockRejectedValue(
      new ApiError({
        kind: "forbidden",
        status: 403,
        code: "EMAIL_NOT_VERIFIED",
        message: "internal",
      }),
    );
    const data = new FormData();
    data.set("email", "member@example.com");
    data.set("password", "valid-password");
    data.set("next", "/me");
    await expect(login({ status: "idle" }, data)).resolves.toMatchObject({
      status: "error",
      verificationRequired: true,
      values: { email: "member@example.com" },
    });
  });
});
