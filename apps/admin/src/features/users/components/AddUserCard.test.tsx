import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Role, User } from "@repo/types";
import type { ComponentProps } from "react";
import { AddUserCard } from "./AddUserCard";

const roles: Role[] = [
  {
    id: "role-user",
    name: "USER",
    permissions: [],
  },
  {
    id: "role-auditor",
    name: "AUDITOR",
    permissions: [],
  },
];

const createdUser: User = {
  id: "created-user",
  email: "member@example.com",
  username: "member",
  isActive: true,
  isDeleted: false,
  roles: ["USER"],
  createdAt: "2026-07-27T00:00:00.000Z",
};

const renderForm = (
  onCreateUser: ComponentProps<typeof AddUserCard>["onCreateUser"],
) => {
  const onClose = vi.fn();
  render(
    <AddUserCard
      onClose={onClose}
      onCreateUser={onCreateUser}
      isCreating={false}
      roles={roles}
      isRolesLoading={false}
      isRolesError={false}
      rolesError={null}
      onRetryRoles={vi.fn()}
    />,
  );
  return { onClose };
};

const fillValidDraft = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Tên người dùng/i), "  member  ");
  await user.type(
    screen.getByLabelText(/Địa chỉ Email/i),
    "member@example.com",
  );
  await user.type(screen.getByLabelText(/Mật khẩu khởi tạo/i), "safe-password");
  return user;
};

describe("<AddUserCard />", () => {
  it("submits a normalized draft with the default USER role", async () => {
    const onCreateUser = vi.fn().mockResolvedValue(createdUser);
    const { onClose } = renderForm(onCreateUser);
    const user = await fillValidDraft();

    await user.click(screen.getByRole("button", { name: "Tạo người dùng" }));

    expect(onCreateUser).toHaveBeenCalledWith({
      email: "member@example.com",
      username: "member",
      password: "safe-password",
      avatar: null,
      roles: ["USER"],
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("preserves the draft and stays open when the mutation fails", async () => {
    const onCreateUser = vi.fn().mockRejectedValue(new Error("Duplicate"));
    const { onClose } = renderForm(onCreateUser);
    const user = await fillValidDraft();

    await user.click(screen.getByRole("button", { name: "Tạo người dùng" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Địa chỉ Email/i)).toHaveValue(
      "member@example.com",
    );
  });

  it("submits every selected role", async () => {
    const onCreateUser = vi.fn().mockResolvedValue(createdUser);
    renderForm(onCreateUser);
    const user = await fillValidDraft();
    await user.click(screen.getByRole("checkbox", { name: "AUDITOR" }));

    await user.click(screen.getByRole("button", { name: "Tạo người dùng" }));

    expect(onCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["USER", "AUDITOR"] }),
    );
  });

  it("shows field errors without invoking the mutation", async () => {
    const onCreateUser = vi.fn();
    renderForm(onCreateUser);

    await userEvent.click(
      screen.getByRole("button", { name: "Tạo người dùng" }),
    );

    expect(onCreateUser).not.toHaveBeenCalled();
    expect(screen.getByText("Email là bắt buộc.")).toBeInTheDocument();
    expect(screen.getByText("Username là bắt buộc.")).toBeInTheDocument();
    expect(screen.getByText("Mật khẩu là bắt buộc.")).toBeInTheDocument();
  });
});
