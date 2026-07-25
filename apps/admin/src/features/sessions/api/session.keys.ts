export interface SessionListParams {
  page: number;
  limit: number;
}

export const sessionKeys = {
  all: ["active-sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (params: SessionListParams) =>
    [...sessionKeys.lists(), params] as const,
};
