import type { Server, Socket } from "socket.io";
import { catchMindGameManager } from "../../CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import { scheduleRoundResultTimeout } from "../catchMindScheduler";

export function skipQuestion(io: Server, socket: Socket) {
  return (data: { roomId: string }) => {
    try {
      const game = catchMindGameManager.getGame(data.roomId);

      if (!game) {
        throw new Error("캐치마인드 게임을 찾을 수 없습니다.");
      }

      if (!game.settings.allowDrawerSkip) {
        throw new Error("출제자 스킵이 허용되지 않은 방입니다.");
      }

      if (game.phase !== "DRAWING") {
        throw new Error("지금은 문제를 스킵할 수 없습니다.");
      }

      const currentDrawerPlayerId =
        game.drawerOrder[game.currentDrawerIndex] ?? null;

      if (currentDrawerPlayerId !== socket.id) {
        throw new Error("현재 출제자만 문제를 스킵할 수 있습니다.");
      }

      catchMindGameManager.finishRound(data.roomId, true);

      emitCatchMindState(io, data.roomId);
      scheduleRoundResultTimeout(io, data.roomId);
    } catch (error) {
      console.error("캐치마인드 스킵 실패", error);
    }
  };
}