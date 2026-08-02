import type { User } from "@repo/types";
import { PERMISSIONS } from "@repo/contracts";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
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

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
};

const renderTable = (initialEntry = "/users") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <UserTable />
      <LocationProbe />
    </MemoryRouter>,
  );

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
      changeStatus: vi.fn(),
      deleteUser: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
      isCreating: false,
      isUpdating: false,
      isChangingStatus: false,
      isDeleting: false,
      isRolesLoading: false,
      isRolesError: false,
      rolesError: null,
      refetchRoles: vi.fn(),
    });
  });

  it("renders a read-only table without mutation controls", () => {
    setPermissions([PERMISSIONS.USER.READ]);
    renderTable();

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
    renderTable();

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
    renderTable();

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

  it("uses the URL as the source of truth for search and pagination", () => {
    setPermissions([PERMISSIONS.USER.READ]);
    renderTable("/users?q=member&page=2");

    expect(useUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: "member",
      loadRoles: false,
    });
    expect(screen.getByRole("textbox")).toHaveValue("member");
  });

  it("replaces an out-of-range page after the result set shrinks", async () => {
    setPermissions([PERMISSIONS.USER.READ]);
    useUsers.mockReturnValue({
      ...useUsers.mock.results[0]?.value,
      users: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 3,
      },
      isLoading: false,
      isError: false,
    });

    renderTable("/users?q=member&page=3");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("?q=member");
    });
  });
});
