import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { catchMindGameManager } from "../../CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import type { DrawingStroke } from "../../types/catchMindGame";

export function sendDrawing(io: Server, socket: Socket) {
  return (data: { roomId: string; stroke: DrawingStroke }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      catchMindGameManager.addStroke(data.roomId, player.id, data.stroke);
      emitCatchMindState(io, data.roomId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "그림 전송 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}