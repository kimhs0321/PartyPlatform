export type CatchMindPhase =
  | "WAITING"
  | "WORD_SELECT"
  | "DRAWING"
  | "ROUND_RESULT"
  | "GAME_END";

export type CatchMindGameSettings = {
  roundCount: number;
  wordSelectTime: number;
  drawingTime: number;
  roundResultTime: number;
};

export type CatchMindPlayerStatus =
  | "WAITING"
  | "DRAWING"
  | "GUESSED"
  | "LEFT";

export type CatchMindPlayerState = {
  playerId: string;
  name: string;

  score: number;
  scoreDelta: number;
  scoreReasons: string[];

  status: CatchMindPlayerStatus;
};

export type CatchMindChat = {
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  color: string;
  width: number;
  points: DrawingPoint[];
};

export type CatchMindGameState = {
  roomId: string;

  phase: CatchMindPhase;
  round: number;

  settings: CatchMindGameSettings;

  players: CatchMindPlayerState[];

  drawerOrder: string[];
  currentDrawerIndex: number;

  answer: string | null;
  wordCandidates: string[];

  guessedPlayerIds: string[];

  chats: CatchMindChat[];
  strokes: DrawingStroke[];

  timerEndsAt: number | null;
  remainingTimeMs: number | null;
  paused: boolean;
};

export type ClientCatchMindGameState = {
  roomId: string;

  phase: CatchMindPhase;
  round: number;

  settings: CatchMindGameSettings;

  players: CatchMindPlayerState[];

  currentDrawerPlayerId: string | null;

  drawerOrder: string[];

  wordCandidates: string[];

  answer: string | null;

  hint: string;

  guessedPlayerIds: string[];

  chats: CatchMindChat[];
  strokes: DrawingStroke[];

  timerEndsAt: number | null;
  remainingTimeMs: number | null;
  remainingSeconds: number;
  serverNow: number;

  paused: boolean;
};