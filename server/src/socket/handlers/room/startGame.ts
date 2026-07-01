import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { gameManager } from "../../../managers/GameManager";
import { emitRooms } from "../../common/roomEmitter";
import { startLiarGame } from "../../liar/startLiarGame";

export function startGame(io: Server, socket: Socket) {
  return () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const canStart = roomManager.canStartGame(player.roomId, player.id);

    if (!canStart) {
      socket.emit(EVENTS.START_GAME_FAILED, "게임을 시작할 수 없습니다.");
      return;
    }

    const startedRoom = roomManager.startGame(player.roomId);
    if (!startedRoom) return;

    gameManager.startGame(startedRoom);

    if (startedRoom.game === "라이어 게임") {
      startLiarGame(io, startedRoom);
    }

    const roomDto = roomManager.toRoomDto(startedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) return;

    startedRoom.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.GAME_STARTED, roomDto);
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });

    emitRooms(io);

    console.log(`${startedRoom.title} 게임 시작`);
  };
}