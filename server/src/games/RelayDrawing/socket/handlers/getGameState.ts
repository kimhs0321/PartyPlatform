import type { Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { relayDrawingGameManager } from "../../RelayDrawingGameManager";

export function getGameState(socket: Socket) {
  return () => {
    try {
      const player =
        playerManager.getPlayer(socket.id);

      if (!player?.roomId) return;

      const state =
        relayDrawingGameManager.toClientState(
          player.roomId,
          player.id,
        );

      socket.emit(
        EVENTS.RELAY_DRAWING_STATE,
        state,
      );
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "릴레이 드로잉 상태 조회 중 오류가 발생했습니다.",
      });
    }
  };
}