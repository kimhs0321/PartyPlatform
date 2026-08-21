import type { DiceValue } from "./dice";

export const MAX_CONSECUTIVE_DOUBLES = 3;

export interface DoubleStreakState {
  playerId: string | null;
  count: number;
}

export interface DoubleRollEvaluation {
  isDouble: boolean;
  grantsExtraRoll: boolean;
  sendsToJail: boolean;
  nextStreak: DoubleStreakState;
}

export const EMPTY_DOUBLE_STREAK: DoubleStreakState = {
  playerId: null,
  count: 0,
};

export function evaluateDoubleRoll(
  currentStreak: DoubleStreakState,
  playerId: string,
  diceValues: [DiceValue, DiceValue],
): DoubleRollEvaluation {
  const isDouble = diceValues[0] === diceValues[1];

  if (!isDouble) {
    return {
      isDouble: false,
      grantsExtraRoll: false,
      sendsToJail: false,
      nextStreak: EMPTY_DOUBLE_STREAK,
    };
  }

  const nextCount =
    currentStreak.playerId === playerId ? currentStreak.count + 1 : 1;
  const sendsToJail = nextCount >= MAX_CONSECUTIVE_DOUBLES;

  return {
    isDouble: true,
    grantsExtraRoll: !sendsToJail,
    sendsToJail,
    nextStreak: sendsToJail
      ? EMPTY_DOUBLE_STREAK
      : { playerId, count: nextCount },
  };
}
