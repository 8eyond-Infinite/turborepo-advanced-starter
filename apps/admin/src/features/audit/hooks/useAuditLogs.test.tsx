import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditKeys } from "../api/audit.keys";
import { useAuditLogs } from "./useAuditLogs";

const { auditApi } = vi.hoisted(() => ({
  auditApi: { getAuditLogs: vi.fn() },
}));

vi.mock("../api/audit.api", () => ({ auditApi }));

describe("useAuditLogs", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    auditApi.getAuditLogs.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 25,
        totalPages: 1,
        currentPage: 3,
      },
    });
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("uses normalized list parameters as both query key and API input", async () => {
    const params = { page: 3, limit: 25, search: "admin@example.com" };
    const { result } = renderHook(() => useAuditLogs(params), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(auditApi.getAuditLogs.mock.calls[0]?.[0]).toEqual(params);
    expect(queryClient.getQueryData(auditKeys.list(params))).toEqual(
      expect.objectContaining({ data: [] }),
    );
    expect(result.current.meta.currentPage).toBe(3);
  });
});
