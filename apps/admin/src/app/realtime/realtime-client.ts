import { io, type Socket } from "socket.io-client";
import { adminEnvironment } from "@/config/environment";

const REALTIME_URL = adminEnvironment.apiUrl;

export const createRealtimeSocket = (accessToken: string): Socket =>
  io(REALTIME_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
  });

export const updateRealtimeToken = (
  socket: Socket,
  accessToken: string,
): void => {
  socket.auth = { token: accessToken };
};
