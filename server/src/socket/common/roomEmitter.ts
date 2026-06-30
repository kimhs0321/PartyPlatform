import type { Server } from "socket.io";
import { EVENTS } from "../../shared/events";
import { playerManager } from "../../managers/PlayerManager";
import { roomManager } from "../../managers/RoomManager";

export function emitRoomInfo(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const roomDto = roomManager.toRoomDto(room.id, (playerId) =>
    playerManager.getPlayer(playerId)
  );

  if (!roomDto) return;

  room.playerIds.forEach((playerId) => {
    io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
  });
}

export function emitRooms(io: Server) {
  io.emit(EVENTS.ROOMS, roomManager.getAllRooms());
}