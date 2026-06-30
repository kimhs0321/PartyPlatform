import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import { gameManager } from "../../../managers/GameManager";
import { liarGameManager } from "../../../managers/LiarGameManager";
import { emitRooms } from "../../common/roomEmitter";
import { emitLiarState } from "../../liar/liarEmitter";
import { scheduleDescriptionPhase } from "../../liar/liarScheduler";

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
      const players = startedRoom.playerIds
        .map((playerId) => playerManager.getPlayer(playerId))
        .filter((player): player is { id: string; nickname: string } =>
          Boolean(player)
        )
        .map((player) => ({
          id: player.id,
          name: player.nickname,
        }));

      liarGameManager.createGame(startedRoom.id, players, {
        liarCount: 1,
        roundCount: 5,
        descriptionTime: 20,
        discussionTime: 120,
        voteTime: 30,
        tieSpeechTime: 20,
        minDescriptionLength: 2,
        maxDescriptionLength: 30,
      });

      liarGameManager.startRound(startedRoom.id);
      emitLiarState(io, startedRoom.id);
      scheduleDescriptionPhase(io, startedRoom.id);
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