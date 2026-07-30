import "server-only";
import { API_URL } from "./api";
import type { Session } from "./session";

type RefreshResult = Session | null;

const activeRefreshes = new Map<string, Promise<RefreshResult>>();
const COMPLETED_REFRESH_GRACE_MS = 5_000;

const requestRefresh = async (refreshToken: string): Promise<RefreshResult> => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const tokens = (await response.json().catch(() => null)) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  } | null;
  if (!tokens || typeof tokens.accessToken !== "string") {
    return null;
  }
  return {
    accessToken: tokens.accessToken,
    refreshToken:
      typeof tokens.refreshToken === "string"
        ? tokens.refreshToken
        : refreshToken,
  };
};

export const refreshSessionSingleFlight = (
  refreshToken: string,
): Promise<RefreshResult> => {
  const existing = activeRefreshes.get(refreshToken);
  if (existing) return existing;

  const pending = requestRefresh(refreshToken);
  activeRefreshes.set(refreshToken, pending);
  void pending.then((result) => {
    if (activeRefreshes.get(refreshToken) !== pending) return;
    if (!result) {
      activeRefreshes.delete(refreshToken);
      return;
    }

    // The browser applies Set-Cookie only after a response arrives. A request
    // that started with the old cookie can therefore reach this runtime just
    // after the first refresh completed. Retain only successful results for a
    // short grace window so the one-time refresh token is not consumed twice.
    const cleanup = setTimeout(() => {
      if (activeRefreshes.get(refreshToken) === pending) {
        activeRefreshes.delete(refreshToken);
      }
    }, COMPLETED_REFRESH_GRACE_MS);
    if (typeof cleanup === "object" && "unref" in cleanup) {
      cleanup.unref();
    }
  });
  return pending;
};
