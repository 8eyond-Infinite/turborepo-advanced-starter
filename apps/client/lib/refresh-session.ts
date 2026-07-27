import "server-only";
import { API_URL } from "./api";
import type { Session } from "./session";

type RefreshResult = Session | null;

const activeRefreshes = new Map<string, Promise<RefreshResult>>();

const requestRefresh = async (refreshToken: string): Promise<RefreshResult> => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const tokens = (await response.json()) as {
    accessToken: string;
    refreshToken?: string;
  };
  if (typeof tokens.accessToken !== "string") {
    return null;
  }
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
  };
};

export const refreshSessionSingleFlight = (
  refreshToken: string,
): Promise<RefreshResult> => {
  const existing = activeRefreshes.get(refreshToken);
  if (existing) return existing;

  const pending = requestRefresh(refreshToken).finally(() => {
    activeRefreshes.delete(refreshToken);
  });
  activeRefreshes.set(refreshToken, pending);
  return pending;
};
