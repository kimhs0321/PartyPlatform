import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRoomInfo, emitRooms } from "../../common/roomEmitter";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitLiarState } from "../../liar/liarEmitter";


export function leaveRoom(io: Server, socket: Socket) {
  return () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const roomId = player.roomId;

    liarGameManager.markPlayerLeft(player.roomId, player.id);
    emitLiarState(io, player.roomId);

    const updatedRoom = roomManager.leaveRoom(roomId, player.id);

    playerManager.setPlayerRoom(socket.id, "");

    if (updatedRoom) {
      emitRoomInfo(io, updatedRoom.id);
    }

    emitRooms(io);

    socket.emit(EVENTS.LEAVE_ROOM);
  };
}