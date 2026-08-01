"use server";

import { redirect } from "next/navigation";
import { API_URL, ApiError, apiFetchPublic, toPublicApiError } from "@/lib/api";
import type { ActionState } from "@/lib/action-state";
import { clearSession, getSession, setSession } from "@/lib/session";
import { safeRedirectPath } from "@/lib/safe-redirect";

type LoginField = "email" | "password";
type LoginValues = { email: string };
export type LoginState = ActionState<LoginField, LoginValues> & {
  verificationRequired?: boolean;
};
export type RegisterState = ActionState<
  "email" | "username" | "password" | "confirmPassword",
  { email: string; username: string }
>;
export type VerifyEmailState = ActionState;
export type ResendVerificationState = ActionState<"email", LoginValues>;
type EmailField = "email";
type PasswordResetField = "password" | "confirmPassword";
export type RequestPasswordResetState = ActionState<EmailField, LoginValues>;
export type ResetPasswordState = ActionState<PasswordResetField>;

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
    if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED")
      return {
        status: "error",
        formError: "Email chưa được xác minh.",
        values: { email },
        verificationRequired: true,
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

export async function register(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors: Record<string, string[]> = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = ["Email không hợp lệ."];
  if (username.length < 3)
    fieldErrors.username = ["Tên hiển thị cần ít nhất 3 ký tự."];
  if (password.length < 12)
    fieldErrors.password = ["Mật khẩu phải có ít nhất 12 ký tự."];
  if (password !== confirmPassword)
    fieldErrors.confirmPassword = ["Hai mật khẩu chưa trùng nhau."];
  if (Object.keys(fieldErrors).length)
    return { status: "error", fieldErrors, values: { email, username } };

  let verificationRequired = false;
  try {
    const response = await apiFetchPublic<{
      emailVerificationRequired: boolean;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    });
    verificationRequired = response.emailVerificationRequired;
  } catch (error) {
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
      values: { email, username },
    };
  }
  redirect(
    verificationRequired
      ? `/check-email?email=${encodeURIComponent(email)}`
      : "/login?registered=1",
  );
}

export async function verifyEmail(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const token = String(formData.get("token") ?? "");
  if (token.length < 32)
    return {
      status: "error",
      formError: "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
    };
  try {
    await apiFetchPublic("/auth/email-verification/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    return { status: "success" };
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "INVALID_EMAIL_VERIFICATION_TOKEN"
    )
      return {
        status: "error",
        formError: "Liên kết xác minh không hợp lệ hoặc đã hết hạn.",
      };
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
    };
  }
}

export async function resendEmailVerification(
  _prev: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email))
    return {
      status: "error",
      fieldErrors: { email: ["Email không hợp lệ."] },
      values: { email },
    };
  try {
    await apiFetchPublic("/auth/email-verification/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { status: "success" };
  } catch (error) {
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
      values: { email },
    };
  }
}

export async function requestPasswordReset(
  _prev: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      fieldErrors: { email: ["Hãy nhập một địa chỉ email hợp lệ."] },
      values: { email },
    };
  }

  try {
    await apiFetchPublic("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { status: "success" };
  } catch (error) {
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
      values: { email },
    };
  }
}

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors: Partial<Record<PasswordResetField, string[]>> = {};
  if (password.length < 12)
    fieldErrors.password = ["Mật khẩu phải có ít nhất 12 ký tự."];
  if (confirmPassword !== password)
    fieldErrors.confirmPassword = ["Hai mật khẩu chưa trùng nhau."];
  if (Object.keys(fieldErrors).length > 0)
    return { status: "error", fieldErrors };
  if (token.length < 32)
    return {
      status: "error",
      formError: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
    };

  try {
    await apiFetchPublic("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    return { status: "success" };
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "INVALID_PASSWORD_RESET_TOKEN"
    ) {
      return {
        status: "error",
        formError: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
      };
    }
    const publicError = toPublicApiError(error);
    return {
      status: "error",
      formError: publicError.message,
      correlationId: publicError.correlationId,
    };
  }
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
