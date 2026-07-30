import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-zinc-500">404</p>
      <h1 className="text-2xl font-bold tracking-tight">
        Không tìm thấy trang
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Đường dẫn không tồn tại hoặc nội dung đã được di chuyển.
      </p>
      <Link
        href="/"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Về trang chủ
      </Link>
    </main>
  );
}
