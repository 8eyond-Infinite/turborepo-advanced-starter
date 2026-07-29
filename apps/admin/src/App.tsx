import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/routes";
import { useAuthStore } from "@/features/auth";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./components/theme-provider";
import { ApplicationErrorBoundary } from "@/components/application-error-boundary";
import { subscribeToAuthCacheCleanup } from "@/app/auth-cache-boundary";
import { RealtimeProvider } from "@/app/realtime/realtime-provider";
import { createAdminQueryClient } from "@/app/query-client";

const queryClient = createAdminQueryClient();

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const unsubscribeFromAuthCacheCleanup =
      subscribeToAuthCacheCleanup(queryClient);

    initialize();

    const handleGlobalLogout = () => {
      clearAuth();
      router.navigate("/login");
    };
    const handleTokenRefresh = () => {
      void refreshCurrentUser();
    };

    window.addEventListener("auth:logout", handleGlobalLogout);
    window.addEventListener("auth:token-refreshed", handleTokenRefresh);

    return () => {
      unsubscribeFromAuthCacheCleanup();
      window.removeEventListener("auth:logout", handleGlobalLogout);
      window.removeEventListener("auth:token-refreshed", handleTokenRefresh);
    };
  }, [initialize, clearAuth, refreshCurrentUser]);

  if (isLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
        aria-busy="true"
      >
        <div
          className="flex flex-col items-center gap-3"
          role="status"
          aria-label="Đang khôi phục phiên đăng nhập…"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
            aria-hidden="true"
          />
          <span className="text-sm">Đang khôi phục phiên đăng nhập…</span>
        </div>
      </main>
    );
  }

  return (
    <ApplicationErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <RealtimeProvider>
            <RouterProvider router={router} />
            <Toaster />
          </RealtimeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ApplicationErrorBoundary>
  );
}

export default App;
