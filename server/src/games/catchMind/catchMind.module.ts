import type { Server, Socket } from "socket.io";
import type { GameModule } from "../common/GameModule";
import { registerCatchMindSocket } from "./socket/catchMindSocket";
import { startCatchMindGame } from "./socket/startCatchMindGame";
import { catchMindGameManager } from "./CatchMindGameManager";

export const catchMindModule: GameModule = {
  name: "캐치마인드",
  enabled: true,

  registerSocket(io: Server, socket: Socket) {
    registerCatchMindSocket(io, socket);
  },

  startGame(io, room) {
    return startCatchMindGame(io, room);
  },

  onDisconnect(io, roomId, playerId) {
    catchMindGameManager.markPlayerLeft(roomId, playerId);
  },
};