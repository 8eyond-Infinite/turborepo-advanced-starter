import type { Metadata } from "next";
import { getCurrentUser } from "@/features/account/api/current-user";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  // Layout và page cùng gọi query được React cache theo request, nên backend
  // chỉ nhận một request /users/me dù cả shell lẫn feature đều cần user.
  const user = await getCurrentUser();

  return (
    <section className="flex flex-col gap-6" aria-labelledby="profile-heading">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-500">Tài khoản</p>
        <h1 id="profile-heading" className="text-2xl font-bold tracking-tight">
          Hồ sơ của tôi
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Thông tin định danh mà hệ thống đang sử dụng cho tài khoản này.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-[9rem_1fr] sm:gap-y-4 dark:border-zinc-800 dark:bg-zinc-950">
        <dt className="text-zinc-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="mt-2 text-zinc-500 sm:mt-0">Tên đăng nhập</dt>
        <dd>{user.username}</dd>
        <dt className="mt-2 text-zinc-500 sm:mt-0">Vai trò</dt>
        <dd>{user.roles.join(", ") || "—"}</dd>
        <dt className="mt-2 text-zinc-500 sm:mt-0">Trạng thái</dt>
        <dd>{user.isActive ? "Đang hoạt động" : "Đã khóa"}</dd>
      </dl>
    </section>
  );
}
