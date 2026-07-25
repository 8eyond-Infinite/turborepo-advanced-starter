export const notificationKeys = {
  all: ["notifications"] as const,
  list: (page: number, limit: number) =>
    [...notificationKeys.all, "list", { page, limit }] as const,
};
