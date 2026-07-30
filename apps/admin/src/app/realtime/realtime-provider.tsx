import { useEffect, type PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth";
import { ApiClient } from "@/lib/api-client";
import { createRealtimeSocket, updateRealtimeToken } from "./realtime-client";
import { registerRealtimeEventHandlers } from "./realtime-event-handlers";

export const RealtimeProvider = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const accessToken = ApiClient.getToken();
    if (!accessToken) return;

    const socket = createRealtimeSocket(accessToken);
    const unregisterHandlers = registerRealtimeEventHandlers({
      socket,
      queryClient,
      logout,
    });
    const handleTokenRefresh = (event: Event) => {
      updateRealtimeToken(socket, (event as CustomEvent<string>).detail);
    };
    window.addEventListener("auth:token-refreshed", handleTokenRefresh);
    // React StrictMode mounts, cleans up, then mounts effects again in development.
    // Deferring the handshake lets the first cleanup cancel its unused socket
    // before a WebSocket request is opened.
    const connectTimer = window.setTimeout(() => socket.connect(), 0);

    return () => {
      window.clearTimeout(connectTimer);
      window.removeEventListener("auth:token-refreshed", handleTokenRefresh);
      unregisterHandlers();
      socket.disconnect();
    };
  }, [isAuthenticated, logout, queryClient]);

  return children;
};
