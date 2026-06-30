import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitLiarState } from "../liarEmitter";
import { scheduleDiscussionPhase } from "../liarScheduler";

export function submitHint(io: Server, socket: Socket) {
  return (data: { roomId: string; text: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    console.log("=== 설명 제출 이벤트 도착 ===");
    console.log("data:", data);

    try {
      const game = liarGameManager.getGame(data.roomId);
      console.log("현재 phase:", game?.phase);

      liarGameManager.submitDescription(data.roomId, player.id, data.text);

      console.log("submitDescription 성공");

      emitLiarState(io, data.roomId);

      const updatedGame = liarGameManager.getGame(data.roomId);

      if (updatedGame?.phase === "REACTION") {
        scheduleDiscussionPhase(io, data.roomId);
      }
    } catch (error) {
      console.error("submitDescription 에러:", error);

      const message =
        error instanceof Error
          ? error.message
          : "설명 제출 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}