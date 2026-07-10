import type { Server } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { catchMindGameManager } from "../CatchMindGameManager";
import { emitCatchMindState } from "./catchMindEmitter";
import { scheduleWordSelectTimeout } from "./catchMindScheduler";
import type { CatchMindGameSettings } from "../types/catchMindGame";

type StartedRoom = {
  id: string;
  playerIds: string[];
  gameSettings: {
    catchMind: CatchMindGameSettings;
  };
};

export function startCatchMindGame(io: Server, startedRoom: StartedRoom) {
  const players = startedRoom.playerIds
    .map((playerId) => playerManager.getPlayer(playerId))
    .filter((player): player is { id: string; nickname: string } =>
      Boolean(player)
    )
    .map((player) => ({
      id: player.id,
      name: player.nickname,
    }));

  catchMindGameManager.createGame(
    startedRoom.id,
    players,
    startedRoom.gameSettings.catchMind
  );

  catchMindGameManager.startRound(startedRoom.id);
  emitCatchMindState(io, startedRoom.id);

  //scheduleWordSelectTimeout(io, startedRoom.id);
}