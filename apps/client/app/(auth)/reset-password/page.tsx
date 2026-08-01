import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h1>
      <ResetPasswordForm token={token} />
    </main>
  );
}
