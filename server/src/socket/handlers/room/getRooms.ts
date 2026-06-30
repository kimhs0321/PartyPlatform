import type { Server, Socket } from "socket.io";
import { emitRooms } from "../../common/roomEmitter";

export function getRooms(io: Server, socket: Socket) {
  return () => {
    emitRooms(io);
  };
}