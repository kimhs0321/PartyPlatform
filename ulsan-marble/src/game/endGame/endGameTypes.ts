export type GameRoundLimit = 30 | 50 | 70 | null;

export type GameEndReason = "LAST_SURVIVOR" | "ROUND_LIMIT";

export interface FinalAssetBreakdown {
  playerId: string;
  playerName: string;
  playerColor: string;
  cash: number;
  generalDeposit: number;
  savingsPrincipal: number;
  stockValue: number;
  propertySaleValue: number;
  portRecoveryValue: number;
  liquidAssets: number;
  totalAssets: number;
}

export interface FinalRankingEntry extends FinalAssetBreakdown {
  rank: number;
}

export interface GameResult {
  reason: GameEndReason;
  completedRound: number;
  roundLimit: GameRoundLimit;
  winnerPlayerIds: string[];
  rankings: FinalRankingEntry[];
}
