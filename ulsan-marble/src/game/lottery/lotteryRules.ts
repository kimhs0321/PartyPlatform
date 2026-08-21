import type {
  LottoDrawResult,
  LottoPlayerPrize,
  LottoState,
  LottoTicket,
  LottoTicketResult,
  ScratchLotteryResult,
  ScratchPrizeRule,
} from "./lotteryTypes";

export const SCRATCH_TICKET_PRICE = 20;
export const LOTTO_TICKET_PRICE = 20;
export const LOTTO_JACKPOT_CONTRIBUTION = 10;
export const MAX_SCRATCH_PURCHASES_PER_VISIT = 5;
export const MAX_LOTTO_PURCHASES_PER_VISIT = 5;
export const LOTTO_NUMBER_MIN = 1;
export const LOTTO_NUMBER_MAX = 30;
export const LOTTO_NUMBER_COUNT = 6;
export const INITIAL_LOTTO_JACKPOT = 5000;
export const LOTTO_DRAW_INTERVAL_TURNS = 5;

export const SCRATCH_PRIZE_RULES: ScratchPrizeRule[] = [
  { tier: "MISS", label: "꽝", probability: 0.5, prizeAmount: 0 },
  { tier: "SMALL", label: "소액 당첨", probability: 0.25, prizeAmount: 10 },
  { tier: "REFUND", label: "본전", probability: 0.15, prizeAmount: 20 },
  { tier: "WIN", label: "당첨", probability: 0.07, prizeAmount: 50 },
  { tier: "BIG", label: "고액 당첨", probability: 0.02, prizeAmount: 100 },
  { tier: "JACKPOT", label: "대박", probability: 0.01, prizeAmount: 500 },
];

const LOTTO_FIXED_PRIZES: Record<3 | 4 | 5, number> = {
  3: 100,
  4: 500,
  5: 2000,
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createInitialLottoState(): LottoState {
  return {
    drawNumber: 1,
    jackpot: INITIAL_LOTTO_JACKPOT,
    tickets: [],
  };
}

export function isScheduledLottoTurn(turnNumber: number): boolean {
  const safeTurn = Math.max(1, Math.trunc(turnNumber));
  return safeTurn % LOTTO_DRAW_INTERVAL_TURNS === 0;
}

function createAdjustedScratchPrizeRules(
  winProbabilityBonus: number,
): ScratchPrizeRule[] {
  const missRule = SCRATCH_PRIZE_RULES.find((rule) => rule.tier === "MISS");
  const baseMissProbability = missRule?.probability ?? 0;
  const safeBonus = Math.min(
    Math.max(winProbabilityBonus, 0),
    baseMissProbability,
  );

  if (safeBonus <= 0 || baseMissProbability >= 1) {
    return SCRATCH_PRIZE_RULES;
  }

  const baseWinProbability = 1 - baseMissProbability;
  const nextMissProbability = baseMissProbability - safeBonus;
  const winningProbabilityMultiplier =
    baseWinProbability > 0
      ? (1 - nextMissProbability) / baseWinProbability
      : 1;

  return SCRATCH_PRIZE_RULES.map((rule) =>
    rule.tier === "MISS"
      ? { ...rule, probability: nextMissProbability }
      : {
          ...rule,
          probability: rule.probability * winningProbabilityMultiplier,
        },
  );
}

export function createScratchLotteryResult(
  randomValue: number = Math.random(),
  winProbabilityBonus = 0,
): ScratchLotteryResult {
  const safeRandom = Math.min(Math.max(randomValue, 0), 0.999999999);
  const prizeRules = createAdjustedScratchPrizeRules(winProbabilityBonus);
  let cumulativeProbability = 0;

  for (const rule of prizeRules) {
    cumulativeProbability += rule.probability;

    if (safeRandom < cumulativeProbability) {
      return {
        id: createId("scratch"),
        tier: rule.tier,
        label: rule.label,
        prizeAmount: rule.prizeAmount,
      };
    }
  }

  const fallback = prizeRules[0];
  return {
    id: createId("scratch"),
    tier: fallback.tier,
    label: fallback.label,
    prizeAmount: fallback.prizeAmount,
  };
}

export function createLottoNumbers(): number[] {
  const pool = Array.from(
    { length: LOTTO_NUMBER_MAX - LOTTO_NUMBER_MIN + 1 },
    (_, index) => LOTTO_NUMBER_MIN + index,
  );

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }

  return pool
    .slice(0, LOTTO_NUMBER_COUNT)
    .sort((first, second) => first - second);
}

export function createLottoTickets(
  playerId: string,
  drawNumber: number,
  quantity: number,
  purchasedTurn: number,
): LottoTicket[] {
  const safeQuantity = Math.max(0, Math.trunc(quantity));

  return Array.from({ length: safeQuantity }, () => ({
    id: createId("lotto-ticket"),
    playerId,
    drawNumber,
    numbers: createLottoNumbers(),
    purchasedTurn,
  }));
}

export function countMatchingLottoNumbers(
  ticketNumbers: number[],
  winningNumbers: number[],
): number {
  const winningSet = new Set(winningNumbers);
  return ticketNumbers.reduce(
    (count, number) => count + (winningSet.has(number) ? 1 : 0),
    0,
  );
}

function getLottoRank(matchCount: number): 1 | 2 | 3 | 4 | null {
  if (matchCount === 6) return 1;
  if (matchCount === 5) return 2;
  if (matchCount === 4) return 3;
  if (matchCount === 3) return 4;
  return null;
}

export function createLottoDraw(
  currentState: LottoState,
): { nextState: LottoState; result: LottoDrawResult } {
  const winningNumbers = createLottoNumbers();
  const drawTickets = currentState.tickets.filter(
    (ticket) => ticket.drawNumber === currentState.drawNumber,
  );
  const remainingTickets = currentState.tickets.filter(
    (ticket) => ticket.drawNumber !== currentState.drawNumber,
  );

  const matchCounts = drawTickets.map((ticket) => ({
    ticket,
    matchCount: countMatchingLottoNumbers(ticket.numbers, winningNumbers),
  }));
  const jackpotWinnerCount = matchCounts.filter(
    ({ matchCount }) => matchCount === 6,
  ).length;
  const jackpotPrizePerTicket =
    jackpotWinnerCount > 0
      ? Math.floor(currentState.jackpot / jackpotWinnerCount)
      : 0;

  const ticketResults: LottoTicketResult[] = matchCounts.map(
    ({ ticket, matchCount }) => {
      const rank = getLottoRank(matchCount);
      let prizeAmount = 0;

      if (matchCount === 6) {
        prizeAmount = jackpotPrizePerTicket;
      } else if (matchCount === 5 || matchCount === 4 || matchCount === 3) {
        prizeAmount = LOTTO_FIXED_PRIZES[matchCount];
      }

      return {
        ticketId: ticket.id,
        playerId: ticket.playerId,
        numbers: ticket.numbers,
        matchCount,
        rank,
        prizeAmount,
      };
    },
  );

  const playerPrizeMap = new Map<string, LottoPlayerPrize>();

  for (const ticketResult of ticketResults) {
    if (ticketResult.prizeAmount <= 0) continue;

    const current = playerPrizeMap.get(ticketResult.playerId) ?? {
      playerId: ticketResult.playerId,
      prizeAmount: 0,
      winningTicketCount: 0,
    };

    playerPrizeMap.set(ticketResult.playerId, {
      playerId: ticketResult.playerId,
      prizeAmount: current.prizeAmount + ticketResult.prizeAmount,
      winningTicketCount: current.winningTicketCount + 1,
    });
  }

  const jackpotAfter =
    jackpotWinnerCount > 0 ? INITIAL_LOTTO_JACKPOT : currentState.jackpot;
  const nextState: LottoState = {
    drawNumber: currentState.drawNumber + 1,
    jackpot: jackpotAfter,
    tickets: remainingTickets,
  };

  return {
    nextState,
    result: {
      drawNumber: currentState.drawNumber,
      winningNumbers,
      totalTicketCount: drawTickets.length,
      jackpotBefore: currentState.jackpot,
      jackpotAfter,
      ticketResults,
      playerPrizes: [...playerPrizeMap.values()],
    },
  };
}
