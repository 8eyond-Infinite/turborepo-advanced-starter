import Link from "next/link";
import type { Metadata } from "next";

// Metadata được render sẵn ở phía server — đây là thứ SPA không làm được và
// là lý do trang công khai nằm ở Next.js.
export const metadata: Metadata = {
  title: "Turborepo Advanced Starter — Client",
  description:
    "Ứng dụng người dùng cuối, render phía server và lấy dữ liệu qua lớp BFF của Next.js.",
  openGraph: {
    title: "Turborepo Advanced Starter — Client",
    description:
      "Ứng dụng người dùng cuối, render phía server và lấy dữ liệu qua lớp BFF của Next.js.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          Client render phía server
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Trang này được render sẵn ở server nên máy tìm kiếm đọc được nội dung
          mà không cần chạy JavaScript. Nội dung cần đăng nhập cũng lấy ở
          server: trình duyệt không giữ token và không gọi thẳng vào API.
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <li>• Trình duyệt chỉ nói chuyện với Next.js (không cần CORS).</li>
        <li>
          • Next.js giữ phiên trong cookie HttpOnly và gọi API bằng access token
          ở phía server.
        </li>
        <li>• Middleware làm mới token trước khi trang được render.</li>
      </ul>

      <div className="flex gap-3">
        <Link
          href="/me"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Xem hồ sơ của tôi
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Đăng nhập
        </Link>
      </div>
    </main>
  );
}
