import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userKeys } from "../api/user.keys";
import { useUsers } from "./useUsers";

const { userApi, roleApi, toast } = vi.hoisted(() => ({
  userApi: {
    getUsers: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    remove: vi.fn(),
  },
  roleApi: { getRoles: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/user.api", () => ({ userApi }));
vi.mock("@/features/roles", () => ({
  roleApi,
  roleKeys: {
    all: ["roles"],
    list: () => ["roles", "list"],
  },
}));
vi.mock("sonner", () => ({ toast }));

describe("useUsers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    userApi.getUsers.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    });
    roleApi.getRoles.mockResolvedValue([]);
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("invalidates every user-list variant before create resolves", async () => {
    const createdUser = {
      id: "user-1",
      email: "new@example.com",
      username: "new-user",
      isActive: true,
      isDeleted: false,
      roles: ["USER"],
      createdAt: "2026-07-27T00:00:00.000Z",
    };
    userApi.create.mockResolvedValue(createdUser);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.createUser({
        email: createdUser.email,
        username: createdUser.username,
        password: "safe-password",
        roles: ["USER"],
      });
    });

    expect(userApi.create).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: userKeys.all });
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it("surfaces mutation failure without invalidating successful data", async () => {
    userApi.create.mockRejectedValue(new Error("Duplicate email"));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(
      result.current.createUser({
        email: "duplicate@example.com",
        username: "duplicate",
        password: "safe-password",
        roles: ["USER"],
      }),
    ).rejects.toThrow("Duplicate email");

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it("does not request roles for a read-only user list", async () => {
    const { result } = renderHook(() => useUsers({ loadRoles: false }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(roleApi.getRoles).not.toHaveBeenCalled();
    expect(result.current.roles).toEqual([]);
  });

  it("loads roles only when a mutation form needs them", async () => {
    roleApi.getRoles.mockResolvedValue([{ id: "role-1", name: "USER" }]);
    const { result } = renderHook(() => useUsers({ loadRoles: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isRolesLoading).toBe(false));

    expect(roleApi.getRoles).toHaveBeenCalledOnce();
    expect(result.current.roles).toEqual([{ id: "role-1", name: "USER" }]);
  });

  it("invalidates user data after update, status change and delete", async () => {
    userApi.update.mockResolvedValue({ id: "user-1" });
    userApi.deactivate.mockResolvedValue({ id: "user-1" });
    userApi.remove.mockResolvedValue(undefined);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.updateUser({
        id: "user-1",
        email: "updated@example.com",
        username: "updated",
        roles: ["USER"],
      });
      await result.current.changeStatus({ id: "user-1", activate: false });
      await result.current.deleteUser("user-1");
    });

    expect(userApi.update).toHaveBeenCalledOnce();
    expect(userApi.deactivate.mock.calls[0]?.[0]).toBe("user-1");
    expect(userApi.remove.mock.calls[0]?.[0]).toBe("user-1");
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenNthCalledWith(1, {
      queryKey: userKeys.all,
    });
  });
});
