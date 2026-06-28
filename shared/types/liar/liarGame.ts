export type LiarPhase =
  | "WAITING"
  | "DESCRIPTION"
  | "REACTION"
  | "DISCUSSION"
  | "VOTING"
  | "TIE_SPEECH"
  | "REVOTE"
  | "RESULT";

export type LiarPlayerStatus =
  | "WAITING"
  | "ACTIVE"
  | "DONE"
  | "LEFT";

export interface LiarGameSettings {
  liarCount: number;
  roundCount: number;
  descriptionTime: number;
  discussionTime: number;
  voteTime: number;
  tieSpeechTime: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
}

export interface LiarDescription {
  playerId: string;
  playerName: string;
  text: string;
  likes: string[];
  dislikes: string[];
  createdAt: number;
}

export interface LiarPlayerState {
  playerId: string;
  name: string;
  score: number;
  keyword?: string;
  isLiar?: boolean;
  status: LiarPlayerStatus;
}

export interface LiarGameState {
  roomId: string;
  phase: LiarPhase;
  round: number;
  settings: LiarGameSettings;

  players: LiarPlayerState[];

  descriptionOrder: string[];
  currentDescriptionIndex: number;

  descriptions: LiarDescription[];
  normalChats: {
    playerId: string;
    playerName: string;
    text: string;
    createdAt: number;
  }[];

  votes: Record<string, string>;
  tieCandidates: string[];

  timerEndsAt: number | null;
  paused: boolean;
}

export interface ClientLiarPlayerState {
  playerId: string;
  name: string;
  score: number;
  status: LiarPlayerStatus;
}

export interface ClientLiarGameState {
  roomId: string;
  phase: LiarPhase;
  round: number;
  settings: LiarGameSettings;

  players: ClientLiarPlayerState[];

  myKeyword: string | null;

  descriptionOrder: string[];
  currentDescriptionIndex: number;

  descriptions: LiarDescription[];
  normalChats: {
    playerId: string;
    playerName: string;
    text: string;
    createdAt: number;
  }[];

  votes: Record<string, string>;
  tieCandidates: string[];

  timerEndsAt: number | null;
  paused: boolean;
}