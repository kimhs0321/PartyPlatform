import type {
  UlsanMarbleDisasterActionDecidedPayload,
  UlsanMarbleDisasterResolvedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

export function validateDisasterResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleDisasterResolvedPayload,
): void {
  if (
    payload.mode === "SCHEDULED" &&
    game.activePlayerId !==
      playerId
  ) {
    throw new Error(
      "현재 플레이어만 재난 결과를 결정할 수 있습니다.",
    );
  }

  if (
    game.turnNumber !==
      payload.turnNumber ||
    game.turnSequence !==
      payload.turnSequence
  ) {
    throw new Error(
      "현재 턴과 일치하지 않는 재난 결과입니다.",
    );
  }

  const alreadyResolved =
    payload.mode === "SCHEDULED" &&
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "DISASTER_RESOLVED" &&
        event.turnSequence ===
          payload.turnSequence &&
        event.payload.mode ===
          "SCHEDULED",
    );

  if (alreadyResolved) {
    throw new Error(
      "이미 결정된 재난 결과입니다.",
    );
  }

  if (
    payload.outcome === "EVENT"
  ) {
    const expectedEventTurnNumber =
      payload.mode === "SCHEDULED"
        ? payload.turnNumber - 1
        : payload.turnNumber;

    if (
      payload.event.turnNumber !==
      expectedEventTurnNumber
    ) {
      throw new Error(
        "재난 턴 정보가 일치하지 않습니다.",
      );
    }
  }
}

export function validateDisasterActionDecidedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleDisasterActionDecidedPayload,
): void {
  if (
    payload.playerId !==
    playerId
  ) {
    throw new Error(
      "본인의 재난 처리만 진행할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
      game.turnSequence
  ) {
    throw new Error(
      "현재 턴과 일치하지 않는 재난 처리입니다.",
    );
  }

  const matchesResolvedDisaster =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "DISASTER_RESOLVED" &&
        event.turnSequence ===
          payload.turnSequence &&
        event.payload.outcome ===
          "EVENT" &&
        event.payload.event.id ===
          payload.disasterId &&
        event.payload.event.turnNumber ===
          payload.turnNumber,
    );

  if (!matchesResolvedDisaster) {
    throw new Error(
      "재난 처리 대상 정보가 일치하지 않습니다.",
    );
  }

  if (
    !payload.actionId.trim() ||
    !payload.disasterId.trim()
  ) {
    throw new Error(
      "재난 처리 식별자가 올바르지 않습니다.",
    );
  }

  /*
   * 재난 결과 화면 확인은
   * 현재 턴 플레이어만 가능.
   *
   * 실제 피해 정산은 다른 플레이어의
   * 차례일 수도 있으므로 activePlayer 검사를
   * PAY/매각/파산에는 적용하지 않는다.
   */
  if (
    payload.action ===
      "ACKNOWLEDGE" &&
    game.activePlayerId !==
      playerId
  ) {
    throw new Error(
      "현재 플레이어만 재난 결과를 확인할 수 있습니다.",
    );
  }

  if (
    payload.action === "PAY" &&
    (
      !Number.isFinite(
        payload.totalAmount,
      ) ||
      payload.totalAmount <= 0
    )
  ) {
    throw new Error(
      "재난 복구비가 올바르지 않습니다.",
    );
  }

  if (
    payload.action ===
      "SELL_PROPERTY" &&
    (
      !payload.propertyId.trim() ||
      !Number.isFinite(
        payload.salePrice,
      ) ||
      payload.salePrice <= 0
    )
  ) {
    throw new Error(
      "재난 부동산 매각 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.action ===
      "SELL_STOCK" &&
    (
      !payload.companyId.trim() ||
      !Number.isInteger(
        payload.quantity,
      ) ||
      payload.quantity <= 0 ||
      !Number.isFinite(
        payload.pricePerShare,
      ) ||
      payload.pricePerShare <= 0 ||
      !Number.isInteger(
        payload.holdingBefore,
      ) ||
      payload.holdingBefore <
        payload.quantity
    )
  ) {
    throw new Error(
      "재난 주식 매각 정보가 올바르지 않습니다.",
    );
  }
}