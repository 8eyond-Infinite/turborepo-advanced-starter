import type { ComponentProps } from "react";
import type { Role, User } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditUserModal } from "./EditUserModal";

const roles: Role[] = [
  { id: "role-admin", name: "ADMIN", permissions: [] },
  { id: "role-auditor", name: "AUDITOR", permissions: [] },
  { id: "role-user", name: "USER", permissions: [] },
];

const editedUser: User = {
  id: "user-1",
  email: "admin@example.com",
  username: "admin",
  isActive: true,
  isDeleted: false,
  roles: ["ADMIN", "AUDITOR"],
  createdAt: "2026-07-27T00:00:00.000Z",
};

function renderModal(
  onUpdateUser: ComponentProps<typeof EditUserModal>["onUpdateUser"],
) {
  const onClose = vi.fn();
  render(
    <EditUserModal
      user={editedUser}
      onClose={onClose}
      onUpdateUser={onUpdateUser}
      isUpdating={false}
      roles={roles}
      isRolesLoading={false}
      isRolesError={false}
      rolesError={null}
      onRetryRoles={vi.fn()}
    />,
  );
  return { onClose };
}

describe("<EditUserModal />", () => {
  it("preserves every existing role when profile fields are edited", async () => {
    const onUpdateUser = vi.fn().mockResolvedValue(editedUser);
    const { onClose } = renderModal(onUpdateUser);

    const username = screen.getByLabelText(/Tên người dùng/i);
    await userEvent.clear(username);
    await userEvent.type(username, "updated-admin");
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onUpdateUser).toHaveBeenCalledWith({
      id: "user-1",
      email: "admin@example.com",
      username: "updated-admin",
      avatar: null,
      roles: ["ADMIN", "AUDITOR"],
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("can add and remove roles without overwriting unrelated selections", async () => {
    const onUpdateUser = vi.fn().mockResolvedValue(editedUser);
    renderModal(onUpdateUser);

    await userEvent.click(screen.getByRole("checkbox", { name: "AUDITOR" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "USER" }));
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ["ADMIN", "USER"] }),
    );
  });

  it("preserves the draft and remains open when update fails", async () => {
    const onUpdateUser = vi.fn().mockRejectedValue(new Error("conflict"));
    const { onClose } = renderModal(onUpdateUser);
    const username = screen.getByLabelText(/Tên người dùng/i);
    await userEvent.clear(username);
    await userEvent.type(username, "updated-admin");

    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(username).toHaveValue("updated-admin");
  });
});
