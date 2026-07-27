import type { User } from "@repo/types";
import { PERMISSIONS } from "@repo/contracts";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth";
import { UserTable } from "./UserTable";

const { useUsers } = vi.hoisted(() => ({ useUsers: vi.fn() }));
vi.mock("../hooks/useUsers", () => ({ useUsers }));

const listedUser: User = {
  id: "managed-user",
  email: "member@example.com",
  username: "member",
  isActive: true,
  isDeleted: false,
  roles: ["USER"],
  createdAt: "2026-07-27T00:00:00.000Z",
};

const setPermissions = (permissions: string[]) => {
  useAuthStore.setState({
    user: {
      ...listedUser,
      id: "admin-user",
      email: "admin@example.com",
      username: "admin",
      permissions,
    },
    isAuthenticated: true,
    isLoading: false,
  });
};

describe("<UserTable /> permission visibility", () => {
  beforeEach(() => {
    useUsers.mockReturnValue({
      users: [listedUser],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
      roles: [],
      createUser: vi.fn(),
      updateUser: vi.fn(),
      toggleStatus: vi.fn(),
      deleteUser: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isCreating: false,
      isUpdating: false,
    });
  });

  it("renders a read-only table without mutation controls", () => {
    setPermissions([PERMISSIONS.USER.READ]);
    render(<UserTable />);

    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Thêm người dùng mới/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Chỉnh sửa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Xóa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows only controls granted by the current permission set", () => {
    setPermissions([PERMISSIONS.USER.CREATE, PERMISSIONS.USER.UPDATE]);
    render(<UserTable />);

    expect(
      screen.getByRole("button", { name: /Thêm người dùng mới/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Chỉnh sửa tài khoản member@example.com",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: "Khóa tài khoản member@example.com",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Xóa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders an accessible delete trigger for delete permission", () => {
    setPermissions([PERMISSIONS.USER.DELETE]);
    render(<UserTable />);

    expect(
      screen.getByRole("button", {
        name: "Xóa tài khoản member@example.com",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Chỉnh sửa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
  });
});
