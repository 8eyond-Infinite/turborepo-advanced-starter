import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

const MAX_QUERY_RETRIES = 2;

export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= MAX_QUERY_RETRIES) return false;

  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  return error instanceof TypeError;
};

export const createAdminQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) =>
          Math.min(1_000 * 2 ** attemptIndex, 5_000),
      },
      mutations: {
        retry: false,
      },
    },
  });
