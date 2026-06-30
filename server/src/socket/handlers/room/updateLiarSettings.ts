import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import type { LiarGameSettings } from "../../../shared/types/liarGame";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRoomInfo, emitRooms } from "../../common/roomEmitter";

export function updateLiarSettings(io: Server, socket: Socket) {
  return (settings: Partial<LiarGameSettings>) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const room = roomManager.getRoom(player.roomId);
    if (!room || room.hostId !== player.id) return;

    const updatedRoom = roomManager.updateLiarSettings(room.id, settings);
    if (!updatedRoom) return;

    emitRoomInfo(io, updatedRoom.id);
    emitRooms(io);
  };
}