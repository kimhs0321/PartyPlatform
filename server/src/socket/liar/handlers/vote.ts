import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { endRoomGame } from "../../common/endRoomGame";
import { emitLiarState } from "../liarEmitter";
import { handleAfterVoteResolved } from "../liarScheduler";

export function vote(io: Server, socket: Socket) {
  return (data: { roomId: string; targetId: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      liarGameManager.submitVote(data.roomId, player.id, data.targetId);
      emitLiarState(io, data.roomId);

      handleAfterVoteResolved(io, data.roomId, (roomId) =>
        endRoomGame(io, roomId)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "투표 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}