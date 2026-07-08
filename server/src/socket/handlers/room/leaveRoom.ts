import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { emitRoomInfo, emitRooms } from "../../common/roomEmitter";
import { liarGameManager } from "../../../games/liar/LiarGameManager";
import { emitLiarState } from "../../../games/liar/socket/liarEmitter";


export function leaveRoom(io: Server, socket: Socket) {
  return () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const roomId = player.roomId;
    const room = roomManager.getRoom(roomId);

    if (room?.game === "라이어 게임" && room.status === "playing") {
      try {
        liarGameManager.markPlayerLeft(roomId, player.id);
        emitLiarState(io, roomId);
      } catch (error) {
        console.warn("라이어게임 상태 전송 생략:", error);
      }
    }

    const updatedRoom = roomManager.leaveRoom(roomId, player.id);

    playerManager.setPlayerRoom(socket.id, "");

    if (updatedRoom) {
      emitRoomInfo(io, updatedRoom.id);
    }

    emitRooms(io);

    socket.emit(EVENTS.LEAVE_ROOM);
  };
}