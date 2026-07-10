import type { Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { catchMindGameManager } from "../../CatchMindGameManager";

export function getGameState(socket: Socket) {
  return () => {
    try {
      const player = playerManager.getPlayer(socket.id);

      if (!player?.roomId) return;

      const state = catchMindGameManager.toClientState(
        player.roomId,
        player.id
      );

      socket.emit(EVENTS.CATCH_MIND_STATE, state);
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "캐치마인드 상태 조회 중 오류가 발생했습니다.",
      });
    }
  };
}