export type RelayWordVisibility =
  | "ALL_DRAWERS"
  | "FIRST_DRAWER_ONLY";

export type RelayDrawingPhase =
  | "READY"
  | "ROUND_PREPARE"
  | "DRAWING"
  | "FINAL_GUESS"
  | "ROUND_RESULT"
  | "GAME_END";

export type RelayDrawingSettings = {
  gameDuration: number;
  turnDuration: number;
  prepareTime: number;
  finalGuessTime: number;
  wordVisibility: RelayWordVisibility;
  passEnabled: boolean;
};

export type RelayDrawingPoint = {
  x: number;
  y: number;
};

export type RelayDrawingStroke = {
  playerId: string;
  color: string;
  width: number;
  points: RelayDrawingPoint[];
};

export type RelayDrawingPlayer = {
  playerId: string;
  name: string;
  isConnected: boolean;
};

export type RelayRoundResult = {
  roundNumber: number;
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
  chats: RelayDrawingChat[];
  strokes: RelayDrawingStroke[];

  successCount: number;
  failedCount: number;
  roundNumber: number;

  roundResults: RelayRoundResult[];

  /**
   * 절대 시각(Date.now()) 기준
   */
  gameEndsAt: number | null;
  turnEndsAt: number | null;
  resultEndsAt: number | null;
};

export type RelayDrawingChat = {
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

export type ClientRelayDrawingGameState = Omit<
  RelayDrawingGameState,
  "answer" | "guesserQueue"
> & {

  answer: string | null;

  serverNow: number;
};

export const DEFAULT_RELAY_DRAWING_SETTINGS: RelayDrawingSettings = {
  gameDuration: 300,
  prepareTime: 3,
  turnDuration: 12,
  finalGuessTime: 10,
  wordVisibility: "ALL_DRAWERS",
  passEnabled: false,
};