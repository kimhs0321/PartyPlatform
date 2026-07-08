import type { GameModule } from "../common/GameModule";
import { registerLiarSocket } from "./socket/liarSocket";
import { startLiarGame } from "./socket/startLiarGame";
import { liarGameManager } from "./LiarGameManager";
import { emitLiarState } from "./socket/liarEmitter";

export const liarModule: GameModule = {
  name: "라이어 게임",
  enabled: true,

  registerSocket(io, socket) {
    registerLiarSocket(io, socket);
  },

  startGame(io, startedRoom) {
    startLiarGame(io, startedRoom);
  },

  onDisconnect(io, roomId, playerId) {
    liarGameManager.markPlayerLeft(roomId, playerId);
    emitLiarState(io, roomId);
  },
};