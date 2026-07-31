"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/features/auth/actions/auth";

// Client Component duy nhất ở đây, chỉ để hiện lỗi và trạng thái đang gửi.
// Bản thân việc đăng nhập chạy trong Server Action — mật khẩu không đi qua
// JavaScript phía trình duyệt nhiều hơn mức cần thiết.
export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    { status: "idle" },
  );
  const emailError =
    state.status === "error" ? state.fieldErrors?.email?.[0] : undefined;
  const passwordError =
    state.status === "error" ? state.fieldErrors?.password?.[0] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && state.formError ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {state.formError}
          {state.correlationId ? (
            <span className="mt-1 block text-xs">
              Mã hỗ trợ: {state.correlationId}
            </span>
          ) : null}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={
            state.status === "error" ? state.values?.email : undefined
          }
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {emailError ? (
          <span id="email-error" className="text-xs text-red-700">
            {emailError}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Mật khẩu
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {passwordError ? (
          <span id="password-error" className="text-xs text-red-700">
            {passwordError}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
