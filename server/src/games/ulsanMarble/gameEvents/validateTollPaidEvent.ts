import type {
  UlsanMarbleTollPaidPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

export function validateTollPaidEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleTollPaidPayload,
): void {
  if (
    payload.payerPlayerId !== playerId
  ) {
    throw new Error(
      "통행료 지급자가 올바르지 않습니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.ownerPlayerId,
    )
  ) {
    throw new Error(
      "통행료 수령자가 올바르지 않습니다.",
    );
  }

  if (!payload.propertyId.trim()) {
    throw new Error(
      "통행료 부동산 정보가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(payload.amount) ||
    payload.amount <= 0
  ) {
    throw new Error(
      "통행료 금액이 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      payload.ownerIncome,
    ) ||
    payload.ownerIncome < 0
  ) {
    throw new Error(
      "통행료 수령액이 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      payload.bankWithdrawalAmount,
    ) ||
    payload.bankWithdrawalAmount < 0
  ) {
    throw new Error(
      "예금 인출액이 올바르지 않습니다.",
    );
  }
}