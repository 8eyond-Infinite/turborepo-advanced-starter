export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  permissions: () => [...roleKeys.all, "permissions"] as const,
};
