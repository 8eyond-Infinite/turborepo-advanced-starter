import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionKeys } from "../api/session.keys";
import { useSessions } from "./useSessions";

const { sessionApi, toast } = vi.hoisted(() => ({
  sessionApi: {
    getSessions: vi.fn(),
    revoke: vi.fn(),
    revokeOthers: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/session.api", () => ({ sessionApi }));
vi.mock("sonner", () => ({ toast }));

describe("useSessions", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    sessionApi.getSessions.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    });
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("awaits invalidation after revoking one session", async () => {
    sessionApi.revoke.mockResolvedValue(undefined);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.revokeSession("session-1");
    });

    expect(sessionApi.revoke.mock.calls[0]?.[0]).toBe("session-1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sessionKeys.all });
  });

  it("uses the preserve-current-session endpoint for bulk revoke", async () => {
    sessionApi.revokeOthers.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.revokeAllSessions();
    });

    expect(sessionApi.revokeOthers).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
  });
});
