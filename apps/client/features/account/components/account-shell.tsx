import Link from "next/link";
import type { User } from "@repo/types";
import { logout } from "@/features/auth/actions/auth";

interface AccountShellProps {
  children: React.ReactNode;
  user: Pick<User, "email" | "username">;
}

export function AccountShell({ children, user }: AccountShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#account-content"
        className="sr-only z-50 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 dark:bg-white dark:text-zinc-950"
      >
        Chuyển đến nội dung chính
      </a>

      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="shrink-0 font-semibold tracking-tight focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Starter Client
          </Link>

          <nav
            aria-label="Điều hướng tài khoản"
            className="ml-auto hidden items-center gap-1 sm:flex"
          >
            <Link
              href="/me"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Hồ sơ
            </Link>
          </nav>

          <details className="relative">
            <summary
              aria-label="Mở menu tài khoản"
              className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
              >
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-48 truncate sm:inline">
                @{user.username}
              </span>
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
              <p className="truncate px-3 py-2 text-xs text-zinc-500">
                Đăng nhập với {user.email}
              </p>
              <Link
                href="/me"
                className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100 focus-visible:outline-2 dark:hover:bg-zinc-900 sm:hidden"
              >
                Hồ sơ
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Đăng xuất
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <main
        id="account-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>
    </div>
  );
}
