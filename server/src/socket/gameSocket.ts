import type { Server, Socket } from "socket.io";
import { EVENTS } from "../shared/events";
import { roomManager } from "../managers/RoomManager";
import { playerManager } from "../managers/PlayerManager";
import { liarGameManager } from "../managers/LiarGameManager";

export function registerGameSocket(io: Server, socket: Socket) {
  socket.on(EVENTS.LIAR_START_GAME, (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);

    if (!room) {
      socket.emit(EVENTS.START_GAME_FAILED, "방을 찾을 수 없습니다.");
      return;
    }

    const players = room.playerIds
      .map((playerId) => playerManager.getPlayer(playerId))
      .filter((player): player is { id: string; nickname: string } =>
        Boolean(player)
      )
      .map((player) => ({
        id: player.id,
        name: player.nickname,
      }));

    const settings = {
      liarCount: 1,
      roundCount: 5,
      descriptionTime: 20,
      discussionTime: 120,
      voteTime: 30,
      tieSpeechTime: 20,
      minDescriptionLength: 2,
      maxDescriptionLength: 30,
    };

    liarGameManager.createGame(room.id, players, settings);
    liarGameManager.startRound(room.id);

    players.forEach((player) => {
      io.to(player.id).emit(
        EVENTS.LIAR_GAME_STATE,
        liarGameManager.toClientState(room.id, player.id)
      );
    });
  });
}