export type RoomPlayerDto = {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
};

export type RoomDto = {
  id: string;
  title: string;
  hostId: string;
  maxPlayers: number;
  game: string;
  players: RoomPlayerDto[];
  status: "waiting" | "playing" | "paused";
};