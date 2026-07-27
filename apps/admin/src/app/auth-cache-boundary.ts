import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";

/**
 * Server state is scoped to the authenticated principal. Clear it whenever an
 * authenticated session ends so a later user cannot observe cached data from
 * the previous user in the same browser tab.
 */
export const subscribeToAuthCacheCleanup = (queryClient: QueryClient) =>
  useAuthStore.subscribe((state, previousState) => {
    if (previousState.isAuthenticated && !state.isAuthenticated) {
      queryClient.clear();
    }
  });
