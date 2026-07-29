import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

const { useNotifications } = vi.hoisted(() => ({
  useNotifications: vi.fn(),
}));

vi.mock("@/features/notifications", () => ({ useNotifications }));

const notification = {
  id: "notification-1",
  userId: "user-1",
  title: "Security alert",
  content: "A new login was detected",
  type: "WARNING",
  isRead: false,
  createdAt: "2026-07-27T00:00:00.000Z",
};

const createState = () => ({
  notifications: [notification],
  unreadCount: 12,
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
  isError: false,
  error: null,
  isFetching: false,
  refetch: vi.fn().mockResolvedValue(undefined),
  isMarkingAllAsRead: false,
  isMarkingNotification: false,
  markingNotificationId: null,
});

describe("<NotificationBell />", () => {
  beforeEach(() => {
    useNotifications.mockReturnValue(createState());
  });

  it("announces unread state and renders the capped visual badge", async () => {
    render(<NotificationBell />);

    const trigger = screen.getByRole("button", {
      name: "Mở danh sách thông báo",
      description: "12 thông báo chưa đọc",
    });
    expect(screen.getByText("9+")).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(trigger);

    expect(
      await screen.findByRole("heading", { name: "Thông báo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Đánh dấu đã đọc: Security alert",
      }),
    ).toBeInTheDocument();
  });

  it("contains a rejected mark-all mutation after the hook handles it", async () => {
    const state = createState();
    state.markAllAsRead.mockRejectedValue(new Error("offline"));
    useNotifications.mockReturnValue(state);
    render(<NotificationBell />);

    await userEvent.click(
      screen.getByRole("button", { name: "Mở danh sách thông báo" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Đọc tất cả" }),
    );

    expect(state.markAllAsRead).toHaveBeenCalledOnce();
  });

  it("shows an accessible error and retries the query", async () => {
    const state = {
      ...createState(),
      notifications: [],
      unreadCount: 0,
      isError: true,
      error: new Error("network unavailable"),
    };
    useNotifications.mockReturnValue(state);
    render(<NotificationBell />);

    await userEvent.click(
      screen.getByRole("button", { name: "Mở danh sách thông báo" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể tải thông báo",
    );
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });

  it("names the loading status for assistive technology", async () => {
    useNotifications.mockReturnValue({
      ...createState(),
      notifications: [],
      unreadCount: 0,
      isLoading: true,
    });
    render(<NotificationBell />);

    await userEvent.click(
      screen.getByRole("button", { name: "Mở danh sách thông báo" }),
    );

    expect(
      await screen.findByRole("status", { name: "Đang tải thông báo" }),
    ).toBeInTheDocument();
  });
});
