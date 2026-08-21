import type { Server } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { ulsanMarbleGameManager } from "./../UlsanMarbleGameManager";

export function emitUlsanMarbleState(
  io: Server,
  roomId: string,
): void {
  const state =
    ulsanMarbleGameManager.getGame(roomId);

  if (!state) return;

  state.playerIds.forEach((playerId) => {
    io.to(playerId).emit(
      EVENTS.ULSAN_MARBLE_STATE,
      state,
    );
  });
}