import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { relayDrawingGameManager } from "../../RelayDrawingGameManager";
import { emitRelayDrawingState } from "../relayDrawingEmitter";
import { scheduleRelayRoundResultTimeout } from "../relayDrawingScheduler";

export function sendChat(
  io: Server,
  socket: Socket,
) {
  return (
    data: {
      roomId: string;
      text: string;
    },
  ) => {
    const player =
      playerManager.getPlayer(socket.id);

    if (!player) return;

    try {
      const beforeGame =
        relayDrawingGameManager.getGame(
          data.roomId,
        );

      const beforePhase =
        beforeGame?.phase;

      relayDrawingGameManager.submitGuess(
        data.roomId,
        player.id,
        data.text,
      );

      emitRelayDrawingState(
        io,
        data.roomId,
      );

      const afterGame =
        relayDrawingGameManager.getGame(
          data.roomId,
        );

      if (
        beforePhase === "DRAWING" &&
        afterGame?.phase === "ROUND_RESULT"
      ) {
        scheduleRelayRoundResultTimeout(
          io,
          data.roomId,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "채팅 전송 중 오류가 발생했습니다.";

      socket.emit(
        EVENTS.START_GAME_FAILED,
        message,
      );
    }
  };
}