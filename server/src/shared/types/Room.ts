import type { LiarGameSettings } from "./liarGame";
import type { CatchMindGameSettings } from "./catchMindGame";
import type { RelayDrawingSettings } from "./relayDrawing";
import type { UlsanMarbleSettings } from "./ulsanMarble";

export type RoomStatus = "waiting" | "playing" | "paused";

export type Room = {
  id: string;
  title: string;
  hostId: string;
  maxPlayers: number;
  playerIds: string[];
  readyPlayerIds: string[];
  password: string;
  status: RoomStatus;
  game: string;

  gameSettings: {
    liar: LiarGameSettings;
    catchMind: CatchMindGameSettings;
    relayDrawing: RelayDrawingSettings;
    ulsanMarble: UlsanMarbleSettings;
  };
};