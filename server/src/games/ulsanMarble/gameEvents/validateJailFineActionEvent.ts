import type {
  UlsanMarbleJailFineActionDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

function validatePositiveInteger(
  value: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} 값이 올바르지 않습니다.`,
    );
  }
}

function validateString(
  value: string,
  label: string,
): void {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 160
  ) {
    throw new Error(
      `${label} 정보가 올바르지 않습니다.`,
    );
  }
}

export function validateJailFineActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleJailFineActionDecidedPayload,
): void {
  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 수감자만 강제 출소 벌금을 처리할 수 있습니다.",
    );
  }

  if (
    payload.playerId !==
    playerId
  ) {
    throw new Error(
      "벌금 처리 플레이어 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "벌금 처리 턴이 현재 턴과 일치하지 않습니다.",
    );
  }

  if (
    game.phase !==
    "WAITING_FOR_ROLL"
  ) {
    throw new Error(
      "현재는 구치소 벌금을 처리할 수 없습니다.",
    );
  }

  validateString(
    payload.actionId,
    "벌금 행동 ID",
  );

  validateString(
    payload.fineId,
    "벌금 ID",
  );

  const expectedFineId = [
    "JAIL_FINE",
    payload.turnSequence,
    payload.playerId,
  ].join(":");

  if (
    payload.fineId !==
    expectedFineId
  ) {
    throw new Error(
      "구치소 벌금 ID가 올바르지 않습니다.",
    );
  }

  validatePositiveInteger(
    payload.amount,
    "벌금",
  );

  /*
   * 같은 턴에서 실제 3번째 더블 실패가
   * 먼저 발생했는지 확인한다.
   */
  const finalFailure =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "JAIL_TURN_ACTION_DECIDED" &&
        event.payload.playerId ===
          payload.playerId &&
        event.payload.turnSequence ===
          payload.turnSequence &&
        event.payload.action ===
          "TRY_DOUBLE" &&
        event.payload
          .failedAttemptsBefore ===
          2 &&
        event.payload
          .diceValues[0] !==
          event.payload
            .diceValues[1],
    );

  if (!finalFailure) {
    throw new Error(
      "강제 출소 벌금 발생 조건이 확인되지 않습니다.",
    );
  }

  const duplicate =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "JAIL_FINE_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicate) {
    throw new Error(
      "이미 처리된 구치소 벌금 행동입니다.",
    );
  }

  const alreadyFinished =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "JAIL_FINE_ACTION_DECIDED" &&
        event.payload.fineId ===
          payload.fineId &&
        (
          event.payload.action ===
            "PAY" ||
          event.payload.action ===
            "DECLARE_BANKRUPTCY"
        ),
    );

  if (alreadyFinished) {
    throw new Error(
      "이미 완료된 구치소 벌금 정산입니다.",
    );
  }

  if (
    payload.action ===
    "PAY"
  ) {
    return;
  }

  if (
    payload.action ===
    "SELL_PROPERTY"
  ) {
    validateString(
      payload.propertyId,
      "부동산",
    );

    validatePositiveInteger(
      payload.salePrice,
      "부동산 매각금",
    );

    const alreadySold =
      game.gameEvents.some(
        (event) =>
          event.kind ===
            "JAIL_FINE_ACTION_DECIDED" &&
          event.payload.fineId ===
            payload.fineId &&
          event.payload.action ===
            "SELL_PROPERTY" &&
          event.payload.propertyId ===
            payload.propertyId,
      );

    if (alreadySold) {
      throw new Error(
        "이미 매각한 부동산입니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "SELL_STOCK"
  ) {
    validateString(
      payload.companyId,
      "주식 종목",
    );

    validatePositiveInteger(
      payload.quantity,
      "주식 수량",
    );

    validatePositiveInteger(
      payload.pricePerShare,
      "주식 가격",
    );

    validatePositiveInteger(
      payload.holdingBefore,
      "기존 주식 보유량",
    );

    if (
      payload.quantity >
      payload.holdingBefore
    ) {
      throw new Error(
        "주식 매도 수량이 기존 보유량보다 많습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "DECLARE_BANKRUPTCY"
  ) {
    return;
  }

  throw new Error(
    "지원하지 않는 구치소 벌금 행동입니다.",
  );
}