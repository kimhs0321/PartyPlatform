import type {
  UlsanMarbleCityHallActionDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

export function validateCityHallActionDecidedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleCityHallActionDecidedPayload,
): void {
  if (!payload || typeof payload !== "object") {
    throw new Error("시청 요청이 올바르지 않습니다.");
  }

  if (
    typeof payload.playerId !== "string" ||
    payload.playerId !== playerId
  ) {
    throw new Error("시청 이용 플레이어가 올바르지 않습니다.");
  }

  if (game.activePlayerId !== playerId) {
    throw new Error("현재 플레이어만 시청을 이용할 수 있습니다.");
  }

  if (
    !Number.isInteger(payload.turnSequence) ||
    payload.turnSequence !== game.turnSequence
  ) {
    throw new Error("시청 턴 정보가 올바르지 않습니다.");
  }

  if (
    !Number.isInteger(payload.turnNumber) ||
    payload.turnNumber !== game.turnNumber
  ) {
    throw new Error("시청 턴 번호가 올바르지 않습니다.");
  }

  if (
    typeof payload.actionId !== "string" ||
    !payload.actionId.trim() ||
    typeof payload.visitId !== "string" ||
    !payload.visitId.trim()
  ) {
    throw new Error("시청 요청 식별자가 올바르지 않습니다.");
  }

  const duplicateAction = game.gameEvents.some(
    (event) =>
      event.kind === "CITY_HALL_ACTION_DECIDED" &&
      event.payload.actionId === payload.actionId,
  );

  if (duplicateAction) {
    throw new Error("이미 처리된 시청 요청입니다.");
  }

  if (payload.action === "START") {
    if (
      typeof payload.projectId !== "string" ||
      !payload.projectId.trim() ||
      typeof payload.instanceId !== "string" ||
      !payload.instanceId.trim()
    ) {
      throw new Error("시청 정책 정보가 올바르지 않습니다.");
    }

    if (
      !Number.isInteger(payload.selectedTurn) ||
      !Number.isInteger(payload.activeFromTurn) ||
      !Number.isInteger(payload.expiresAfterTurn) ||
      payload.selectedTurn !== payload.turnNumber ||
      payload.activeFromTurn !== payload.selectedTurn ||
      payload.expiresAfterTurn < payload.activeFromTurn
    ) {
      throw new Error("시청 정책 적용 기간이 올바르지 않습니다.");
    }

    if (
      payload.targetIndustryId !== null &&
      (
        typeof payload.targetIndustryId !== "string" ||
        !payload.targetIndustryId.trim()
      )
    ) {
      throw new Error("시청 정책 대상 산업이 올바르지 않습니다.");
    }

    const alreadyStarted = game.gameEvents.some(
      (event) =>
        event.kind === "CITY_HALL_ACTION_DECIDED" &&
        event.payload.action === "START" &&
        event.payload.visitId === payload.visitId,
    );

    if (alreadyStarted) {
      throw new Error("이미 시작된 시청 방문입니다.");
    }

    return;
  }

  const startEvent = [...game.gameEvents]
    .reverse()
    .find(
      (event) =>
        event.kind === "CITY_HALL_ACTION_DECIDED" &&
        event.payload.action === "START" &&
        event.payload.visitId === payload.visitId &&
        event.payload.playerId === payload.playerId &&
        event.payload.turnSequence === payload.turnSequence,
    );

  if (!startEvent) {
    throw new Error("시청 방문 시작 정보가 없습니다.");
  }

  const alreadyClosed = game.gameEvents.some(
    (event) =>
      event.kind === "CITY_HALL_ACTION_DECIDED" &&
      event.payload.action === "CLOSE" &&
      event.payload.visitId === payload.visitId,
  );

  if (alreadyClosed) {
    throw new Error("이미 종료된 시청 방문입니다.");
  }

  if (payload.action === "APPLY") {
    if (
      payload.applicationType !== "DEVELOPMENT_PERMIT" &&
      payload.applicationType !== "DEVELOPMENT_SUPPORT" &&
      payload.applicationType !== "PROPERTY_TAX_SUPPORT"
    ) {
      throw new Error("시청 민원 종류가 올바르지 않습니다.");
    }

    if (
      typeof payload.propertyId !== "string" ||
      !payload.propertyId.trim()
    ) {
      throw new Error("시청 민원 대상 부동산이 올바르지 않습니다.");
    }

    const alreadyApplied = game.gameEvents.some(
      (event) =>
        event.kind === "CITY_HALL_ACTION_DECIDED" &&
        event.payload.action === "APPLY" &&
        event.payload.visitId === payload.visitId,
    );

    if (alreadyApplied) {
      throw new Error("이미 민원이 처리된 시청 방문입니다.");
    }

    return;
  }

  if (payload.action === "CLOSE") {
    return;
  }
}