import type { User } from "@repo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api-client";
import {
  configureObservabilitySink,
  type ErrorReport,
} from "@/lib/observability";
import { useAuthStore } from "./auth.store";

const user: User = {
  id: "user-1",
  email: "admin@example.com",
  username: "admin",
  isActive: true,
  isDeleted: false,
  roles: ["admin"],
  permissions: [],
  createdAt: "2026-07-27T00:00:00.000Z",
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    vi.spyOn(ApiClient, "setToken");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("commits login only after the current user is loaded", async () => {
    vi.spyOn(ApiClient, "post").mockResolvedValue({
      accessToken: "access-token",
    });
    vi.spyOn(ApiClient, "get").mockResolvedValue(user);

    await useAuthStore.getState().login({
      email: "admin@example.com",
      password: "secret",
    });

    expect(useAuthStore.getState()).toMatchObject({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    expect(ApiClient.setToken).toHaveBeenCalledWith("access-token");
  });

  it("refreshes the current user snapshot after token rotation", async () => {
    const refreshedUser = {
      ...user,
      permissions: ["role:read"],
    };
    useAuthStore.setState({ user, isAuthenticated: true });
    vi.spyOn(ApiClient, "get").mockResolvedValue(refreshedUser);

    await useAuthStore.getState().refreshCurrentUser();

    expect(ApiClient.get).toHaveBeenCalledWith("/users/me");
    expect(useAuthStore.getState().user).toEqual(refreshedUser);
  });

  it("rolls back and revokes a newly-created session when profile loading fails", async () => {
    const profileError = new Error("Profile unavailable");
    const post = vi
      .spyOn(ApiClient, "post")
      .mockResolvedValueOnce({ accessToken: "access-token" })
      .mockResolvedValueOnce(undefined);
    vi.spyOn(ApiClient, "get").mockRejectedValue(profileError);

    await expect(
      useAuthStore.getState().login({
        email: "admin@example.com",
        password: "secret",
      }),
    ).rejects.toBe(profileError);

    expect(ApiClient.setToken).toHaveBeenLastCalledWith(null);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    expect(post).toHaveBeenLastCalledWith(
      "/auth/logout",
      {},
      { skipAuth: true, skipRefresh: true },
    );
  });

  it("clears local authentication even when logout cannot reach the server", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(ApiClient, "post").mockRejectedValue(new Error("Network error"));
    useAuthStore.setState({ user, isAuthenticated: true });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
    expect(ApiClient.setToken).toHaveBeenLastCalledWith(null);
  });

  it("reports a failed global logout without blocking local cleanup", async () => {
    const sink = vi.fn<(report: ErrorReport) => void>();
    const restoreSink = configureObservabilitySink(sink);
    vi.spyOn(ApiClient, "post").mockRejectedValue(
      new Error("Global logout unavailable"),
    );
    useAuthStore.setState({ user, isAuthenticated: true });

    try {
      await useAuthStore.getState().logoutGlobal();
    } finally {
      restoreSink();
    }

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "auth",
        operation: "logout-global",
        message: "Global logout unavailable",
      }),
    );
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
  });
});
