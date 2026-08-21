import type {
  UlsanMarbleBankActionDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "./../types/ulsanMarbleGame";

const MAX_BANK_AMOUNT =
  1_000_000_000;

function isValidSavingsProductId(
  value: unknown,
): value is
  | "SMALL"
  | "STANDARD"
  | "LARGE" {
  return (
    value === "SMALL" ||
    value === "STANDARD" ||
    value === "LARGE"
  );
}

export function validateBankActionDecidedEvent(
  game: ClientUlsanMarbleGameState,
  socketPlayerId: string,
  payload:
    UlsanMarbleBankActionDecidedPayload,
): void {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    throw new Error(
      "은행 처리 요청이 올바르지 않습니다.",
    );
  }

  if (
    payload.playerId !==
    socketPlayerId
  ) {
    throw new Error(
      "다른 플레이어의 은행 업무를 처리할 수 없습니다.",
    );
  }

  if (
    game.activePlayerId !==
    socketPlayerId
  ) {
    throw new Error(
      "현재 플레이어만 은행 업무를 처리할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "은행 처리 턴 정보가 올바르지 않습니다.",
    );
  }

  if (
    typeof payload.visitId !==
      "string" ||
    payload.visitId.length === 0 ||
    payload.visitId.length > 160
  ) {
    throw new Error(
      "은행 방문 정보가 올바르지 않습니다.",
    );
  }

  switch (payload.action) {
    case "DEPOSIT":
    case "WITHDRAW": {
      if (
        !Number.isInteger(
          payload.amount,
        ) ||
        payload.amount <= 0 ||
        payload.amount >
          MAX_BANK_AMOUNT
      ) {
        throw new Error(
          "은행 거래 금액이 올바르지 않습니다.",
        );
      }

      return;
    }

    case "START_SAVINGS": {
      if (
        !isValidSavingsProductId(
          payload.productId,
        )
      ) {
        throw new Error(
          "적금 상품이 올바르지 않습니다.",
        );
      }

      if (
        !Number.isInteger(
          payload.openedTurn,
        ) ||
        payload.openedTurn !==
          game.turnNumber
      ) {
        throw new Error(
          "적금 가입 턴 정보가 올바르지 않습니다.",
        );
      }

      return;
    }

    case "CLOSE":
      return;

    default:
      throw new Error(
        "지원하지 않는 은행 처리입니다.",
      );
  }
}