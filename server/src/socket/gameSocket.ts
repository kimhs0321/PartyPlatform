import type { Server, Socket } from "socket.io";

export function registerGameSocket(io: Server, socket: Socket) {
  // 공통 게임 이벤트가 생기면 여기에 등록
}