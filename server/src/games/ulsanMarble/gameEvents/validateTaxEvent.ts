import type {
  UlsanMarbleTaxActionDecidedPayload,
  UlsanMarbleTaxAssessmentPayload,
  UlsanMarbleTaxSettlementStartedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const VALID_STAGES =
  new Set([
    "LAND",
    "DEVELOPED",
    "BUILDING",
    "LANDMARK",
  ]);

function validateNonEmptyString(
  value: string,
  label: string,
  maxLength = 200,
): void {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maxLength
  ) {
    throw new Error(
      `${label} 정보가 올바르지 않습니다.`,
    );
  }
}

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

function validateNonNegativeNumber(
  value: number,
  label: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} 값이 올바르지 않습니다.`,
    );
  }
}

function validateAssessment(
  game:
    ClientUlsanMarbleGameState,

  assessment:
    UlsanMarbleTaxAssessmentPayload,

  settlementTurn: number,
): void {
  if (
    !game.playerIds.includes(
      assessment.playerId,
    )
  ) {
    throw new Error(
      "세금 납세자 정보가 올바르지 않습니다.",
    );
  }

  if (
    assessment.settlementTurn !==
    settlementTurn
  ) {
    throw new Error(
      "세금 정산 턴이 일치하지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      assessment.items,
    ) ||
    assessment.items.length === 0
  ) {
    throw new Error(
      "세금 부과 항목이 없습니다.",
    );
  }

  let totalAmount = 0;

  const propertyIds =
    new Set<string>();

  for (
    const item of
    assessment.items
  ) {
    validateNonEmptyString(
      item.propertyId,
      "부동산",
    );

    validateNonEmptyString(
      item.propertyName,
      "부동산명",
    );

    if (
      propertyIds.has(
        item.propertyId,
      )
    ) {
      throw new Error(
        "중복된 세금 부과 부동산입니다.",
      );
    }

    propertyIds.add(
      item.propertyId,
    );

    if (
      !VALID_STAGES.has(
        item.stage,
      )
    ) {
      throw new Error(
        "부동산 개발 단계가 올바르지 않습니다.",
      );
    }

    validateNonNegativeNumber(
      item.basePrice,
      "기준 가격",
    );

    validateNonNegativeNumber(
      item.currentPrice,
      "현재 가격",
    );

    if (
      !Number.isFinite(
        item.priceIndex,
      ) ||
      item.priceIndex <= 0
    ) {
      throw new Error(
        "부동산 가격지수가 올바르지 않습니다.",
      );
    }

    validateNonNegativeNumber(
      item.rate,
      "세율",
    );

    validatePositiveInteger(
      item.amount,
      "세금",
    );

    totalAmount +=
      item.amount;
  }

  validatePositiveInteger(
    assessment.totalAmount,
    "총 세금",
  );

  if (
    totalAmount !==
    assessment.totalAmount
  ) {
    throw new Error(
      "세금 합계가 일치하지 않습니다.",
    );
  }
}

function validateUniquePlayerIds(
  game:
    ClientUlsanMarbleGameState,

  playerIds: string[],
): void {
  const uniqueIds =
    new Set(
      playerIds,
    );

  if (
    uniqueIds.size !==
    playerIds.length
  ) {
    throw new Error(
      "중복된 플레이어 정보가 있습니다.",
    );
  }

  for (
    const playerId of
    playerIds
  ) {
    if (
      !game.playerIds.includes(
        playerId,
      )
    ) {
      throw new Error(
        "존재하지 않는 플레이어입니다.",
      );
    }
  }
}

export function validateTaxSettlementStartedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleTaxSettlementStartedPayload,
): void {
    if (
    playerId !==
    game.controllerPlayerId
  ) {
    throw new Error(
      "게임 진행 담당자만 세금 정산을 시작할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "세금 정산 턴 순서가 일치하지 않습니다.",
    );
  }

  validatePositiveInteger(
    payload.settlementTurn,
    "세금 정산 턴",
  );

  if (
    payload.settlementTurn %
      5 !==
    0
  ) {
    throw new Error(
      "정기 세금 정산 턴이 아닙니다.",
    );
  }

  const expectedSettlementId =
    [
      "tax",
      payload.turnSequence,
      payload.settlementTurn,
    ].join("-");

  if (
    payload.settlementId !==
    expectedSettlementId
  ) {
    throw new Error(
      "세금 정산 ID가 올바르지 않습니다.",
    );
  }

  const duplicate =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "TAX_SETTLEMENT_STARTED" &&
        event.payload
          .settlementId ===
          payload.settlementId,
    );

  if (duplicate) {
    throw new Error(
      "이미 시작된 세금 정산입니다.",
    );
  }

  validateUniquePlayerIds(
    game,
    payload
      .additionallyDisabledPlayerIds,
  );

  if (
    !Array.isArray(
      payload.rawAssessments,
    ) ||
    !Array.isArray(
      payload.assessments,
    )
  ) {
    throw new Error(
      "세금 부과 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.rawAssessments
      .length !==
    payload.assessments
      .length
  ) {
    throw new Error(
      "세금 부과 전후 인원 수가 일치하지 않습니다.",
    );
  }

  const rawPlayerIds =
    payload.rawAssessments.map(
      (assessment) =>
        assessment.playerId,
    );

  const finalPlayerIds =
    payload.assessments.map(
      (assessment) =>
        assessment.playerId,
    );

  validateUniquePlayerIds(
    game,
    rawPlayerIds,
  );

  validateUniquePlayerIds(
    game,
    finalPlayerIds,
  );

  for (
    let index = 0;
    index <
    payload.rawAssessments
      .length;
    index += 1
  ) {
    const raw =
      payload.rawAssessments[
        index
      ];

    const final =
      payload.assessments[
        index
      ];

    validateAssessment(
      game,
      raw,
      payload.settlementTurn,
    );

    validateAssessment(
      game,
      final,
      payload.settlementTurn,
    );

    if (
      raw.playerId !==
      final.playerId
    ) {
      throw new Error(
        "세금 납세자 순서가 일치하지 않습니다.",
      );
    }

    if (
      raw.items.length !==
      final.items.length
    ) {
      throw new Error(
        "세금 부과 항목 수가 일치하지 않습니다.",
      );
    }

    for (
      let itemIndex = 0;
      itemIndex <
      raw.items.length;
      itemIndex += 1
    ) {
      const rawItem =
        raw.items[
          itemIndex
        ];

      const finalItem =
        final.items[
          itemIndex
        ];

      if (
        rawItem.propertyId !==
          finalItem.propertyId ||
        rawItem.stage !==
          finalItem.stage
      ) {
        throw new Error(
          "세금 부과 대상이 변경되었습니다.",
        );
      }
    }
  }

  validateUniquePlayerIds(
    game,
    payload.discountedPlayerIds,
  );

  const assessmentPlayerIds =
    new Set(
      payload.assessments.map(
        (assessment) =>
          assessment.playerId,
      ),
    );

  for (
    const playerId of
    payload.discountedPlayerIds
  ) {
    if (
      !assessmentPlayerIds.has(
        playerId,
      )
    ) {
      throw new Error(
        "세금 할인 대상자가 올바르지 않습니다.",
      );
    }
  }
}

export function validateTaxActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleTaxActionDecidedPayload,
): void {
  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "세금 처리 턴이 일치하지 않습니다.",
    );
  }

  validateNonEmptyString(
    payload.actionId,
    "세금 처리 ID",
  );

  validateNonEmptyString(
    payload.settlementId,
    "세금 정산 ID",
  );

  const duplicateAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "TAX_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicateAction) {
    throw new Error(
      "이미 처리된 세금 행동입니다.",
    );
  }

  const startedEvent =
    [...game.gameEvents]
      .reverse()
      .find(
        (event) =>
          event.kind ===
            "TAX_SETTLEMENT_STARTED" &&
          event.payload
            .settlementId ===
            payload.settlementId &&
          event.payload
            .turnSequence ===
            payload.turnSequence,
      );

  if (
    !startedEvent ||
    startedEvent.kind !==
      "TAX_SETTLEMENT_STARTED"
  ) {
    throw new Error(
      "진행 중인 세금 정산이 없습니다.",
    );
  }

  if (
    payload.settlementTurn !==
    startedEvent.payload
      .settlementTurn
  ) {
    throw new Error(
      "세금 정산 턴이 일치하지 않습니다.",
    );
  }

  const settlementActions =
    game.gameEvents.filter(
      (event) =>
        event.kind ===
          "TAX_ACTION_DECIDED" &&
        event.payload
          .settlementId ===
          payload.settlementId &&
        event.payload
          .turnSequence ===
          payload.turnSequence,
    );

  const completedCount =
    settlementActions.filter(
      (event) =>
        event.kind ===
          "TAX_ACTION_DECIDED" &&
        (
          event.payload.action ===
            "PAY" ||
          event.payload.action ===
            "DECLARE_BANKRUPTCY"
        ),
    ).length;

  const currentAssessment =
    startedEvent.payload
      .assessments[
        completedCount
      ];

  if (!currentAssessment) {
    throw new Error(
      "이미 완료된 세금 정산입니다.",
    );
  }

  if (
    playerId !==
      payload.taxpayerId ||
    payload.taxpayerId !==
      currentAssessment.playerId
  ) {
    throw new Error(
      "현재 납세자만 세금을 처리할 수 있습니다.",
    );
  }

  if (
    payload.action ===
    "PAY"
  ) {
    if (
      payload.totalAmount !==
      currentAssessment
        .totalAmount
    ) {
      throw new Error(
        "세금 납부 금액이 일치하지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "SELL_PROPERTY"
  ) {
    validateNonEmptyString(
      payload.propertyId,
      "부동산",
    );

    validatePositiveInteger(
      payload.salePrice,
      "부동산 매각금",
    );

    if (
      !currentAssessment.items
        .some(
          (item) =>
            item.propertyId ===
            payload.propertyId,
        )
    ) {
      throw new Error(
        "현재 납세자의 과세 부동산이 아닙니다.",
      );
    }

    const alreadySold =
      settlementActions.some(
        (event) =>
          event.kind ===
            "TAX_ACTION_DECIDED" &&
          event.payload.action ===
            "SELL_PROPERTY" &&
          event.payload
            .taxpayerId ===
            payload.taxpayerId &&
          event.payload
            .propertyId ===
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
    validateNonEmptyString(
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

    return;
  }

  if (
    payload.action ===
    "DECLARE_BANKRUPTCY"
  ) {
    return;
  }

  throw new Error(
    "지원하지 않는 세금 처리입니다.",
  );
}