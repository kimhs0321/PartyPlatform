import type { Server } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../LiarGameManager";
import { emitLiarState } from "./liarEmitter";
import { scheduleDescriptionPhase } from "./liarScheduler";
import type { LiarGameSettings } from "../../../shared/types/liarGame";

type StartedRoom = {
  id: string;
  playerIds: string[];
  gameSettings: {
    liar: LiarGameSettings;
  };
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

  liarGameManager.createGame(
    startedRoom.id,
    players,
    startedRoom.gameSettings.liar
  );

  liarGameManager.startRound(startedRoom.id);
  emitLiarState(io, startedRoom.id);

 scheduleDescriptionPhase(io, startedRoom.id);
    
}