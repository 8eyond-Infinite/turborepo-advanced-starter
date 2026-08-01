"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "../actions/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    { status: "idle" },
  );
  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p>Mật khẩu đã được thay đổi. Tất cả thiết bị cũ đã đăng xuất.</p>
        <Link className="underline" href="/login">
          Đăng nhập bằng mật khẩu mới
        </Link>
      </div>
    );
  }
  const passwordError =
    state.status === "error" ? state.fieldErrors?.password?.[0] : undefined;
  const confirmError =
    state.status === "error"
      ? state.fieldErrors?.confirmPassword?.[0]
      : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && state.formError ? (
        <p role="alert">{state.formError}</p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Mật khẩu mới
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "new-password-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {passwordError ? (
          <span id="new-password-error" className="text-xs text-red-700">
            {passwordError}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nhập lại mật khẩu mới
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? "confirm-password-error" : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {confirmError ? (
          <span id="confirm-password-error" className="text-xs text-red-700">
            {confirmError}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang đổi mật khẩu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
