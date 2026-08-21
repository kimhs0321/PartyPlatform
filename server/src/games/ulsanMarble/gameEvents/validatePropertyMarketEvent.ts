import type {
  UlsanMarblePropertyMarketResolvedPayload,
  UlsanMarblePropertyMarketSettlementConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const VALID_DISTRICT_IDS =
  new Set<string>([
    "NAM",
    "JUNG",
    "BUK",
    "DONG",
    "ULJU",
  ]);

function validateResolutionId(
  resolutionId: string,
): void {
  const normalized =
    resolutionId.trim();

  if (
    !normalized ||
    normalized.length > 160
  ) {
    throw new Error(
      "부동산 시세변동 식별자가 올바르지 않습니다.",
    );
  }
}

function validateCurrentPlayerAndTurn(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  settlementTurn: number,

  turnSequence: number,
): void {
  if (
    game.activePlayerId !==
      playerId
  ) {
    throw new Error(
      "현재 플레이어만 부동산 시세변동을 진행할 수 있습니다.",
    );
  }

  if (
    game.turnSequence !==
      turnSequence
  ) {
    throw new Error(
      "현재 턴 순서와 일치하지 않는 부동산 시세변동입니다.",
    );
  }

  /*
   * 정기 부동산 시세변동은
   * 이전 라운드 종료 후 처리된다.
   *
   * 서버는 END_TURN을 받으면서 이미
   * 다음 라운드로 turnNumber를 증가시킨 상태다.
   *
   * 예:
   * 5라운드 정산 payload.turnNumber = 5
   * 서버 game.turnNumber = 6
   */
  const expectedSettlementTurn =
    game.turnNumber - 1;

  if (
    settlementTurn !==
      expectedSettlementTurn
  ) {
    throw new Error(
      "부동산 시세변동 정산 턴이 올바르지 않습니다.",
    );
  }
}

function validateFiniteNumber(
  value: number,
  label: string,
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `${label} 값이 올바르지 않습니다.`,
    );
  }
}

export function validatePropertyMarketResolvedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarblePropertyMarketResolvedPayload,
): void {
  validateCurrentPlayerAndTurn(
    game,
    playerId,
    payload.turnNumber,
    payload.turnSequence,
  );

  validateResolutionId(
    payload.resolutionId,
  );

  if (
    payload.mode !==
      "SCHEDULED"
  ) {
    throw new Error(
      "네트워크 부동산 시세변동 유형이 올바르지 않습니다.",
    );
  }

  /*
   * 한 turnSequence에서
   * 정기 부동산 시세변동은 한 번만 허용.
   */
  const alreadyResolved =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "PROPERTY_MARKET_RESOLVED" &&
        event.turnSequence ===
          payload.turnSequence,
    );

  if (alreadyResolved) {
    throw new Error(
      "이미 처리된 부동산 시세변동입니다.",
    );
  }

  if (
    payload.cycle.turnNumber !==
      payload.turnNumber
  ) {
    throw new Error(
      "부동산 시세변동 턴 정보가 일치하지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      payload
        .additionallyDisabledPlayerIds,
    )
  ) {
    throw new Error(
      "부동산 시세변동 제외 플레이어 정보가 올바르지 않습니다.",
    );
  }

  for (
    const disabledPlayerId
    of payload
      .additionallyDisabledPlayerIds
  ) {
    if (
      !game.playerIds.includes(
        disabledPlayerId,
      )
    ) {
      throw new Error(
        "부동산 시세변동 제외 플레이어가 올바르지 않습니다.",
      );
    }
  }

  if (
    !payload.nextMarket ||
    typeof payload.nextMarket !==
      "object" ||
    Array.isArray(
      payload.nextMarket,
    )
  ) {
    throw new Error(
      "부동산 시세 정보가 올바르지 않습니다.",
    );
  }

  const marketEntries =
    Object.entries(
      payload.nextMarket,
    );

  if (
    marketEntries.length === 0 ||
    marketEntries.length > 200
  ) {
    throw new Error(
      "부동산 시세 항목 수가 올바르지 않습니다.",
    );
  }

  for (
    const [
      propertyId,
      state,
    ]
    of marketEntries
  ) {
    if (
      !propertyId.trim() ||
      state.propertyId !==
        propertyId
    ) {
      throw new Error(
        "부동산 시세 항목의 부동산 정보가 일치하지 않습니다.",
      );
    }

    validateFiniteNumber(
      state.priceIndex,
      "부동산 가격지수",
    );

    validateFiniteNumber(
      state.lastChangeRate,
      "부동산 최종 변동률",
    );

    validateFiniteNumber(
      state.districtChangeRate,
      "부동산 권역 변동률",
    );

    validateFiniteNumber(
      state.individualChangeRate,
      "부동산 개별 변동률",
    );

    if (
      state.priceIndex <= 0
    ) {
      throw new Error(
        "부동산 가격지수가 올바르지 않습니다.",
      );
    }

    /*
     * 방어권이 발동한 부동산은
     * previous state 자체를 복원하므로
     * updatedTurn이 현재 턴보다 과거일 수 있다.
     */
    if (
      !Number.isInteger(
        state.updatedTurn,
      ) ||
      state.updatedTurn < 0
    ) {
      throw new Error(
        "부동산 시세 갱신 턴이 올바르지 않습니다.",
      );
    }
  }

  if (
    !Array.isArray(
      payload.cycle
        .districtChanges,
    ) ||
    !Array.isArray(
      payload.cycle
        .propertyChanges,
    )
  ) {
    throw new Error(
      "부동산 시세변동 결과가 올바르지 않습니다.",
    );
  }

  if (
    payload.cycle
      .districtChanges.length >
      20 ||
    payload.cycle
      .propertyChanges.length >
      200
  ) {
    throw new Error(
      "부동산 시세변동 결과 항목 수가 올바르지 않습니다.",
    );
  }

  for (
    const districtChange
    of payload.cycle
      .districtChanges
  ) {
    if (
      !VALID_DISTRICT_IDS.has(
        districtChange.districtId,
      )
    ) {
      throw new Error(
        "부동산 권역 정보가 올바르지 않습니다.",
      );
    }

    validateFiniteNumber(
      districtChange.changeRate,
      "권역 변동률",
    );
  }

  for (
    const propertyChange
    of payload.cycle
      .propertyChanges
  ) {
    if (
      !propertyChange
        .propertyId
        .trim() ||
      !propertyChange
        .propertyName
        .trim()
    ) {
      throw new Error(
        "부동산 변동 항목이 올바르지 않습니다.",
      );
    }

    if (
      !VALID_DISTRICT_IDS.has(
        propertyChange.districtId,
      )
    ) {
      throw new Error(
        "부동산 변동 권역 정보가 올바르지 않습니다.",
      );
    }

    if (
      !payload.nextMarket[
        propertyChange.propertyId
      ]
    ) {
      throw new Error(
        "부동산 변동 결과와 최종 시세가 일치하지 않습니다.",
      );
    }

    validateFiniteNumber(
      propertyChange
        .previousPriceIndex,
      "이전 가격지수",
    );

    validateFiniteNumber(
      propertyChange
        .nextPriceIndex,
      "다음 가격지수",
    );

    validateFiniteNumber(
      propertyChange
        .districtChangeRate,
      "권역 변동률",
    );

    validateFiniteNumber(
      propertyChange
        .individualChangeRate,
      "개별 변동률",
    );

    validateFiniteNumber(
      propertyChange
        .appliedChangeRate,
      "적용 변동률",
    );

    validateFiniteNumber(
      propertyChange
        .previousPrice,
      "이전 가격",
    );

    validateFiniteNumber(
      propertyChange
        .currentPrice,
      "현재 가격",
    );

    if (
      propertyChange
        .previousPrice <= 0 ||
      propertyChange
        .currentPrice <= 0
    ) {
      throw new Error(
        "부동산 가격 정보가 올바르지 않습니다.",
      );
    }
  }

  if (
    !payload
      .nextPropertyDefenseByPlayer ||
    typeof payload
      .nextPropertyDefenseByPlayer !==
      "object" ||
    Array.isArray(
      payload
        .nextPropertyDefenseByPlayer,
    )
  ) {
    throw new Error(
      "부동산 방어권 상태가 올바르지 않습니다.",
    );
  }

  for (
    const [
      defensePlayerId,
      propertyId,
    ]
    of Object.entries(
      payload
        .nextPropertyDefenseByPlayer,
    )
  ) {
    if (
      !game.playerIds.includes(
        defensePlayerId,
      ) ||
      !propertyId.trim() ||
      !payload.nextMarket[
        propertyId
      ]
    ) {
      throw new Error(
        "부동산 방어권 대상 정보가 올바르지 않습니다.",
      );
    }
  }
}

export function validatePropertyMarketSettlementConfirmedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarblePropertyMarketSettlementConfirmedPayload,
): void {
  validateCurrentPlayerAndTurn(
    game,
    playerId,
    payload.turnNumber,
    payload.turnSequence,
  );

  validateResolutionId(
    payload.resolutionId,
  );

  const resolvedEvent =
    game.gameEvents.find(
      (event) =>
        event.kind ===
          "PROPERTY_MARKET_RESOLVED" &&
        event.payload
          .resolutionId ===
          payload.resolutionId &&
        event.turnSequence ===
          payload.turnSequence,
    );

  if (!resolvedEvent) {
    throw new Error(
      "확인할 부동산 시세변동 결과가 없습니다.",
    );
  }

  const alreadyConfirmed =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "PROPERTY_MARKET_SETTLEMENT_CONFIRMED" &&
        event.payload
          .resolutionId ===
          payload.resolutionId,
    );

  if (alreadyConfirmed) {
    throw new Error(
      "이미 확인된 부동산 시세변동입니다.",
    );
  }
}