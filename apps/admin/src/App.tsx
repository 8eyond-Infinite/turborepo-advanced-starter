import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/routes';
import { useAuthStore } from '@/features/auth/store/auth.store';

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
  const { initialize, clearAuth } = useAuthStore();

  useEffect(() => {
    // Restore user session on startup
    initialize();

    // Listen to global unauthorized logout events
    const handleGlobalLogout = () => {
      clearAuth();
      router.navigate('/login');
    };

    window.addEventListener('auth:logout', handleGlobalLogout);

    return () => {
      window.removeEventListener('auth:logout', handleGlobalLogout);
    };
  }, [initialize, clearAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
