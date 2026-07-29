import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationKeys } from "../api/notification.keys";
import type { NotificationListResponse } from "../api/notification.api";
import { useNotifications } from "./useNotifications";

const { notificationApi, toast } = vi.hoisted(() => ({
  notificationApi: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../api/notification.api", () => ({ notificationApi }));
vi.mock("sonner", () => ({ toast }));

const response: NotificationListResponse = {
  items: [
    {
      id: "notification-1",
      userId: "user-1",
      title: "Security alert",
      content: "A new login was detected",
      type: "WARNING",
      isRead: false,
      createdAt: "2026-07-27T00:00:00.000Z",
    },
  ],
  total: 57,
  unreadCount: 57,
  page: 1,
  limit: 50,
};

describe("useNotifications", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    notificationApi.getNotifications.mockResolvedValue(response);
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("uses the server unread count instead of counting the loaded page", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(57);
    expect(result.current.isMarkingNotification).toBe(false);
  });

  it("optimistically marks one item read and rolls back on failure", async () => {
    let rejectMutation!: (error: Error) => void;
    notificationApi.markAsRead.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectMutation = reject;
        }),
    );
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let mutation!: Promise<void>;
    act(() => {
      mutation = result.current.markAsRead("notification-1");
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<NotificationListResponse>(
          notificationKeys.list(1, 50),
        )?.unreadCount,
      ).toBe(56),
    );

    rejectMutation(new Error("network unavailable"));
    await act(async () => {
      await expect(mutation).rejects.toThrow("network unavailable");
    });

    expect(
      queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list(1, 50),
      ),
    ).toEqual(response);
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it("optimistically marks every item read and rolls back on failure", async () => {
    let rejectMutation!: (error: Error) => void;
    notificationApi.markAllAsRead.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectMutation = reject;
        }),
    );
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let mutation!: Promise<void>;
    act(() => {
      mutation = result.current.markAllAsRead();
    });

    await waitFor(() => {
      const optimistic = queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list(1, 50),
      );
      expect(optimistic?.unreadCount).toBe(0);
      expect(optimistic?.items.every((item) => item.isRead)).toBe(true);
    });

    rejectMutation(new Error("network unavailable"));
    await act(async () => {
      await expect(mutation).rejects.toThrow("network unavailable");
    });

    expect(
      queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list(1, 50),
      ),
    ).toEqual(response);
    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
