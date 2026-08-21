import type {
  UlsanMarblePortContractPayload,
  UlsanMarblePortContractType,
  UlsanMarblePortSettlementConfirmedPayload,
  UlsanMarblePortSettlementModifierType,
  UlsanMarblePortSettlementResolvedPayload,
  UlsanMarblePortSettlementResultPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const PORT_CONTRACT_DURATION_TURNS =
  3;

const PORT_RULES: Record<
  UlsanMarblePortContractType,
  {
    investmentAmount: number;
    successPayout: number;
    failurePayout: number;
  }
> = {
  COASTAL: {
    investmentAmount: 100,
    successPayout: 140,
    failurePayout: 50,
  },

  EAST_ASIA: {
    investmentAmount: 200,
    successPayout: 340,
    failurePayout: 80,
  },

  OCEAN: {
    investmentAmount: 300,
    successPayout: 650,
    failurePayout: 0,
  },
};

const PORT_MODIFIER_TYPES:
  UlsanMarblePortSettlementModifierType[] =
  [
    "TYPHOON",
    "SHIPBUILDING_UP",
    "ECONOMIC_NEWS",
    "CITY_HALL",
    "CARGO_INSURANCE",
  ];

function validateIdentifier(
  value: string,
  label: string,
): void {
  if (
    typeof value !== "string" ||
    value.length <= 0 ||
    value.length > 180
  ) {
    throw new Error(
      `${label}이 올바르지 않습니다.`,
    );
  }
}

function isPortContractType(
  value: unknown,
): value is UlsanMarblePortContractType {
  return (
    value === "COASTAL" ||
    value === "EAST_ASIA" ||
    value === "OCEAN"
  );
}

function validateBase(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  settlementId: string,
  turnNumber: number,
  turnSequence: number,
): void {
  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 플레이어만 울산항 정산을 처리할 수 있습니다.",
    );
  }

  if (
    turnNumber !==
      game.turnNumber ||
    turnSequence !==
      game.turnSequence
  ) {
    throw new Error(
      "울산항 정산의 턴 정보가 일치하지 않습니다.",
    );
  }

  validateIdentifier(
    settlementId,
    "울산항 정산 ID",
  );
}

function validateContract(
  contract:
    UlsanMarblePortContractPayload,

  currentTurn: number,

  mustBeDue: boolean,
): void {
  validateIdentifier(
    contract.id,
    "항구 계약 ID",
  );

  validateIdentifier(
    contract.playerId,
    "항구 계약 플레이어 ID",
  );

  if (
    !isPortContractType(
      contract.type,
    )
  ) {
    throw new Error(
      "항구 계약 종류가 올바르지 않습니다.",
    );
  }

  const rule =
    PORT_RULES[
      contract.type
    ];

  if (
    !Number.isInteger(
      contract.purchasedTurn,
    ) ||
    contract.purchasedTurn <= 0
  ) {
    throw new Error(
      "항구 계약 구매 턴이 올바르지 않습니다.",
    );
  }

  if (
    contract.settlesAfterTurn !==
    contract.purchasedTurn +
      PORT_CONTRACT_DURATION_TURNS
  ) {
    throw new Error(
      "항구 계약 정산 턴이 올바르지 않습니다.",
    );
  }

  if (
    contract.investmentAmount !==
    rule.investmentAmount
  ) {
    throw new Error(
      "항구 계약 투자금이 올바르지 않습니다.",
    );
  }

  if (
    mustBeDue &&
    contract.settlesAfterTurn >
      currentTurn
  ) {
    throw new Error(
      "아직 정산할 수 없는 항구 계약입니다.",
    );
  }

  if (
    !mustBeDue &&
    contract.settlesAfterTurn <=
      currentTurn
  ) {
    throw new Error(
      "정산 기한이 지난 계약이 활성 계약에 남아 있습니다.",
    );
  }
}

function validateResult(
  result:
    UlsanMarblePortSettlementResultPayload,

  currentTurn: number,
): boolean {
  validateContract(
    result.contract,
    currentTurn,
    true,
  );

  if (
    typeof result.success !==
    "boolean"
  ) {
    throw new Error(
      "항구 계약 성공 결과가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isFinite(
      result.finalSuccessChance,
    ) ||
    result.finalSuccessChance <
      0.05 ||
    result.finalSuccessChance >
      0.95
  ) {
    throw new Error(
      "항구 계약 성공 확률이 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      result.modifiers,
    ) ||
    result.modifiers.length > 8
  ) {
    throw new Error(
      "항구 계약 보정 정보가 올바르지 않습니다.",
    );
  }

  const modifierTypeSet =
    new Set<string>();

  for (
    const modifier of
    result.modifiers
  ) {
    if (
      !PORT_MODIFIER_TYPES.includes(
        modifier.type,
      ) ||
      modifierTypeSet.has(
        modifier.type,
      )
    ) {
      throw new Error(
        "항구 계약 보정 종류가 올바르지 않습니다.",
      );
    }

    modifierTypeSet.add(
      modifier.type,
    );

    if (
      typeof modifier.label !==
        "string" ||
      modifier.label.length <= 0 ||
      modifier.label.length > 80 ||
      !Number.isFinite(
        modifier.chanceDelta,
      ) ||
      modifier.chanceDelta < -1 ||
      modifier.chanceDelta > 1
    ) {
      throw new Error(
        "항구 계약 보정 값이 올바르지 않습니다.",
      );
    }
  }

  const hasCargoInsurance =
    modifierTypeSet.has(
      "CARGO_INSURANCE",
    );

  if (
    result.success &&
    hasCargoInsurance
  ) {
    throw new Error(
      "성공한 계약에는 적하보험을 사용할 수 없습니다.",
    );
  }

  const rule =
    PORT_RULES[
      result.contract.type
    ];

  const expectedPayout =
    result.success
      ? rule.successPayout
      : hasCargoInsurance
        ? Math.max(
            rule.failurePayout,

            Math.floor(
              rule.investmentAmount *
                0.8,
            ),
          )
        : rule.failurePayout;

  if (
    result.payoutAmount !==
      expectedPayout ||
    result.netProfit !==
      expectedPayout -
        rule.investmentAmount
  ) {
    throw new Error(
      "항구 계약 지급액이 올바르지 않습니다.",
    );
  }

  return hasCargoInsurance;
}

function validateDisabledPlayerIds(
  values: string[],
): Set<string> {
  if (
    !Array.isArray(values) ||
    values.length > 32
  ) {
    throw new Error(
      "비활성 플레이어 목록이 올바르지 않습니다.",
    );
  }

  const result =
    new Set<string>();

  for (const value of values) {
    validateIdentifier(
      value,
      "비활성 플레이어 ID",
    );

    if (result.has(value)) {
      throw new Error(
        "중복된 비활성 플레이어가 있습니다.",
      );
    }

    result.add(value);
  }

  return result;
}

export function validatePortSettlementResolvedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarblePortSettlementResolvedPayload,
): void {
  validateBase(
    game,
    playerId,

    payload.settlementId,
    payload.turnNumber,
    payload.turnSequence,
  );

  const disabledPlayerIds =
    validateDisabledPlayerIds(
      payload
        .additionallyDisabledPlayerIds,
    );

  if (
    !Array.isArray(
      payload.results,
    ) ||
    payload.results.length > 32 ||
    !Array.isArray(
      payload.nextActiveContracts,
    ) ||
    payload
      .nextActiveContracts
      .length > 32 ||
    !Array.isArray(
      payload
        .consumedCargoInsurancePlayerIds,
    ) ||
    payload
      .consumedCargoInsurancePlayerIds
      .length > 32
  ) {
    throw new Error(
      "울산항 정산 결과가 올바르지 않습니다.",
    );
  }

  const settledContractIds =
    new Set<string>();

  const cargoInsurancePlayerIds =
    new Set<string>();

  for (
    const result of
    payload.results
  ) {
    if (
      settledContractIds.has(
        result.contract.id,
      )
    ) {
      throw new Error(
        "중복된 항구 정산 계약이 있습니다.",
      );
    }

    settledContractIds.add(
      result.contract.id,
    );

    if (
      disabledPlayerIds.has(
        result.contract.playerId,
      )
    ) {
      throw new Error(
        "비활성 플레이어의 계약을 정산할 수 없습니다.",
      );
    }

    if (
      validateResult(
        result,
        game.turnNumber,
      )
    ) {
      cargoInsurancePlayerIds.add(
        result.contract.playerId,
      );
    }
  }

  const activeContractIds =
    new Set<string>();

  for (
    const contract of
    payload.nextActiveContracts
  ) {
    validateContract(
      contract,
      game.turnNumber,
      false,
    );

    if (
      activeContractIds.has(
        contract.id,
      ) ||
      settledContractIds.has(
        contract.id,
      )
    ) {
      throw new Error(
        "활성 계약 목록에 중복된 계약이 있습니다.",
      );
    }

    if (
      disabledPlayerIds.has(
        contract.playerId,
      )
    ) {
      throw new Error(
        "비활성 플레이어의 계약이 남아 있습니다.",
      );
    }

    activeContractIds.add(
      contract.id,
    );
  }

  const consumedPlayerIds =
    new Set<string>();

  for (
    const consumedPlayerId of
    payload
      .consumedCargoInsurancePlayerIds
  ) {
    validateIdentifier(
      consumedPlayerId,
      "적하보험 사용 플레이어 ID",
    );

    if (
      consumedPlayerIds.has(
        consumedPlayerId,
      )
    ) {
      throw new Error(
        "중복된 적하보험 소비 정보가 있습니다.",
      );
    }

    consumedPlayerIds.add(
      consumedPlayerId,
    );
  }

  if (
    consumedPlayerIds.size !==
    cargoInsurancePlayerIds.size
  ) {
    throw new Error(
      "적하보험 소비 결과가 일치하지 않습니다.",
    );
  }

  for (
    const playerId of
    cargoInsurancePlayerIds
  ) {
    if (
      !consumedPlayerIds.has(
        playerId,
      )
    ) {
      throw new Error(
        "적하보험 소비 결과가 누락됐습니다.",
      );
    }
  }
}

export function validatePortSettlementConfirmedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarblePortSettlementConfirmedPayload,
): void {
  validateBase(
    game,
    playerId,

    payload.settlementId,
    payload.turnNumber,
    payload.turnSequence,
  );
}