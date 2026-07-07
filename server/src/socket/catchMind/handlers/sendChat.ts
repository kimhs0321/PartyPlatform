import type { Server, Socket } from "socket.io";
import { catchMindGameManager } from "../../../managers/CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import { scheduleNextTurnOrRound } from "../catchMindScheduler";

type SendChatPayload = {
  roomId: string;
  text: string;
};

export function sendChat(io: Server, socket: Socket) {
  return (payload: SendChatPayload) => {
    try {
      const { roomId, text } = payload;

      const before = catchMindGameManager.getGame(roomId);
      if (!before) return;

      const beforePhase = before.phase;

      catchMindGameManager.submitGuess(roomId, socket.id, text);

      emitCatchMindState(io, roomId);

      const after = catchMindGameManager.getGame(roomId);
      if (!after) return;

      // 정답자가 나오면서 ROUND_RESULT로 넘어간 경우
      if (
        beforePhase === "DRAWING" &&
        after.phase === "ROUND_RESULT"
      ) {
        scheduleNextTurnOrRound(io, roomId);
      }
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "채팅 처리 중 오류가 발생했습니다.",
      });
    }
  };
}