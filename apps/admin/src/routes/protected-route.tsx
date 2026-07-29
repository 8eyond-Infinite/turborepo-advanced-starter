import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth";

export const ProtectedRoute = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400"
        role="status"
        aria-label="Đang khôi phục phiên đăng nhập"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-200"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
