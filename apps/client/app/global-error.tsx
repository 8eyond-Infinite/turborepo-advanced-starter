"use client";

import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold">Ứng dụng đang gặp sự cố</h1>
          <p>Không thể dựng giao diện lúc này. Hãy thử tải lại ứng dụng.</p>
          <button type="button" onClick={reset}>
            Tải lại
          </button>
        </main>
      </body>
    </html>
  );
}
