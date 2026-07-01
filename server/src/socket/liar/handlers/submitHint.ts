import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitLiarState } from "../liarEmitter";
import {
  scheduleDescriptionTimeout,
  scheduleDiscussionPhase,
} from "../liarScheduler";

export function submitHint(io: Server, socket: Socket) {
  return (data: { roomId: string; text: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      liarGameManager.submitDescription(data.roomId, player.id, data.text);
      emitLiarState(io, data.roomId);

      const game = liarGameManager.getGame(data.roomId);

      if (game?.phase === "DESCRIPTION") {
        scheduleDescriptionTimeout(io, data.roomId);
        return;
      }

      if (game?.phase === "REACTION") {
        scheduleDiscussionPhase(io, data.roomId);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "설명 제출 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}