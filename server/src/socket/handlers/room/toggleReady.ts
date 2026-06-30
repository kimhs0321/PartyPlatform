import type { Server, Socket } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRoomInfo, emitRooms } from "../../common/roomEmitter";

export function toggleReady(io: Server, socket: Socket) {
  return () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const updatedRoom = roomManager.toggleReady(player.roomId, player.id);
    if (!updatedRoom) return;

    emitRoomInfo(io, updatedRoom.id);
    emitRooms(io);
  };
}