import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../../shared/events";
import { playerManager } from "../../../../managers/PlayerManager";
import { catchMindGameManager } from "../../CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import {
  scheduleDrawingTimeout,
  scheduleHintUpdates,
} from "../catchMindScheduler";

export function selectWord(io: Server, socket: Socket) {
  return (data: { roomId: string; word: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      catchMindGameManager.selectWord(
        data.roomId,
        socket.id,
        data.word
      );

      emitCatchMindState(io, data.roomId);

      scheduleHintUpdates(io, data.roomId);
      scheduleDrawingTimeout(io, data.roomId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "단어 선택 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}