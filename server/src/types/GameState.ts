export type GamePhase = "created" | "playing" | "ended";

export type GameState = {
  roomId: string;
  game: string;
  phase: GamePhase;
  startedAt: number;
};