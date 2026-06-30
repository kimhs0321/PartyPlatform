import type { Server } from "socket.io";
import { playerManager } from "../../managers/PlayerManager";
import { liarGameManager } from "../../managers/LiarGameManager";
import { emitLiarState } from "./liarEmitter";
import { scheduleDescriptionPhase } from "./liarScheduler";

type StartedRoom = {
  id: string;
  playerIds: string[];
};

export function startLiarGame(io: Server, startedRoom: StartedRoom) {
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