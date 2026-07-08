import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../LiarGameManager";
import { emitLiarState } from "../socket/liarEmitter";
import { scheduleNextRoundOrEnd } from "../socket/liarScheduler";

export function reveal(io: Server, socket: Socket) {
  return (data: { roomId: string; guess: string }) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      liarGameManager.submitLiarGuess(data.roomId, player.id, data.guess);
      emitLiarState(io, data.roomId);

      scheduleNextRoundOrEnd(io, data.roomId);
  
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "제시어 추측 중 오류가 발생했습니다.";

      socket.emit(EVENTS.START_GAME_FAILED, message);
    }
  };
}