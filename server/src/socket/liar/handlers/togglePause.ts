import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitLiarState } from "../liarEmitter";

export function togglePause(io: Server, socket: Socket) {
  return (data: { roomId: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      const game = liarGameManager.getGame(data.roomId);
      if (!game) return;

      if (game.paused) {
        liarGameManager.resumeGame(data.roomId);
      } else {
        liarGameManager.pauseGame(data.roomId);
      }

      emitLiarState(io, data.roomId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "일시정지 처리 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}