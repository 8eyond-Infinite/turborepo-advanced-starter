import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/features/account/api/current-user";
import { getSession } from "@/lib/session";
import { AccountShell } from "@/features/account/components/account-shell";

const loadCurrentUser = async () => {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }
};

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Proxy là cửa đầu tiên; layout là boundary thứ hai để future protected pages
  // không phải tự nhớ kiểm tra phiên hoặc dựng account shell.
  if (!(await getSession())) {
    redirect("/login");
  }

  const user = await loadCurrentUser();
  return (
    <AccountShell user={{ email: user.email, username: user.username }}>
      {children}
    </AccountShell>
  );
}
