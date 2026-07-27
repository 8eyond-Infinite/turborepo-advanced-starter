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

    return () => {
      window.removeEventListener("auth:token-refreshed", handleTokenRefresh);
      unregisterHandlers();
      socket.disconnect();
    };
  }, [isAuthenticated, logout, queryClient]);

  return children;
};
