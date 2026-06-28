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
};