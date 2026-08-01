"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type RegisterState } from "../actions/auth";

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    register,
    { status: "idle" },
  );
  const error = (
    field: "email" | "username" | "password" | "confirmPassword",
  ) => (state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined);
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
          autoComplete="email"
          required
          defaultValue={
            state.status === "error" ? state.values?.email : undefined
          }
          aria-invalid={error("email") ? true : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error("email") ? (
          <span className="text-xs text-red-700">{error("email")}</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tên hiển thị
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          defaultValue={
            state.status === "error" ? state.values?.username : undefined
          }
          aria-invalid={error("username") ? true : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error("username") ? (
          <span className="text-xs text-red-700">{error("username")}</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mật khẩu
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={error("password") ? true : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error("password") ? (
          <span className="text-xs text-red-700">{error("password")}</span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nhập lại mật khẩu
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-invalid={error("confirmPassword") ? true : undefined}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error("confirmPassword") ? (
          <span className="text-xs text-red-700">
            {error("confirmPassword")}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
      >
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </button>
      <Link href="/login" className="text-sm underline">
        Đã có tài khoản? Đăng nhập
      </Link>
    </form>
  );
}
