import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { User } from "@repo/types";
import { apiFetch, ApiError } from "@/lib/api";
import { logout } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
  // Trang cá nhân không nên nằm trong kết quả tìm kiếm.
  robots: { index: false, follow: false },
};

export default async function MePage() {
  // Fetch chạy trên server: response đã có sẵn dữ liệu trong HTML đầu tiên,
  // không có vòng "tải trang rỗng → gọi API → mới thấy nội dung".
  let user: User;
  try {
    user = await apiFetch<User>("/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login?next=/me");
    }
    throw error;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Hồ sơ của tôi</h1>

      <dl className="grid grid-cols-[9rem_1fr] gap-y-3 text-sm">
        <dt className="text-zinc-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-zinc-500">Tên đăng nhập</dt>
        <dd>{user.username}</dd>
        <dt className="text-zinc-500">Vai trò</dt>
        <dd>{user.roles.join(", ") || "—"}</dd>
        <dt className="text-zinc-500">Trạng thái</dt>
        <dd>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</dd>
      </dl>

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
