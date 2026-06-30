import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitLiarState } from "../liarEmitter";

export function submitReaction(io: Server, socket: Socket) {
  return (data: {
    roomId: string;
    targetPlayerId: string;
    reaction: "LIKE" | "DISLIKE";
  }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      liarGameManager.submitReaction(
        data.roomId,
        player.id,
        data.targetPlayerId,
        data.reaction
      );

      emitLiarState(io, data.roomId);
    } catch (error) {
      socket.emit(
        EVENTS.START_GAME_FAILED,
        error instanceof Error ? error.message : "설명 평가에 실패했습니다."
      );
    }
  };
}