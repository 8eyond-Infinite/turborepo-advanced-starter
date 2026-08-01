import type { Metadata } from "next";
import { RequestPasswordResetForm } from "@/features/auth/components/request-password-reset-form";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Nhập email của bạn. Kết quả luôn giống nhau để người khác không thể dò
        tài khoản.
      </p>
      <RequestPasswordResetForm />
    </main>
  );
}
