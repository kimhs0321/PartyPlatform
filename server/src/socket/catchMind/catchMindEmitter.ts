import type { Server } from "socket.io";
import { EVENTS } from "../../shared/events";
import { roomManager } from "../../managers/RoomManager";
import { catchMindGameManager } from "../../managers/CatchMindGameManager";

export function emitCatchMindState(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  if (room.game !== "캐치마인드" || room.status !== "playing") return;

  room.playerIds.forEach((playerId) => {
    try {
      const state = catchMindGameManager.toClientState(roomId, playerId);
      io.to(playerId).emit(EVENTS.CATCH_MIND_STATE, state);
    } catch (error) {
      console.warn("캐치마인드 상태 전송 생략:", error);
    }
  });
}