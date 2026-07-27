import type { Role } from "@repo/types";
import { PERMISSIONS } from "@repo/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const makeRolesState = (overrides: Record<string, unknown> = {}) => ({
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
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  toggleRolePermission: vi.fn(),
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  isFetching: false,
  isSaving: false,
  isCreating: false,
  isDeleting: false,
  ...overrides,
});

describe("<RolesManagement /> permissions", () => {
  beforeEach(() => {
    useRoles.mockReturnValue(makeRolesState());
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

  it("locks the permission matrix while a replace operation is pending", () => {
    useRoles.mockReturnValue(makeRolesState({ isSaving: true }));
    setPermissions([PERMISSIONS.ROLE.UPDATE]);
    render(<RolesManagement />);

    expect(
      screen.getByRole("checkbox", {
        name: "Cấp quyền Đọc người dùng cho vai trò SUPPORT",
      }),
    ).toBeDisabled();
  });

  it("exposes permission groups as keyboard-operable disclosure buttons", async () => {
    setPermissions([PERMISSIONS.ROLE.READ]);
    const user = userEvent.setup();
    render(<RolesManagement />);

    const groupButton = screen.getByRole("button", { name: /USERS/i });
    expect(groupButton).toHaveAttribute("aria-expanded", "true");

    await user.click(groupButton);

    expect(groupButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("checkbox", {
        name: "Cấp quyền Đọc người dùng cho vai trò SUPPORT",
      }),
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

  it("validates role constraints before creating a role", async () => {
    const createRole = vi.fn();
    useRoles.mockReturnValue(
      makeRolesState({
        systemPermissions: [],
        createRole,
      }),
    );
    setPermissions([PERMISSIONS.ROLE.CREATE]);
    const user = userEvent.setup();
    render(<RolesManagement />);

    await user.click(screen.getByRole("button", { name: /Thêm vai trò mới/i }));
    await user.click(screen.getByRole("button", { name: "Tạo vai trò" }));

    expect(
      screen.getByText("Tên vai trò phải có ít nhất 2 ký tự."),
    ).toBeInTheDocument();
    expect(createRole).not.toHaveBeenCalled();
  });

  it("creates a normalized role and closes the form after success", async () => {
    const createRole = vi.fn().mockResolvedValue({
      id: "support",
      name: "SUPPORT",
      permissions: [],
    });
    useRoles.mockReturnValue(
      makeRolesState({
        systemPermissions: [],
        createRole,
      }),
    );
    setPermissions([PERMISSIONS.ROLE.CREATE]);
    const user = userEvent.setup();
    render(<RolesManagement />);

    await user.click(screen.getByRole("button", { name: /Thêm vai trò mới/i }));
    fireEvent.change(screen.getByLabelText("Tên vai trò"), {
      target: { value: "  SUPPORT  " },
    });
    fireEvent.change(screen.getByLabelText("Mô tả ngắn"), {
      target: { value: "  Customer support  " },
    });
    await user.click(screen.getByRole("button", { name: "Tạo vai trò" }));

    expect(createRole).toHaveBeenCalledWith({
      name: "SUPPORT",
      description: "Customer support",
    });
    expect(screen.queryByLabelText("Tên vai trò")).not.toBeInTheDocument();
  });
});
