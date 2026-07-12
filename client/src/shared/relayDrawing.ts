export type RelayWordVisibility =
  | "ALL_DRAWERS"
  | "FIRST_DRAWER_ONLY";

export type RelayDrawingPhase =
  | "READY"
  | "ROUND_PREPARE"
  | "DRAWING"
  | "ROUND_RESULT"
  | "GAME_END";

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  color: string;
  width: number;
  points: DrawingPoint[];
  playerId: string;
};

export type RelayDrawingSettings = {
  gameDuration: number;
  turnDuration: number;
  wordVisibility: RelayWordVisibility;
  passEnabled: boolean;
};

export type RelayDrawingPlayer = {
  playerId: string;
  name: string;
  isConnected: boolean;
};

export type RelayRoundResult = {
  word: string;
  success: boolean;
  guesserPlayerId: string;
  solvedAt: number | null;
};

export type RelayDrawingGameState = {
  roomId: string;
  phase: RelayDrawingPhase;
  settings: RelayDrawingSettings;

  players: RelayDrawingPlayer[];

  guesserPlayerId: string | null;
  guesserQueue: string[];

  drawerOrder: string[];
  currentDrawerIndex: number;
  currentDrawerPlayerId: string | null;

  answer: string | null;
  strokes: DrawingStroke[];

  successCount: number;
  failedCount: number;
  roundNumber: number;
  roundResults: RelayRoundResult[];

  gameEndsAt: number | null;
  turnEndsAt: number | null;
  resultEndsAt: number | null;
};

export type ClientRelayDrawingGameState = Omit<
  RelayDrawingGameState,
  "answer"
> & {
  answer: string | null;
  serverNow: number;
};