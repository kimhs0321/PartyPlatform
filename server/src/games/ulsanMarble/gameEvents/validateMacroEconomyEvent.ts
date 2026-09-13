import type {
  UlsanMarbleInterestRateLevel,
  UlsanMarbleMacroEconomyReportPayload,
  UlsanMarbleMacroEconomyResolvedPayload,
  UlsanMarbleMacroRegime,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const MACRO_REGIMES =
  new Set<UlsanMarbleMacroRegime>([
    "BOOM",
    "NEUTRAL",
    "RECESSION",
  ]);

const INTEREST_RATE_LEVELS =
  new Set<UlsanMarbleInterestRateLevel>([
    "LOW",
    "BASE",
    "HIGH",
  ]);

function fail(
  message: string,
): never {
  throw new Error(message);
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isMacroRegime(
  value: unknown,
): value is UlsanMarbleMacroRegime {
  return (
    typeof value === "string" &&
    MACRO_REGIMES.has(
      value as UlsanMarbleMacroRegime,
    )
  );
}

function isInterestRateLevel(
  value: unknown,
): value is UlsanMarbleInterestRateLevel {
  return (
    typeof value === "string" &&
    INTEREST_RATE_LEVELS.has(
      value as
        UlsanMarbleInterestRateLevel,
    )
  );
}

function validateReport(
  report:
    UlsanMarbleMacroEconomyReportPayload,
): void {
  if (
    !report ||
    typeof report !== "object"
  ) {
    fail(
      "경기 분석 기사 정보가 올바르지 않습니다.",
    );
  }

  if (
    !isNonEmptyString(
      report.reportId,
    ) ||
    !isMacroRegime(
      report.regime,
    ) ||
    !Number.isInteger(
      report.observedFromTurn,
    ) ||
    report.observedFromTurn <= 0 ||
    !Number.isInteger(
      report.publishedTurn,
    ) ||
    report.publishedTurn <= 0 ||
    report.publishedTurn <
      report.observedFromTurn ||
    !isNonEmptyString(
      report.headline,
    ) ||
    !isNonEmptyString(
      report.summary,
    )
  ) {
    fail(
      "경기 분석 기사 내용이 올바르지 않습니다.",
    );
  }
}

export function validateMacroEconomyResolvedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleMacroEconomyResolvedPayload,
): void {
  /*
   * 경기 국면은 고정 controller만 계산한다.
   */
  if (
    payload.controllerPlayerId !==
    playerId
  ) {
    fail(
      "경기 국면 제어 플레이어가 발행자와 일치하지 않습니다.",
    );
  }

  if (
    game.controllerPlayerId !==
    playerId
  ) {
    fail(
      "게임 진행 담당자만 경기 국면을 결정할 수 있습니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.controllerPlayerId,
    )
  ) {
    fail(
      "경기 국면 제어 플레이어가 존재하지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    fail(
      "경기 국면 정산의 턴 순번이 일치하지 않습니다.",
    );
  }

  /*
   * 글로벌 턴 종료 정산:
   *
   * 로컬 의미 턴 = N
   * 서버 authoritative turn = N+1
   */
  const expectedTurnNumber =
    game.turnNumber - 1;

  if (
    payload.turnNumber !==
      expectedTurnNumber ||
    payload.turnNumber <= 0
  ) {
    fail(
      "경기 국면 정산의 턴 번호가 일치하지 않습니다.",
    );
  }

  const expectedResolutionId =
    [
      "MACRO_ECONOMY",
      payload.turnSequence,
      payload.turnNumber,
    ].join(":");

  if (
    payload.resolutionId !==
    expectedResolutionId
  ) {
    fail(
      "경기 국면 정산 식별자가 올바르지 않습니다.",
    );
  }

  if (
    !isMacroRegime(
      payload.previousRegime,
    ) ||
    !isMacroRegime(
      payload.currentRegime,
    )
  ) {
    fail(
      "경기 국면 정보가 올바르지 않습니다.",
    );
  }

  if (
    typeof payload.regimeChanged !==
      "boolean" ||
    payload.regimeChanged !==
      (
        payload.previousRegime !==
        payload.currentRegime
      )
  ) {
    fail(
      "경기 국면 변경 정보가 올바르지 않습니다.",
    );
  }

  if (
    !isInterestRateLevel(
      payload
        .previousInterestRateLevel,
    ) ||
    !isInterestRateLevel(
      payload
        .currentInterestRateLevel,
    )
  ) {
    fail(
      "금리 상태가 올바르지 않습니다.",
    );
  }

  if (
    typeof
      payload.interestRateChanged !==
      "boolean" ||
    payload.interestRateChanged !==
      (
        payload
          .previousInterestRateLevel !==
        payload
          .currentInterestRateLevel
      )
  ) {
    fail(
      "금리 변경 정보가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isFinite(
      payload.stockMarketBias,
    ) ||
    payload.stockMarketBias <
      -0.015 ||
    payload.stockMarketBias >
      0.015
  ) {
    fail(
      "경기 국면의 주식시장 압력 값이 올바르지 않습니다.",
    );
  }

  const nextState =
    payload.nextState;

  if (
    !nextState ||
    typeof nextState !==
      "object"
  ) {
    fail(
      "다음 경기 상태가 올바르지 않습니다.",
    );
  }

  if (
    !isMacroRegime(
      nextState.regime,
    ) ||
    nextState.regime !==
      payload.currentRegime
  ) {
    fail(
      "다음 경기 국면이 정산 결과와 일치하지 않습니다.",
    );
  }

  if (
    !isInterestRateLevel(
      nextState.interestRateLevel,
    ) ||
    nextState.interestRateLevel !==
      payload
        .currentInterestRateLevel
  ) {
    fail(
      "다음 금리 상태가 정산 결과와 일치하지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      nextState.regimeStartedTurn,
    ) ||
    nextState.regimeStartedTurn <=
      0 ||
    nextState.regimeStartedTurn >
      payload.turnNumber ||
    !Number.isInteger(
      nextState.regimeEndsAfterTurn,
    ) ||
    nextState.regimeEndsAfterTurn <
      nextState.regimeStartedTurn
  ) {
    fail(
      "경기 국면 지속 턴 정보가 올바르지 않습니다.",
    );
  }

  if (
    nextState
      .lastInterestRateChangeTurn !==
      null &&
    (
      !Number.isInteger(
        nextState
          .lastInterestRateChangeTurn,
      ) ||
      nextState
        .lastInterestRateChangeTurn <=
        0 ||
      nextState
        .lastInterestRateChangeTurn >
        payload.turnNumber
    )
  ) {
    fail(
      "금리 변경 턴 정보가 올바르지 않습니다.",
    );
  }

  if (
    nextState.lastResolvedTurn !==
    payload.turnNumber
  ) {
    fail(
      "경기 국면 최종 정산 턴이 일치하지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      nextState.pendingReports,
    ) ||
    !Array.isArray(
      nextState.reportHistory,
    ) ||
    !Array.isArray(
      payload.publishedReports,
    )
  ) {
    fail(
      "경기 분석 기사 목록이 올바르지 않습니다.",
    );
  }

  for (
    const report of
    nextState.pendingReports
  ) {
    validateReport(report);

    if (
      report.publishedTurn <=
      payload.turnNumber
    ) {
      fail(
        "대기 중인 경기 분석 기사의 공개 턴이 올바르지 않습니다.",
      );
    }
  }

  for (
    const report of
    nextState.reportHistory
  ) {
    validateReport(report);
  }

  for (
    const report of
    payload.publishedReports
  ) {
    validateReport(report);

    if (
      report.publishedTurn >
      payload.turnNumber
    ) {
      fail(
        "아직 공개할 수 없는 경기 분석 기사입니다.",
      );
    }
  }

  if (
    nextState.reportHistory.length >
    12
  ) {
    fail(
      "경기 분석 기사 기록이 허용 범위를 초과했습니다.",
    );
  }

  if (
    !Array.isArray(
      payload
        .additionallyDisabledPlayerIds,
    )
  ) {
    fail(
      "경기 정산 제외 플레이어 정보가 올바르지 않습니다.",
    );
  }

  const uniqueDisabledIds =
    new Set(
      payload
        .additionallyDisabledPlayerIds,
    );

  if (
    uniqueDisabledIds.size !==
    payload
      .additionallyDisabledPlayerIds
      .length
  ) {
    fail(
      "경기 정산 제외 플레이어가 중복되어 있습니다.",
    );
  }

  for (
    const disabledPlayerId of
    payload
      .additionallyDisabledPlayerIds
  ) {
    if (
      !game.playerIds.includes(
        disabledPlayerId,
      )
    ) {
      fail(
        "경기 정산 제외 플레이어가 존재하지 않습니다.",
      );
    }
  }

  const alreadyPublished =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "MACRO_ECONOMY_RESOLVED" &&
        event.payload.resolutionId ===
          payload.resolutionId,
    );

  if (alreadyPublished) {
    fail(
      "이미 처리된 경기 국면 정산입니다.",
    );
  }
}