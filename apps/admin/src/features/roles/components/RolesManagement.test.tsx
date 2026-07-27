import type { Role } from "@repo/types";
import { PERMISSIONS } from "@repo/contracts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { RolesManagement } from "./RolesManagement";

const { useRoles } = vi.hoisted(() => ({ useRoles: vi.fn() }));
vi.mock("../hooks/useRoles", () => ({ useRoles }));

const roles: Role[] = [
  { id: "system-admin", name: "ADMIN", permissions: ["user:read"] },
  { id: "custom-support", name: "SUPPORT", permissions: [] },
];

const setPermissions = (permissions: string[]) => {
  useAuthStore.setState({
    user: {
      id: "admin",
      email: "admin@example.com",
      username: "admin",
      isActive: true,
      isDeleted: false,
      roles: ["ADMIN"],
      permissions,
      createdAt: "2026-07-27T00:00:00.000Z",
    },
    isAuthenticated: true,
    isLoading: false,
  });
};

describe("<RolesManagement /> permissions", () => {
  beforeEach(() => {
    useRoles.mockReturnValue({
      roles,
      systemPermissions: [
        {
          id: "permission-1",
          name: "user:read",
          displayName: "Đọc người dùng",
          description: "Đọc danh sách người dùng",
          module: "users",
        },
      ],
      newRoleName: "",
      setNewRoleName: vi.fn(),
      newRoleDesc: "",
      setNewRoleDesc: vi.fn(),
      isAdding: false,
      setIsAdding: vi.fn(),
      createRole: vi.fn(),
      deleteRole: vi.fn(),
      toggleRolePermission: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isSaving: false,
    });
  });

  it("renders a read-only permission matrix", () => {
    setPermissions([PERMISSIONS.ROLE.READ]);
    render(<RolesManagement />);

    expect(
      screen.queryByRole("button", { name: /Thêm vai trò mới/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Cấp quyền Đọc người dùng cho vai trò SUPPORT",
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Xóa vai trò SUPPORT" }),
    ).not.toBeInTheDocument();
  });

  it("enables permission editing without exposing delete controls", () => {
    setPermissions([PERMISSIONS.ROLE.UPDATE]);
    render(<RolesManagement />);

    expect(
      screen.getByRole("checkbox", {
        name: "Cấp quyền Đọc người dùng cho vai trò SUPPORT",
      }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Xóa vai trò SUPPORT" }),
    ).not.toBeInTheDocument();
  });

  it("allows deleting custom roles but never system roles", () => {
    setPermissions([PERMISSIONS.ROLE.DELETE]);
    render(<RolesManagement />);

    expect(
      screen.getByRole("button", { name: "Xóa vai trò SUPPORT" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xóa vai trò ADMIN" }),
    ).not.toBeInTheDocument();
  });
});
