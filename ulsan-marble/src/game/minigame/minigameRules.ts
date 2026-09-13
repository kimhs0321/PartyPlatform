import type { PlayerTokenData } from "../../components/PlayerToken";
import { createDiceValue, type DiceValue } from "../dice";
import type {
  HighLowChoice,
  MiniGameBet,
  MiniGameDefinition,
  MiniGameId,
  MiniGameSettlement,
  MiniGameState,
  OddEvenChoice,
  PendingHighLowMiniGame,
  PendingMiniGame,
  PendingOddEvenMiniGame,
  PendingTargetDiceMiniGame,
  PendingTimingStopMiniGame,
  TargetDiceAttempt,
  TimingStopAttempt,
} from "./minigameTypes";

export const MINI_GAME_PRIZE_AMOUNT = 300;
export const MINI_GAME_BET_OPTIONS = [100, 200, 300] as const;
export const MINI_GAME_DEFINITIONS: readonly MiniGameDefinition[] = [
  {
    id: "TIMING_STOP",
    name: "타이밍 스톱",
    category: "PRIZE",
    description: "움직이는 표시를 중앙에 가장 가깝게 멈추면 승리합니다.",
  },
  {
    id: "TARGET_DICE",
    name: "목표 숫자 주사위",
    category: "PRIZE",
    description: "주사위 두 개의 합을 목표 숫자에 가장 가깝게 만드세요.",
  },
  {
    id: "ODD_EVEN",
    name: "홀짝 주사위",
    category: "BETTING",
    description: "주사위 두 개의 합이 홀수인지 짝수인지 맞힙니다.",
  },
  {
    id: "HIGH_LOW",
    name: "하이로우",
    category: "BETTING",
    description: "다음 숫자가 기준 숫자보다 높을지 낮을지 맞힙니다.",
  },
] as const;

const MINI_GAME_IDS = MINI_GAME_DEFINITIONS.map((definition) => definition.id);

function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function createTargetNumber(random: () => number = Math.random): number {
  return Math.floor(random() * 11) + 2;
}

function createHighLowFirstNumber(random: () => number = Math.random): 4 | 5 | 6 {
  return (Math.floor(random() * 3) + 4) as 4 | 5 | 6;
}

function createHighLowSecondNumber(random: () => number = Math.random): number {
  return Math.floor(random() * 9) + 1;
}

function normalizeTimingDistance(distance: number): number {
  const safe = Number.isFinite(distance) ? Math.min(Math.max(distance, 0), 0.5) : 0.5;
  return Math.round(safe * 1_000) / 1_000;
}

export function getMiniGameDefinition(gameId: MiniGameId): MiniGameDefinition {
  const definition = MINI_GAME_DEFINITIONS.find((item) => item.id === gameId);
  if (!definition) throw new Error(`Unknown mini game: ${gameId}`);
  return definition;
}

export function createInitialMiniGameState(
  random: () => number = Math.random,
): MiniGameState {
  return {
    deck: {
      drawPile: shuffle(MINI_GAME_IDS, random),
      cycle: 1,
    },
  };
}

export function drawMiniGame(
  state: MiniGameState,
  random: () => number = Math.random,
): { state: MiniGameState; gameId: MiniGameId } {
  let deck = state.deck;
  if (deck.drawPile.length === 0) {
    const cycle = deck.cycle + 1;
    deck = {
      drawPile: shuffle(MINI_GAME_IDS, random),
      cycle,
    };
  }

  const [gameId, ...drawPile] = deck.drawPile;
  if (!gameId) throw new Error("Mini game deck is empty.");

  return {
    gameId,
    state: {
      deck: {
        ...deck,
        drawPile,
      },
    },
  };
}

export function createMiniGameParticipantOrder(
  players: PlayerTokenData[],
  arrivalPlayerId: string,
): string[] {
  const eligible = players.filter(
    (player) => !player.isBankrupt && !player.isJailed,
  );
  const arrivalIndex = eligible.findIndex((player) => player.id === arrivalPlayerId);
  if (arrivalIndex < 0) return eligible.map((player) => player.id);

  return [
    ...eligible.slice(arrivalIndex),
    ...eligible.slice(0, arrivalIndex),
  ].map((player) => player.id);
}

export function createPendingMiniGame(
  gameId: MiniGameId,
  arrivalPlayerId: string,
  eligiblePlayerIds: string[],
  random: () => number = Math.random,
): PendingMiniGame {
  const hasParticipants = eligiblePlayerIds.length > 0;
  const base = {
    arrivalPlayerId,
    eligiblePlayerIds,

    currentPlayerIndex: 0,
    round: 1,

    stage: hasParticipants
      ? ("PLAYING" as const)
      : ("RESULT" as const),

    winnerPlayerId: null,

    resultText:
      hasParticipants
        ? null
        : "참가 가능한 플레이어가 없습니다.",

    deadlineAt: null,};

  if (gameId === "TIMING_STOP") {
    return {
      ...base,
      gameId,
      roundPlayerIds: eligiblePlayerIds,
      attempts: [],
    };
  }

  if (gameId === "TARGET_DICE") {
    return {
      ...base,
      gameId,
      roundPlayerIds: eligiblePlayerIds,
      targetNumber: createTargetNumber(random),
      attempts: [],
    };
  }

  if (gameId === "ODD_EVEN") {
    return {
      ...base,
      gameId,
      bets: [],
      diceValues: null,
      settlements: [],
    };
  }

  return {
    ...base,
    gameId: "HIGH_LOW",
    firstNumber: createHighLowFirstNumber(random),
    secondNumber: null,
    bets: [],
    settlements: [],
  };
}

export function getCurrentMiniGamePlayerId(
  pending: PendingMiniGame | null,
): string | null {
  if (!pending || pending.stage !== "PLAYING") return null;
  const playerIds =
    pending.gameId === "TIMING_STOP" || pending.gameId === "TARGET_DICE"
      ? pending.roundPlayerIds
      : pending.eligiblePlayerIds;
  return playerIds[pending.currentPlayerIndex] ?? null;
}

export function recordTimingStopAttempt(
  pending: PendingTimingStopMiniGame,
  playerId: string,
  distance: number,
  responseMs: number,
): PendingTimingStopMiniGame {
  if (getCurrentMiniGamePlayerId(pending) !== playerId) return pending;

  const attempt: TimingStopAttempt = {
    playerId,
    distance: normalizeTimingDistance(distance),
    responseMs: Math.max(0, Math.trunc(responseMs)),
  };
  const attempts = [...pending.attempts, attempt];
  const nextPlayerIndex = pending.currentPlayerIndex + 1;

  if (nextPlayerIndex < pending.roundPlayerIds.length) {
    return {
      ...pending,
      attempts,
      currentPlayerIndex:
        nextPlayerIndex,

      deadlineAt: null,
    };
  }

  const bestDistance = Math.min(...attempts.map((item) => item.distance));
  const tiedPlayerIds = attempts
    .filter((item) => item.distance === bestDistance)
    .map((item) => item.playerId);

  if (tiedPlayerIds.length > 1) {
    return {
      ...pending,
      round: pending.round + 1,
      roundPlayerIds: tiedPlayerIds,
      currentPlayerIndex: 0,
      attempts: [],
      resultText: `${tiedPlayerIds.length}명이 동점이라 재대결합니다.`,

      deadlineAt: null,
    };
  }

  const winnerPlayerId =
    tiedPlayerIds[0] ?? null;

  return {
    ...pending,

    attempts,

    stage: "RESULT",

    winnerPlayerId,

    resultText:
      winnerPlayerId
        ? `중앙과의 오차 ${bestDistance.toFixed(3)}로 우승했습니다.`
        : "참가자가 없어 게임이 종료됐습니다.",

    deadlineAt: null,
  };
  }

export function rollTargetDiceAttempt(
  pending:
    PendingTargetDiceMiniGame,

  playerId: string,

  diceValues?: [
    DiceValue,
    DiceValue,
  ],

  random:
    () => number =
    Math.random,
): PendingTargetDiceMiniGame {
  if (
    getCurrentMiniGamePlayerId(
      pending,
    ) !== playerId
  ) {
    return pending;
  }

  const resolvedDiceValues:
    [DiceValue, DiceValue] =
    diceValues ?? [
      createDiceValue(random),
      createDiceValue(random),
    ];

  const total =
    resolvedDiceValues[0] +
    resolvedDiceValues[1];

  const attempt:
    TargetDiceAttempt = {
    playerId,

    diceValues:
      resolvedDiceValues,

    total,

    distance:
      Math.abs(
        total -
        pending.targetNumber,
      ),
  };

  const attempts = [
    ...pending.attempts,
    attempt,
  ];

  const nextPlayerIndex =
    pending.currentPlayerIndex + 1;

  if (
    nextPlayerIndex <
    pending.roundPlayerIds.length
  ) {
    return {
      ...pending,

      attempts,

      currentPlayerIndex:
        nextPlayerIndex,

      deadlineAt: null,
    };
  }

  const bestDistance =
    Math.min(
      ...attempts.map(
        (item) =>
          item.distance,
      ),
    );

  const tiedPlayerIds =
    attempts
      .filter(
        (item) =>
          item.distance ===
          bestDistance,
      )
      .map(
        (item) =>
          item.playerId,
      );

  if (
    tiedPlayerIds.length > 1
  ) {
    return {
      ...pending,

      round:
        pending.round + 1,

      roundPlayerIds:
        tiedPlayerIds,

      targetNumber:
        createTargetNumber(
          random,
        ),

      currentPlayerIndex: 0,

      attempts: [],

      resultText:
        `${tiedPlayerIds.length}명이 동점이라 새 목표 숫자로 재대결합니다.`,

      deadlineAt: null,
    };
  }

  const winnerPlayerId =
    tiedPlayerIds[0] ?? null;

  return {
    ...pending,

    attempts,

    stage: "RESULT",

    winnerPlayerId,

    resultText:
      winnerPlayerId
        ? `목표 숫자와의 차이 ${bestDistance}로 우승했습니다.`
        : "참가자가 없어 게임이 종료됐습니다.",

    deadlineAt: null,
  };
}

export function recordOddEvenBet(
  pending: PendingOddEvenMiniGame,
  bet: MiniGameBet<OddEvenChoice>,
): PendingOddEvenMiniGame {
  if (getCurrentMiniGamePlayerId(pending) !== bet.playerId) return pending;
 return {
  ...pending,
  bets: [
    ...pending.bets,
    bet,
  ],

  currentPlayerIndex:
    pending.currentPlayerIndex +
    1,

  deadlineAt: null,
};
}

export function resolveOddEvenMiniGame(
  pending: PendingOddEvenMiniGame,
  random: () => number = Math.random,
): PendingOddEvenMiniGame {
  const diceValues: [DiceValue, DiceValue] = [
    createDiceValue(random),
    createDiceValue(random),
  ];
  const total = diceValues[0] + diceValues[1];
  const result: OddEvenChoice = total % 2 === 0 ? "EVEN" : "ODD";
  const settlements: MiniGameSettlement[] = pending.bets.map((bet) => {
    if (!bet.choice || bet.amount <= 0) {
      return { playerId: bet.playerId, stake: 0, payout: 0, result: "PASS" };
    }
    const win = bet.choice === result;
    return {
      playerId: bet.playerId,
      stake: bet.amount,
      payout: win ? bet.amount * 2 : 0,
      result: win ? "WIN" : "LOSE",
    };
  });

  return {
    ...pending,
    diceValues,
    settlements,
    stage: "RESULT",
    deadlineAt: null,
    resultText: `주사위 합계 ${total} · ${result === "EVEN" ? "짝수" : "홀수"}`,
  };
}

export function recordHighLowBet(
  pending: PendingHighLowMiniGame,
  bet: MiniGameBet<HighLowChoice>,
): PendingHighLowMiniGame {
  if (getCurrentMiniGamePlayerId(pending) !== bet.playerId) return pending;
  return {
    ...pending,
    bets: [...pending.bets, bet],
    currentPlayerIndex: pending.currentPlayerIndex + 1,

    deadlineAt: null,
  };
}

export function resolveHighLowMiniGame(
  pending: PendingHighLowMiniGame,
  random: () => number = Math.random,
): PendingHighLowMiniGame {
  const secondNumber = createHighLowSecondNumber(random);
  const actual: HighLowChoice | "SAME" =
    secondNumber > pending.firstNumber
      ? "HIGH"
      : secondNumber < pending.firstNumber
        ? "LOW"
        : "SAME";

  const settlements: MiniGameSettlement[] = pending.bets.map((bet) => {
    if (!bet.choice || bet.amount <= 0) {
      return { playerId: bet.playerId, stake: 0, payout: 0, result: "PASS" };
    }
    if (actual === "SAME") {
      return {
        playerId: bet.playerId,
        stake: bet.amount,
        payout: bet.amount,
        result: "REFUND",
      };
    }
    const win = bet.choice === actual;
    return {
      playerId: bet.playerId,
      stake: bet.amount,
      payout: win ? bet.amount * 2 : 0,
      result: win ? "WIN" : "LOSE",
    };
  });

  return {
    ...pending,
    secondNumber,
    settlements,
    stage: "RESULT",
    deadlineAt: null,
    resultText:
      actual === "SAME"
        ? `${pending.firstNumber} → ${secondNumber} · 같은 숫자라 전액 반환`
        : `${pending.firstNumber} → ${secondNumber} · ${actual === "HIGH" ? "HIGH" : "LOW"}`,
  };
}