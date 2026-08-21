import type { DiceValue } from "../dice";

export type MiniGameId =
  | "TIMING_STOP"
  | "TARGET_DICE"
  | "ODD_EVEN"
  | "HIGH_LOW";

export type MiniGameCategory = "PRIZE" | "BETTING";
export type MiniGameStage = "PLAYING" | "RESULT";
export type OddEvenChoice = "ODD" | "EVEN";
export type HighLowChoice = "HIGH" | "LOW";

export interface MiniGameDefinition {
  id: MiniGameId;
  name: string;
  category: MiniGameCategory;
  description: string;
}

export interface MiniGameDeckState {
  drawPile: MiniGameId[];
  cycle: number;
}

export interface MiniGameState {
  deck: MiniGameDeckState;
}

export interface TimingStopAttempt {
  playerId: string;
  distance: number;
  responseMs: number;
}

export interface TargetDiceAttempt {
  playerId: string;
  diceValues: [DiceValue, DiceValue];
  total: number;
  distance: number;
}

export interface MiniGameBet<TChoice extends string> {
  playerId: string;
  choice: TChoice | null;
  amount: number;
}

export interface MiniGameSettlement {
  playerId: string;
  stake: number;
  payout: number;
  result: "WIN" | "LOSE" | "REFUND" | "PASS";
}

interface PendingMiniGameBase {
  arrivalPlayerId: string;
  eligiblePlayerIds: string[];
  currentPlayerIndex: number;
  round: number;
  stage: MiniGameStage;
  winnerPlayerId: string | null;
  resultText: string | null;

  deadlineAt: number | null;
}

export interface PendingTimingStopMiniGame extends PendingMiniGameBase {
  gameId: "TIMING_STOP";
  roundPlayerIds: string[];
  attempts: TimingStopAttempt[];
}

export interface PendingTargetDiceMiniGame extends PendingMiniGameBase {
  gameId: "TARGET_DICE";
  roundPlayerIds: string[];
  targetNumber: number;
  attempts: TargetDiceAttempt[];
}

export interface PendingOddEvenMiniGame extends PendingMiniGameBase {
  gameId: "ODD_EVEN";
  bets: Array<MiniGameBet<OddEvenChoice>>;
  diceValues: [DiceValue, DiceValue] | null;
  settlements: MiniGameSettlement[];
}

export interface PendingHighLowMiniGame extends PendingMiniGameBase {
  gameId: "HIGH_LOW";
  firstNumber: 4 | 5 | 6;
  secondNumber: number | null;
  bets: Array<MiniGameBet<HighLowChoice>>;
  settlements: MiniGameSettlement[];
}

export type PendingMiniGame =
  | PendingTimingStopMiniGame
  | PendingTargetDiceMiniGame
  | PendingOddEvenMiniGame
  | PendingHighLowMiniGame;

export type MiniGameError =
  | "NO_PENDING_MINIGAME"
  | "WRONG_GAME"
  | "NOT_CURRENT_PLAYER"
  | "INVALID_BET"
  | "INSUFFICIENT_CASH"
  | "PAYMENT_FAILED";
