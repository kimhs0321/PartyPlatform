import type { Server } from "socket.io";
import { EVENTS } from "../../shared/events";
import { playerManager } from "../../managers/PlayerManager";
import { roomManager } from "../../managers/RoomManager";
import { gameManager } from "../../managers/GameManager";
import { liarGameManager } from "../../managers/LiarGameManager";
import { emitRooms } from "./roomEmitter";

export function endRoomGame(io: Server, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const endedRoom = roomManager.endGame(roomId);
  if (!endedRoom) return;

  gameManager.endGame(roomId);
  liarGameManager.deleteGame(roomId);

  const roomDto = roomManager.toRoomDto(endedRoom.id, (playerId) =>
    playerManager.getPlayer(playerId)
  );

  if (!roomDto) return;

  endedRoom.playerIds.forEach((playerId) => {
    io.to(playerId).emit(EVENTS.GAME_ENDED, roomDto);
    io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
  });

  emitRooms(io);
}