import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { relayDrawingGameManager } from "../../RelayDrawingGameManager";
import { emitRelayDrawingState } from "../relayDrawingEmitter";

export function clearCanvas(
  io: Server,
  socket: Socket,
) {
  return (data: { roomId: string }) => {
    const player =
      playerManager.getPlayer(socket.id);

    if (!player) return;

    try {
      relayDrawingGameManager.clearCanvas(
        data.roomId,
        player.id,
      );

      emitRelayDrawingState(
        io,
        data.roomId,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "캔버스 초기화 중 오류가 발생했습니다.";

      socket.emit(
        EVENTS.START_GAME_FAILED,
        message,
      );
    }
  };
}