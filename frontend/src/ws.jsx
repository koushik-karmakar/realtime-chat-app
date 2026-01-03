import { io } from "socket.io-client";
export function wsConnection() {
  return io("https://realtime-chat-app-backend-782h.onrender.com");
}
