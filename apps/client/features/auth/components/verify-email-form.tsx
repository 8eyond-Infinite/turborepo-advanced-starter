"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyEmail, type VerifyEmailState } from "../actions/auth";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<VerifyEmailState, FormData>(
    verifyEmail,
    { status: "idle" },
  );
  if (state.status === "success")
    return (
      <div role="status" className="flex flex-col gap-4">
        <p>Email đã được xác minh.</p>
        <Link href="/login" className="underline">
          Đăng nhập
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && state.formError ? (
        <p role="alert">{state.formError}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || token.length < 32}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang xác minh…" : "Xác minh email"}
      </button>
      {token.length < 32 ? (
        <Link href="/check-email" className="text-sm underline">
          Gửi lại liên kết
        </Link>
      ) : null}
    </form>
  );
}
