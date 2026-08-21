export type LotteryShopError =
  | "NO_PENDING_SHOP"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_FUNDS"
  | "SCRATCH_LIMIT_REACHED"
  | "LOTTO_LIMIT_REACHED";

export type ScratchPrizeTier =
  | "MISS"
  | "SMALL"
  | "REFUND"
  | "WIN"
  | "BIG"
  | "JACKPOT";

export interface ScratchPrizeRule {
  tier: ScratchPrizeTier;
  label: string;
  probability: number;
  prizeAmount: number;
}

export interface ScratchLotteryResult {
  id: string;
  tier: ScratchPrizeTier;
  label: string;
  prizeAmount: number;
}

export interface LottoTicket {
  id: string;
  playerId: string;
  drawNumber: number;
  numbers: number[];
  purchasedTurn: number;
}

export interface LottoState {
  drawNumber: number;
  jackpot: number;
  tickets: LottoTicket[];
}

export type LottoPrizeRank = 1 | 2 | 3 | 4 | null;

export interface LottoTicketResult {
  ticketId: string;
  playerId: string;
  numbers: number[];
  matchCount: number;
  rank: LottoPrizeRank;
  prizeAmount: number;
}

export interface LottoPlayerPrize {
  playerId: string;
  prizeAmount: number;
  winningTicketCount: number;
}

export interface LottoDrawResult {
  drawNumber: number;
  winningNumbers: number[];
  totalTicketCount: number;
  jackpotBefore: number;
  jackpotAfter: number;
  ticketResults: LottoTicketResult[];
  playerPrizes: LottoPlayerPrize[];
}

export interface PendingLotteryShop {
  playerId: string;
  visitId: string;
  scratchPurchaseCount: number;
  lottoPurchaseCount: number;
  latestScratchResult:
    ScratchLotteryResult | null;
}

export type LottoDrawResolutionMode = "SCHEDULED" | "DEV";

export interface PendingLottoDrawResolution {
  drawId: string;
  turnNumber: number;
  turnSequence: number;
  result: LottoDrawResult;
  mode: LottoDrawResolutionMode;
  additionallyDisabledPlayerIds:
    string[];
}