import { io } from "socket.io-client";
export function wsConnection() {
  return io("http://localhost:3000");
}
