import { describe, expect, it, vi } from "vitest";
import { adminEnvironment } from "@/config/environment";
import { createRealtimeSocket, updateRealtimeToken } from "./realtime-client";

const { io, socket } = vi.hoisted(() => {
  const socket = { auth: {} };
  return {
    io: vi.fn((...args: [string, Record<string, unknown>]) => {
      void args;
      return socket;
    }),
    socket,
  };
});
vi.mock("socket.io-client", () => ({ io }));

describe("realtime client", () => {
  it("creates a socket without putting credentials in the URL query", () => {
    createRealtimeSocket("access-token");

    expect(io).toHaveBeenCalledWith(
      adminEnvironment.apiUrl,
      expect.objectContaining({
        auth: { token: "access-token" },
        autoConnect: false,
        reconnection: true,
      }),
    );
    expect(io.mock.calls[0]?.[1]).not.toHaveProperty("query");
  });

  it("updates the auth payload used for reconnect", () => {
    updateRealtimeToken(
      socket as ReturnType<typeof createRealtimeSocket>,
      "rotated-token",
    );

    expect(socket.auth).toEqual({ token: "rotated-token" });
  });
});
