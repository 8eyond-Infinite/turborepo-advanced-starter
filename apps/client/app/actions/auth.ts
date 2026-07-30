"use server";

import { redirect } from "next/navigation";
import { API_URL, ApiError, apiFetchPublic, toPublicApiError } from "@/lib/api";
import type { ActionState } from "@/lib/action-state";
import { clearSession, getSession, setSession } from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";

type LoginField = "email" | "password";
type LoginValues = { email: string };
export type LoginState = ActionState<LoginField, LoginValues>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/me");
  const fieldErrors: Partial<Record<LoginField, string[]>> = {};
  if (!EMAIL_PATTERN.test(email))
    fieldErrors.email = ["Hãy nhập một địa chỉ email hợp lệ."];
  if (password.length < 6)
    fieldErrors.password = ["Mật khẩu phải có ít nhất 6 ký tự."];
  if (Object.keys(fieldErrors).length > 0)
    return { status: "error", fieldErrors, values: { email } };

  try {
    const tokens = await apiFetchPublic<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setSession(tokens);
  } catch (error) {
    if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS")
      return {
        status: "error",
        formError: "Email hoặc mật khẩu không đúng.",
        values: { email },
      };
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
      values: { email },
    };
  }

  redirect(safeRedirectPath(next));
}

export async function logout(): Promise<void> {
  const session = await getSession();
  try {
    if (session) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.refreshToken}` },
        cache: "no-store",
      }).catch(() => null);
    }
  } finally {
    await clearSession();
  }
  redirect("/");
}
