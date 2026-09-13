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
    game.controllerPlayerId !==
      playerId
  ) {
    throw new Error(
      "게임 진행 담당자만 정기 재난 결과를 결정할 수 있습니다.",
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

  const resolvedDisaster =
    [...game.gameEvents]
      .reverse()
      .find(
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

  if (
    !resolvedDisaster ||
    resolvedDisaster.kind !==
      "DISASTER_RESOLVED" ||
    resolvedDisaster.payload.outcome !==
      "EVENT"
  ) {
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
  * 전역 재난 결과 화면 확인은
  * 고정 controller만 가능하다.
  *
  * PAY / 매각 / 파산은
  * 실제 피해 당사자가 진행한다.
  */
  if (
    payload.action ===
      "ACKNOWLEDGE" &&
    game.controllerPlayerId !==
      playerId
  ) {
    throw new Error(
      "게임 진행 담당자만 재난 결과를 확인할 수 있습니다.",
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

  const duplicateAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "DISASTER_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicateAction) {
    throw new Error(
      "이미 처리된 재난 행동입니다.",
    );
  }  

  if (
  payload.action !==
  "ACKNOWLEDGE"
  ) {
  const acknowledged =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "DISASTER_ACTION_DECIDED" &&
        event.payload.disasterId ===
          payload.disasterId &&
        event.payload.turnSequence ===
          payload.turnSequence &&
        event.payload.action ===
          "ACKNOWLEDGE",
    );

  if (!acknowledged) {
    throw new Error(
      "재난 결과 확인이 완료되지 않았습니다.",
    );
  }

  const completedAssessmentCount =
    game.gameEvents.filter(
      (event) =>
        event.kind ===
          "DISASTER_ACTION_DECIDED" &&
        event.payload.disasterId ===
          payload.disasterId &&
        event.payload.turnSequence ===
          payload.turnSequence &&
        (
          event.payload.action ===
            "PAY" ||
          event.payload.action ===
            "DECLARE_BANKRUPTCY"
        ),
    ).length;

  const currentAssessment =
    resolvedDisaster.payload.event
      .playerAssessments[
        completedAssessmentCount
      ];

  if (!currentAssessment) {
    throw new Error(
      "이미 완료된 재난 정산입니다.",
    );
  }

  if (
    currentAssessment.playerId !==
      playerId ||
    payload.playerId !==
      currentAssessment.playerId
  ) {
    throw new Error(
      "현재 재난 피해 플레이어만 정산을 진행할 수 있습니다.",
    );
  }

  if (
    payload.action === "PAY" &&
    payload.totalAmount !==
      currentAssessment.totalAmount
  ) {
    throw new Error(
      "재난 복구비가 현재 피해 금액과 일치하지 않습니다.",
    );
  }
  }
}