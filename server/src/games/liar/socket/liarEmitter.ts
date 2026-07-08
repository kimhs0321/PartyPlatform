import type { Server } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { roomManager } from "../../../managers/RoomManager";
import { liarGameManager } from "../LiarGameManager";

export function emitLiarState(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  if (room.game !== "라이어 게임" || room.status !== "playing") return;

  room.playerIds.forEach((playerId) => {
    try {
      const state = liarGameManager.toClientState(roomId, playerId);
      io.to(playerId).emit(EVENTS.LIAR_GAME_STATE, state);
    } catch (error) {
      console.warn("라이어게임 상태 전송 생략:", error);
    }
  });
}