import type { GameModule } from "../common/GameModule";
import { registerRelayDrawingSocket } from "./socket/relayDrawingSocket";
import { startRelayDrawingGame } from "./socket/startRelayDrawingGame";
import { relayDrawingGameManager } from "./RelayDrawingGameManager";
import { emitRelayDrawingState } from "./socket/relayDrawingEmitter";

export const relayDrawingModule: GameModule = {
  name: "릴레이 드로잉",
  enabled: true,

  registerSocket(io, socket) {
    registerRelayDrawingSocket(io, socket);
  },

  startGame(io, startedRoom) {
    startRelayDrawingGame(io, startedRoom);
  },

  onDisconnect(io, roomId, playerId) {
    relayDrawingGameManager.setPlayerConnected(
      roomId,
      playerId,
      false,
    );

    emitRelayDrawingState(io, roomId);
  },
};