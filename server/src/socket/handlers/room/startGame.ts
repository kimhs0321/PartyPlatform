import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { gameManager } from "../../../managers/GameManager";
import { emitRooms } from "../../common/roomEmitter";
import { findGameModuleByName } from "../../../games/common/GameRegistry";

export function startGame(io: Server, socket: Socket) {
  return async () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const canStart = roomManager.canStartGame(player.roomId, player.id);

    if (!canStart) {
      socket.emit(EVENTS.START_GAME_FAILED, "게임을 시작할 수 없습니다.");
      return;
    }

    const startedRoom = roomManager.startGame(player.roomId);
    if (!startedRoom) return;

    const gameModule = findGameModuleByName(startedRoom.game);

    if (!gameModule?.enabled || !gameModule.startGame) {
      socket.emit(EVENTS.START_GAME_FAILED, "현재 실행할 수 없는 게임입니다.");
      return;
    }

    gameManager.startGame(startedRoom);

    await gameModule.startGame(io, startedRoom);

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