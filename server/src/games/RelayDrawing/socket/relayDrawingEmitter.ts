import type { Server } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { roomManager } from "../../../managers/RoomManager";
import { relayDrawingGameManager } from "../RelayDrawingGameManager";

export function emitRelayDrawingState(
  io: Server,
  roomId: string,
) {
  const room = roomManager.getRoom(roomId);

  if (!room) return;

  if (
    room.game !== "릴레이 드로잉" ||
    room.status !== "playing"
  ) {
    return;
  }

  room.playerIds.forEach((playerId) => {
    try {
      const state =
        relayDrawingGameManager.toClientState(
          roomId,
          playerId,
        );

      io.to(playerId).emit(
        EVENTS.RELAY_DRAWING_STATE,
        state,
      );
    } catch (error) {
      console.error(
        "릴레이 드로잉 상태 전송 실패",
        {
          roomId,
          playerId,
          error,
        },
      );
    }
  });
}