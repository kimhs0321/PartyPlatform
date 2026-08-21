import type { PlayerTokenData } from "../../components/PlayerToken";

export const JAIL_BAIL_AMOUNT = 400;
export const JAIL_FORCED_RELEASE_FINE = 150;
export const JAIL_MAX_FAILED_DOUBLE_ATTEMPTS = 3;
export const JAIL_TOLL_INCOME_MULTIPLIER = 0.7;

export function getJailFailedAttempts(player: PlayerTokenData | null | undefined): number {
  return Math.max(0, Math.trunc(player?.jailFailedAttempts ?? 0));
}

export function incarceratePlayer(player: PlayerTokenData): PlayerTokenData {
  return {
    ...player,
    isJailed: true,
    jailFailedAttempts: 0,
  };
}

export function releasePlayerFromJail(player: PlayerTokenData): PlayerTokenData {
  return {
    ...player,
    isJailed: false,
    jailFailedAttempts: 0,
  };
}

export function addJailFailedAttempt(player: PlayerTokenData): PlayerTokenData {
  return {
    ...player,
    isJailed: true,
    jailFailedAttempts: Math.min(
      JAIL_MAX_FAILED_DOUBLE_ATTEMPTS,
      getJailFailedAttempts(player) + 1,
    ),
  };
}

export function getJailTollOwnerIncome(
  tollAmount: number,
  owner: PlayerTokenData | null | undefined,
): number {
  const safeAmount = Math.max(0, Math.trunc(tollAmount));
  if (!owner?.isJailed) return safeAmount;
  return Math.max(0, Math.round(safeAmount * JAIL_TOLL_INCOME_MULTIPLIER));
}
