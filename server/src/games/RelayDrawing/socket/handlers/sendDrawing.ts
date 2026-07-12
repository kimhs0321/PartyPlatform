import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { relayDrawingGameManager } from "../../RelayDrawingGameManager";
import { emitRelayDrawingState } from "../relayDrawingEmitter";
import type { RelayDrawingStroke } from "../../../../shared/types/relayDrawing";

export function sendDrawing(
  io: Server,
  socket: Socket,
) {
  return (
    data: {
      roomId: string;
      stroke: RelayDrawingStroke;
    },
  ) => {
    const player =
      playerManager.getPlayer(socket.id);

    if (!player) return;

    try {
      relayDrawingGameManager.addStroke(
        data.roomId,
        player.id,
        data.stroke,
      );

      emitRelayDrawingState(
        io,
        data.roomId,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "그림 전송 중 오류가 발생했습니다.";

      socket.emit(
        EVENTS.START_GAME_FAILED,
        message,
      );
    }
  };
}