import { io, type Socket } from "socket.io-client";

const REALTIME_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const createRealtimeSocket = (accessToken: string): Socket =>
  io(REALTIME_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
  });

export const updateRealtimeToken = (
  socket: Socket,
  accessToken: string,
): void => {
  socket.auth = { token: accessToken };
};
