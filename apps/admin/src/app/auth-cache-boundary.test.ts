import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth";
import { subscribeToAuthCacheCleanup } from "./auth-cache-boundary";

describe("auth cache boundary", () => {
  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
    });
  });

  it("clears server state when the authenticated session ends", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["users"], [{ id: "previous-user-data" }]);
    useAuthStore.setState({ isAuthenticated: true });

    const unsubscribe = subscribeToAuthCacheCleanup(queryClient);
    useAuthStore.setState({ isAuthenticated: false });

    expect(queryClient.getQueryData(["users"])).toBeUndefined();
    unsubscribe();
  });

  it("does not clear cache for unrelated auth-store updates", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["roles"], ["admin"]);
    useAuthStore.setState({ isAuthenticated: true });

    const unsubscribe = subscribeToAuthCacheCleanup(queryClient);
    useAuthStore.setState({ isLoading: true });

    expect(queryClient.getQueryData(["roles"])).toEqual(["admin"]);
    unsubscribe();
  });
});
