import type { Server } from "socket.io";
import { EVENTS } from "../../shared/events";
import { roomManager } from "../../managers/RoomManager";
import { liarGameManager } from "../../managers/LiarGameManager";

export function emitLiarState(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  room.playerIds.forEach((playerId) => {
    const state = liarGameManager.toClientState(roomId, playerId);
    io.to(playerId).emit(EVENTS.LIAR_GAME_STATE, state);
  });
}