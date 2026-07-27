import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/routes";
import { useAuthStore } from "@/features/auth";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./components/theme-provider";
import { ApplicationErrorBoundary } from "@/components/application-error-boundary";
import { subscribeToAuthCacheCleanup } from "@/app/auth-cache-boundary";

// 1. Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  const { initialize, clearAuth, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribeFromAuthCacheCleanup =
      subscribeToAuthCacheCleanup(queryClient);

    initialize();

    const handleGlobalLogout = () => {
      clearAuth();
      router.navigate("/login");
    };

    window.addEventListener("auth:logout", handleGlobalLogout);

    return () => {
      unsubscribeFromAuthCacheCleanup();
      window.removeEventListener("auth:logout", handleGlobalLogout);
    };
  }, [initialize, clearAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-200"></div>
      </div>
    );
  }

  return (
    <ApplicationErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ApplicationErrorBoundary>
  );
}

export default App;
