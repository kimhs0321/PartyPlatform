import type {
  UlsanMarbleInsuranceActionDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const MAX_ACTION_ID_LENGTH = 240;
const MAX_VISIT_ID_LENGTH = 240;
const MAX_PROPERTY_ID_LENGTH = 160;

function isValidId(
  value: string,
  maxLength: number,
): boolean {
  const trimmed =
    value.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= maxLength
  );
}

export function validateInsuranceActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleInsuranceActionDecidedPayload,
): void {
  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 플레이어만 보험사를 이용할 수 있습니다.",
    );
  }

  if (
    payload.playerId !==
    playerId
  ) {
    throw new Error(
      "보험사 이용 플레이어 정보가 일치하지 않습니다.",
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
      "보험사 요청 턴 정보가 현재 게임과 일치하지 않습니다.",
    );
  }

  if (
    !isValidId(
      payload.actionId,
      MAX_ACTION_ID_LENGTH,
    )
  ) {
    throw new Error(
      "보험사 행동 식별자가 올바르지 않습니다.",
    );
  }

  if (
    !isValidId(
      payload.visitId,
      MAX_VISIT_ID_LENGTH,
    )
  ) {
    throw new Error(
      "보험사 방문 정보가 올바르지 않습니다.",
    );
  }

  const duplicateAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "INSURANCE_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicateAction) {
    throw new Error(
      "이미 처리된 보험사 행동입니다.",
    );
  }

  const visitClosed =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "INSURANCE_ACTION_DECIDED" &&
        event.payload.visitId ===
          payload.visitId &&
        event.payload.action ===
          "CLOSE",
    );

  if (visitClosed) {
    throw new Error(
      "이미 종료된 보험사 방문입니다.",
    );
  }

  if (
    payload.action === "CLOSE"
  ) {
    return;
  }

  if (
    !isValidId(
      payload.propertyId,
      MAX_PROPERTY_ID_LENGTH,
    )
  ) {
    throw new Error(
      "보험 대상 부동산 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.planType !==
      "BASIC" &&
    payload.planType !==
      "COMPREHENSIVE"
  ) {
    throw new Error(
      "보험 상품 정보가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      payload.premium,
    ) ||
    payload.premium <= 0
  ) {
    throw new Error(
      "보험료 정보가 올바르지 않습니다.",
    );
  }

  const contract =
    payload.contract;

  if (
    contract.propertyId !==
      payload.propertyId ||
    contract.playerId !==
      playerId ||
    contract.planType !==
      payload.planType ||
    contract.premiumPaid !==
      payload.premium
  ) {
    throw new Error(
      "보험 계약 정보가 요청과 일치하지 않습니다.",
    );
  }

  const expectedCoverageRate =
    payload.planType ===
    "BASIC"
      ? 0.5
      : 0.8;

  if (
    contract.coverageRate !==
    expectedCoverageRate
  ) {
    throw new Error(
      "보험 보장률 정보가 올바르지 않습니다.",
    );
  }

  if (
    contract.startedTurn !==
    game.turnNumber
  ) {
    throw new Error(
      "보험 계약 시작 턴이 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      contract.expiresAfterTurn,
    ) ||
    contract.expiresAfterTurn <
      game.turnNumber + 9
  ) {
    throw new Error(
      "보험 계약 만료 턴이 올바르지 않습니다.",
    );
  }
}