import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationItemButton } from "./NotificationItemButton";

const notification = {
  id: "notification-1",
  userId: "user-1",
  title: "Security alert",
  content: "A new login was detected",
  type: "WARNING",
  isRead: false,
  createdAt: "2026-07-27T00:00:00.000Z",
};

describe("<NotificationItemButton /> application shell", () => {
  it("is keyboard operable and exposes the original timestamp", async () => {
    const onMarkAsRead = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <NotificationItemButton
        notification={notification}
        isPending={false}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Đánh dấu đã đọc: Security alert",
    });
    button.focus();
    await user.keyboard("{Enter}");

    expect(onMarkAsRead).toHaveBeenCalledWith("notification-1");
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      notification.createdAt,
    );
  });

  it("disables notifications that are already read", () => {
    render(
      <NotificationItemButton
        notification={{ ...notification, isRead: true }}
        isPending={false}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Đã đọc: Security alert" }),
    ).toBeDisabled();
  });

  it("contains a rejected mutation at the click boundary", async () => {
    const onMarkAsRead = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <NotificationItemButton
        notification={notification}
        isPending={false}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "Đánh dấu đã đọc: Security alert",
      }),
    );

    expect(onMarkAsRead).toHaveBeenCalledWith("notification-1");
  });
});
