import type { ComponentProps } from "react";
import type { User } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UsersDataTable } from "./UsersDataTable";

const listedUser: User = {
  id: "user-1",
  email: "member@example.com",
  username: "member",
  isActive: true,
  isDeleted: false,
  roles: ["USER", "AUDITOR"],
  createdAt: "2026-07-27T00:00:00.000Z",
};

function renderTable(
  overrides: Partial<ComponentProps<typeof UsersDataTable>> = {},
) {
  const props: ComponentProps<typeof UsersDataTable> = {
    users: [listedUser],
    currentUserId: "admin-user",
    search: "",
    currentPage: 1,
    totalPages: 1,
    canUpdate: true,
    canDelete: true,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    isToggling: false,
    togglingUserId: null,
    isDeleting: false,
    deletingUserId: null,
    onRetry: vi.fn(),
    onPageChange: vi.fn(),
    onEdit: vi.fn(),
    onToggle: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<UsersDataTable {...props} />);
  return props;
}

describe("<UsersDataTable />", () => {
  it("names the loading state and keeps data rows hidden", () => {
    renderTable({ isLoading: true });

    expect(
      screen.getByRole("status", {
        name: "Đang tải danh sách tài khoản",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("member@example.com")).not.toBeInTheDocument();
  });

  it("renders every assigned role and invokes the requested status change", async () => {
    const props = renderTable();

    expect(screen.getByText("USER")).toBeInTheDocument();
    expect(screen.getByText("AUDITOR")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("switch", {
        name: "Khóa tài khoản member@example.com",
      }),
    );

    expect(props.onToggle).toHaveBeenCalledWith(listedUser);
  });

  it("does not render mutation controls in read-only mode", () => {
    renderTable({ canUpdate: false, canDelete: false });

    expect(
      screen.queryByRole("switch", {
        name: "Khóa tài khoản member@example.com",
      }),
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

  it("prevents status changes and deletion for the signed-in account", () => {
    renderTable({ currentUserId: listedUser.id });

    expect(screen.getByText("Tài khoản của bạn")).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", {
        name: "Khóa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Xóa tài khoản member@example.com",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Chỉnh sửa tài khoản member@example.com",
      }),
    ).toBeInTheDocument();
  });

  it("marks only the active row mutation as pending", () => {
    renderTable({
      users: [
        listedUser,
        {
          ...listedUser,
          id: "user-2",
          email: "other@example.com",
          username: "other",
        },
      ],
      isToggling: true,
      togglingUserId: listedUser.id,
    });

    expect(screen.getByText("Đang cập nhật")).toBeInTheDocument();
    expect(screen.getByText("Hoạt động")).toBeInTheDocument();
    for (const toggle of screen.getAllByRole("switch")) {
      expect(toggle).toBeDisabled();
    }
  });
});
