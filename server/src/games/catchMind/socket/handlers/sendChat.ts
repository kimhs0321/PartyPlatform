import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { catchMindGameManager } from "../../CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import { scheduleRoundResultTimeout } from "../catchMindScheduler";

export function sendChat(io: Server, socket: Socket) {
  return (data: { roomId: string; text: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      const beforeGame = catchMindGameManager.getGame(data.roomId);
      const beforePhase = beforeGame?.phase;

      catchMindGameManager.submitGuess(data.roomId, player.id, data.text);
      emitCatchMindState(io, data.roomId);

      const afterGame = catchMindGameManager.getGame(data.roomId);

      if (beforePhase === "DRAWING" && afterGame?.phase === "ROUND_RESULT") {
        scheduleRoundResultTimeout(io, data.roomId);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "채팅 전송 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}