import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRooms } from "../../common/roomEmitter";

type CreateRoomData = {
  title: string;
  game: string;
  maxPlayers: number;
  password?: string;
};

export function createRoom(io: Server, socket: Socket) {
  return (data: CreateRoomData) => {
    const host = playerManager.getPlayer(socket.id);
    if (!host) return;

    const room = roomManager.createRoom(
      data.title,
      host,
      data.maxPlayers,
      data.password ?? "",
      data.game
    );

    playerManager.setPlayerRoom(socket.id, room.id);

    socket.emit(EVENTS.CREATE_ROOM_SUCCESS, room);

    emitRooms(io);

    console.log("방 생성:", room);
  };
}