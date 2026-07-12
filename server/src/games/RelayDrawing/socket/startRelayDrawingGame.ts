import type { Server } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { relayDrawingGameManager } from "../RelayDrawingGameManager";
import { emitRelayDrawingState } from "./relayDrawingEmitter";
import {
  scheduleRelayGameTimeout,
  scheduleRelayPrepareTimeout,
} from "./relayDrawingScheduler";
import type { RelayDrawingSettings } from "../../../shared/types/relayDrawing";

type StartedRoom = {
  id: string;
  playerIds: string[];
  gameSettings: {
    relayDrawing: RelayDrawingSettings;
  };
};

export function startRelayDrawingGame(
  io: Server,
  startedRoom: StartedRoom,
) {
  const players = startedRoom.playerIds
    .map((playerId) =>
      playerManager.getPlayer(playerId),
    )
    .filter(
      (
        player,
      ): player is {
        id: string;
        nickname: string;
      } => Boolean(player),
    )
    .map((player) => ({
      playerId: player.id,
      name: player.nickname,
      isConnected: true,
    }));

  relayDrawingGameManager.createGame(
    startedRoom.id,
    players,
    startedRoom.gameSettings.relayDrawing,
  );

  relayDrawingGameManager.startGame(
    startedRoom.id,
  );

  relayDrawingGameManager.startRound(
    startedRoom.id,
  );

  emitRelayDrawingState(
    io,
    startedRoom.id,
  );

  scheduleRelayPrepareTimeout(
    io,
    startedRoom.id,
  );

  scheduleRelayGameTimeout(
    io,
    startedRoom.id,
  );
}