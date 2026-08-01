"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  resendEmailVerification,
  type ResendVerificationState,
} from "../actions/auth";

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<
    ResendVerificationState,
    FormData
  >(resendEmailVerification, { status: "idle" });
  if (state.status === "success")
    return (
      <div role="status" className="flex flex-col gap-4">
        <p>Nếu tài khoản cần xác minh, một liên kết mới đã được gửi.</p>
        <Link href="/login" className="underline">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  const emailError =
    state.status === "error" ? state.fieldErrors?.email?.[0] : undefined;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.formError ? (
        <p role="alert">{state.formError}</p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.status === "error" ? state.values?.email : email}
          aria-invalid={emailError ? true : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {emailError ? (
          <span className="text-xs text-red-700">{emailError}</span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang gửi…" : "Gửi lại liên kết"}
      </button>
    </form>
  );
}
