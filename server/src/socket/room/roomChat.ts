import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../shared/events";
import { playerManager } from "../../managers/PlayerManager";
import { roomManager } from "../../managers/RoomManager";

export function registerRoomChat(io: Server, socket: Socket) {
  socket.on(EVENTS.ROOM_SEND_CHAT, ({ roomId, text }) => {
    const player = playerManager.getPlayer(socket.id);

    if (!player) return;

    const room = roomManager.getRoom(roomId);

    if (!room) return;

    const chat = {
      playerId: player.id,
      playerName: player.nickname,
      text,
      createdAt: Date.now(),
    };

    room.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.ROOM_CHAT_MESSAGE, chat);
    });
  });
}