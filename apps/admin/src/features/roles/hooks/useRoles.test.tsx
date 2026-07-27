import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { roleKeys } from "../api/role.keys";
import { useRoles } from "./useRoles";

const { roleApi, toast } = vi.hoisted(() => ({
  roleApi: {
    getRoles: vi.fn(),
    getPermissions: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    updatePermissions: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/role.api", () => ({ roleApi }));
vi.mock("sonner", () => ({ toast }));

describe("useRoles", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    roleApi.getRoles.mockResolvedValue([
      { id: "support", name: "SUPPORT", permissions: ["user:read"] },
    ]);
    roleApi.getPermissions.mockResolvedValue([]);
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("awaits cache invalidation before create resolves", async () => {
    const role = { id: "editor", name: "EDITOR", permissions: [] };
    roleApi.create.mockResolvedValue(role);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createRole({ name: "EDITOR" });
    });

    expect(roleApi.create.mock.calls[0]?.[0]).toEqual({ name: "EDITOR" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: roleKeys.all });
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it("blocks deletion of system roles on the client", async () => {
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteRole("admin", "ADMIN");
    });

    expect(roleApi.remove).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it("serializes permission updates to prevent stale-snapshot writes", async () => {
    let resolveUpdate!: (value: {
      id: string;
      name: string;
      permissions: string[];
    }) => void;
    roleApi.updatePermissions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    const { result } = renderHook(() => useRoles(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let firstUpdate!: Promise<void>;
    await act(async () => {
      firstUpdate = result.current.toggleRolePermission(
        "support",
        "user:update",
      );
      await result.current.toggleRolePermission("support", "user:delete");
    });

    expect(roleApi.updatePermissions).toHaveBeenCalledOnce();
    expect(roleApi.updatePermissions.mock.calls[0]?.[0]).toEqual({
      roleId: "support",
      permissions: ["user:read", "user:update"],
    });

    resolveUpdate({
      id: "support",
      name: "SUPPORT",
      permissions: ["user:read", "user:update"],
    });
    await act(async () => {
      await firstUpdate;
    });
  });
});
