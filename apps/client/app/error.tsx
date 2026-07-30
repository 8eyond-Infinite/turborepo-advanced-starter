"use client";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">
        Không thể tải nội dung
      </p>
      <h1 className="text-2xl font-bold tracking-tight">
        Đã xảy ra lỗi tạm thời
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Vui lòng thử lại. Nếu lỗi tiếp tục xảy ra, hãy quay về trang chủ.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:bg-white dark:text-zinc-950"
      >
        Thử lại
      </button>
    </main>
  );
}
