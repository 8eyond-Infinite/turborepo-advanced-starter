import type { Metadata } from "next";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";

export const metadata: Metadata = {
  title: "Kiểm tra email",
  robots: { index: false, follow: false },
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Kiểm tra email</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Liên kết xác minh có hiệu lực trong 24 giờ. Kết quả gửi lại luôn giống
        nhau để không làm lộ tài khoản.
      </p>
      <ResendVerificationForm email={email} />
    </main>
  );
}
