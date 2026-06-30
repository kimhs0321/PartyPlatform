import type { Server, Socket } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { endRoomGame } from "../../common/endRoomGame";

export function endGame(io: Server, socket: Socket) {
  return () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const room = roomManager.getRoom(player.roomId);
    if (!room || room.hostId !== player.id) return;

    endRoomGame(io, player.roomId);

    console.log(`${room.title} 게임 종료`);
  };
}