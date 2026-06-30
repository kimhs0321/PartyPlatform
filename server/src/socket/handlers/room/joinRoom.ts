import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRoomInfo, emitRooms } from "../../common/roomEmitter";

export function joinRoom(io: Server, socket: Socket) {
  return (roomId: string) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    const room = roomManager.joinRoom(roomId, player.id);
    if (!room) return;

    playerManager.setPlayerRoom(socket.id, room.id);

    socket.emit(EVENTS.JOIN_ROOM_SUCCESS, room);
    emitRooms(io);
    emitRoomInfo(io, room.id);

    console.log(`${player.nickname}님이 ${room.title} 방에 입장`);
  };
}