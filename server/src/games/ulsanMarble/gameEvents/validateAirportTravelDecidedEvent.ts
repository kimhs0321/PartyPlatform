import type {
  UlsanMarbleAirportTravelDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "./../types/ulsanMarbleGame";

function validateTextId(
  value: string,
  label: string,
): void {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 200
  ) {
    throw new Error(
      `${label}가 올바르지 않습니다.`,
    );
  }
}

export function validateAirportTravelDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleAirportTravelDecidedPayload,
): void {
  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    throw new Error(
      "공항 이동 요청이 올바르지 않습니다.",
    );
  }

  if (
    typeof payload.playerId !==
      "string" ||
    payload.playerId !==
      playerId
  ) {
    throw new Error(
      "공항 이동 플레이어가 올바르지 않습니다.",
    );
  }

  if (
    game.activePlayerId !==
      playerId
  ) {
    throw new Error(
      "현재 플레이어만 공항 이동을 선택할 수 있습니다.",
    );
  }

  if (
    !Number.isInteger(
      payload.turnSequence,
    ) ||
    payload.turnSequence !==
      game.turnSequence
  ) {
    throw new Error(
      "공항 이동 턴 정보가 올바르지 않습니다.",
    );
  }

  validateTextId(
    payload.actionId,
    "공항 선택 식별자",
  );

  validateTextId(
    payload.visitId,
    "공항 방문 식별자",
  );

  if (
    !Number.isInteger(
      payload.fromPosition,
    ) ||
    payload.fromPosition < 0
  ) {
    throw new Error(
      "공항 출발 위치가 올바르지 않습니다.",
    );
  }

  /*
   * 동일 action의 중복 발행 방지
   */
  const duplicateAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "AIRPORT_TRAVEL_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicateAction) {
    throw new Error(
      "이미 처리된 공항 선택입니다.",
    );
  }

  /*
   * 한 공항 방문에서는
   * TRAVEL/CANCEL 중 하나만 허용
   */
  const alreadyDecidedVisit =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "AIRPORT_TRAVEL_DECIDED" &&
        event.payload.visitId ===
          payload.visitId,
    );

  if (alreadyDecidedVisit) {
    throw new Error(
      "이미 선택이 완료된 공항 방문입니다.",
    );
  }

  if (
    payload.action ===
      "CANCEL"
  ) {
    return;
  }

  if (
    payload.action !==
      "TRAVEL"
  ) {
    throw new Error(
      "공항 이동 선택이 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      payload.destinationPosition,
    ) ||
    payload.destinationPosition <
      0 ||
    payload.destinationPosition ===
      payload.fromPosition
  ) {
    throw new Error(
      "공항 목적지가 올바르지 않습니다.",
    );
  }

  const expectedArrivalId = [
    payload.visitId,
    "TRAVEL",
    payload.destinationPosition,
  ].join(":");

  if (
    typeof payload.arrivalId !==
      "string" ||
    payload.arrivalId !==
      expectedArrivalId
  ) {
    throw new Error(
      "공항 도착 정보가 올바르지 않습니다.",
    );
  }
}