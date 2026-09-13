import type {
  InterestRateLevel,
  MacroEconomyReport,
  MacroEconomyState,
  MacroEconomyTurnResolution,
  MacroRegime,
} from "./macroEconomyTypes";

const INITIAL_NEUTRAL_END_TURN = 2;

const BOOM_RECESSION_MIN_DURATION = 3;
const BOOM_RECESSION_MAX_DURATION = 6;

const NEUTRAL_MIN_DURATION = 2;
const NEUTRAL_MAX_DURATION = 4;

const MACRO_REPORT_DELAY_TURNS = 2;

const MAX_REPORT_HISTORY = 12;

const NEUTRAL_REGIME_TRIGGER_CHANCE = 0.15;

/*
 * 경기 국면의 주식시장 영향은
 * 방향을 강제로 결정하지 않도록 약하게 유지한다.
 */
const REGIME_STOCK_PRESSURE_CHANCE = 0.6;
const REGIME_STOCK_PRESSURE_MIN = 0.004;
const REGIME_STOCK_PRESSURE_MAX = 0.012;

/*
 * 금리의 주가 영향은 경기 국면보다 더 약하다.
 */
const RATE_STOCK_PRESSURE_CHANCE = 0.45;
const RATE_STOCK_PRESSURE_MIN = 0.003;
const RATE_STOCK_PRESSURE_MAX = 0.008;

const MAX_TOTAL_STOCK_BIAS = 0.015;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function roundRate(
  value: number,
): number {
  return (
    Math.round(value * 1000) /
    1000
  );
}

function randomInteger(
  minimum: number,
  maximum: number,
  random: () => number,
): number {
  return (
    minimum +
    Math.floor(
      random() *
        (
          maximum -
          minimum +
          1
        ),
    )
  );
}

function randomBetween(
  minimum: number,
  maximum: number,
  random: () => number,
): number {
  return (
    minimum +
    random() *
      (maximum - minimum)
  );
}

function getRegimeDuration(
  regime: MacroRegime,
  random: () => number,
): number {
  if (regime === "NEUTRAL") {
    return randomInteger(
      NEUTRAL_MIN_DURATION,
      NEUTRAL_MAX_DURATION,
      random,
    );
  }

  return randomInteger(
    BOOM_RECESSION_MIN_DURATION,
    BOOM_RECESSION_MAX_DURATION,
    random,
  );
}

function chooseNextRegime(
  currentRegime: MacroRegime,
  random: () => number,
): MacroRegime {
  /*
   * 급격하게
   * 호황 → 불황
   * 불황 → 호황
   * 으로 뒤집히는 것보다
   * 중립을 한 번 거치게 한다.
   */
  if (currentRegime === "BOOM") {
    return "NEUTRAL";
  }

  if (
    currentRegime ===
    "RECESSION"
  ) {
    return "NEUTRAL";
  }

  return random() < 0.5
    ? "BOOM"
    : "RECESSION";
}

function createRegimeReport(
  regime: MacroRegime,
  observedFromTurn: number,
): MacroEconomyReport {
  const publishedTurn =
    observedFromTurn +
    MACRO_REPORT_DELAY_TURNS;

  if (regime === "BOOM") {
    return {
      reportId:
        `MACRO_REPORT:${observedFromTurn}:BOOM`,

      regime,

      observedFromTurn,
      publishedTurn,

      headline:
        "경기 확장 흐름 확인",

      summary:
        "최근 경제지표를 종합한 결과, 지난 시기부터 소비와 기업 활동이 확대되는 흐름이 확인됐습니다.",
    };
  }

  if (regime === "RECESSION") {
    return {
      reportId:
        `MACRO_REPORT:${observedFromTurn}:RECESSION`,

      regime,

      observedFromTurn,
      publishedTurn,

      headline:
        "경기 둔화 흐름 확인",

      summary:
        "최근 경제지표를 종합한 결과, 지난 시기부터 소비와 기업 활동이 둔화되는 흐름이 확인됐습니다.",
    };
  }

  return {
    reportId:
      `MACRO_REPORT:${observedFromTurn}:NEUTRAL`,

    regime,

    observedFromTurn,
    publishedTurn,

    headline:
      "경기 안정 흐름 확인",

    summary:
      "최근 경제지표를 종합한 결과, 지난 시기부터 경기 흐름이 비교적 안정된 수준으로 돌아온 것으로 분석됐습니다.",
  };
}

function moveInterestRateOneStepUp(
  level: InterestRateLevel,
): InterestRateLevel {
  switch (level) {
    case "LOW":
      return "BASE";

    case "BASE":
      return "HIGH";

    case "HIGH":
      return "HIGH";
  }
}

function moveInterestRateOneStepDown(
  level: InterestRateLevel,
): InterestRateLevel {
  switch (level) {
    case "LOW":
      return "LOW";

    case "BASE":
      return "LOW";

    case "HIGH":
      return "BASE";
  }
}

function resolveInterestRate(
  state: MacroEconomyState,
  turnNumber: number,
  random: () => number,
): InterestRateLevel {
  const regimeAge =
    turnNumber -
    state.regimeStartedTurn +
    1;

  /*
   * 호황/불황이 최소 2턴은 지속돼야
   * 금리 방향 압력이 생긴다.
   */
  if (
    state.regime === "BOOM" &&
    regimeAge >= 2 &&
    state.interestRateLevel !==
      "HIGH"
  ) {
    /*
     * 2턴차 12%
     * 3턴차 18%
     * 4턴차 24%
     * 5턴 이상 최대 30%
     */
    const hikeChance =
      Math.min(
        0.3,
        0.12 +
          (regimeAge - 2) *
            0.06,
      );

    if (random() < hikeChance) {
      return moveInterestRateOneStepUp(
        state.interestRateLevel,
      );
    }
  }

  if (
    state.regime === "RECESSION" &&
    regimeAge >= 2 &&
    state.interestRateLevel !==
      "LOW"
  ) {
    const cutChance =
      Math.min(
        0.3,
        0.12 +
          (regimeAge - 2) *
            0.06,
      );

    if (random() < cutChance) {
      return moveInterestRateOneStepDown(
        state.interestRateLevel,
      );
    }
  }

  /*
   * 중립 국면에서는 낮은 확률로
   * 기준 수준으로 정상화.
   */
  if (
    state.regime === "NEUTRAL" &&
    state.interestRateLevel !==
      "BASE" &&
    random() < 0.08
  ) {
    return state.interestRateLevel ===
      "LOW"
      ? "BASE"
      : "BASE";
  }

  return state.interestRateLevel;
}

function rollRegimeStockBias(
  regime: MacroRegime,
  random: () => number,
): number {
  if (
    regime === "NEUTRAL" ||
    random() >=
      REGIME_STOCK_PRESSURE_CHANCE
  ) {
    return 0;
  }

  const amount =
    randomBetween(
      REGIME_STOCK_PRESSURE_MIN,
      REGIME_STOCK_PRESSURE_MAX,
      random,
    );

  return regime === "BOOM"
    ? amount
    : -amount;
}

function rollInterestRateStockBias(
  level: InterestRateLevel,
  random: () => number,
): number {
  if (
    level === "BASE" ||
    random() >=
      RATE_STOCK_PRESSURE_CHANCE
  ) {
    return 0;
  }

  const amount =
    randomBetween(
      RATE_STOCK_PRESSURE_MIN,
      RATE_STOCK_PRESSURE_MAX,
      random,
    );

  /*
   * 저금리 → 주식에 약한 우호 압력
   * 고금리 → 주식에 약한 하방 압력
   */
  return level === "LOW"
    ? amount
    : -amount;
}

export function createInitialMacroEconomyState():
  MacroEconomyState {
  return {
    regime: "NEUTRAL",

    regimeStartedTurn: 1,

    /*
     * 초반 1~2턴은 경기 안정 구간.
     * 3턴부터 첫 호황/불황이
     * 발생할 수 있다.
     */
    regimeEndsAfterTurn:
      INITIAL_NEUTRAL_END_TURN,

    interestRateLevel: "BASE",

    lastInterestRateChangeTurn:
      null,

    pendingReports: [],
    reportHistory: [],

    lastResolvedTurn: 0,
  };
}

export function getMacroBankInterestMultiplier(
  level: InterestRateLevel,
): number {
  switch (level) {
    case "LOW":
      return 0.75;

    case "BASE":
      return 1;

    case "HIGH":
      return 1.5;
  }
}

export function getMacroInterestRateLabel(
  level: InterestRateLevel,
): string {
  switch (level) {
    case "LOW":
      return "저금리";

    case "BASE":
      return "기준금리";

    case "HIGH":
      return "고금리";
  }
}

export function resolveMacroEconomyTurn(
  currentState: MacroEconomyState,
  turnNumber: number,
  random: () => number = Math.random,
): MacroEconomyTurnResolution {
  const safeTurnNumber =
    Math.max(
      1,
      Math.trunc(turnNumber),
    );

  /*
   * 동일 턴 중복 계산 방지.
   */
  if (
    currentState.lastResolvedTurn >=
    safeTurnNumber
  ) {
    return {
      state: currentState,

      regimeChanged: false,

      previousRegime:
        currentState.regime,

      currentRegime:
        currentState.regime,

      interestRateChanged: false,

      previousInterestRateLevel:
        currentState.interestRateLevel,

      currentInterestRateLevel:
        currentState.interestRateLevel,

      publishedReports: [],

      stockMarketBias: 0,
    };
  }

  const previousRegime =
    currentState.regime;

  const previousInterestRateLevel =
    currentState.interestRateLevel;

  /*
   * 먼저 지금 턴에 공개될
   * 후행 경기분석 기사를 꺼낸다.
   */
  const publishedReports =
    currentState.pendingReports.filter(
      (report) =>
        report.publishedTurn <=
        safeTurnNumber,
    );

  let nextState:
    MacroEconomyState =
    {
      ...currentState,

      pendingReports:
        currentState.pendingReports.filter(
          (report) =>
            report.publishedTurn >
            safeTurnNumber,
        ),

      reportHistory: [
        ...publishedReports,
        ...currentState.reportHistory,
      ].slice(
        0,
        MAX_REPORT_HISTORY,
      ),
    };

  let regimeChanged = false;

  /*
   * regimeEndsAfterTurn은 포함 범위.
   *
   * 예:
   * 3턴 시작 / 5턴 종료
   * → 3,4,5턴에 해당 국면 적용
   * → 6턴에서 다음 국면
   */
  if (
    safeTurnNumber >
    nextState.regimeEndsAfterTurn
  ) {
    /*
    * 호황/불황 종료 시에는
    * 반드시 중립으로 복귀.
    *
    * 중립 최소 유지기간이 끝난 뒤에는
    * 매 턴 독립적으로 15% 확률로
    * 새 경기 국면 진입을 판정한다.
    */
    const shouldChangeRegime =
      nextState.regime !== "NEUTRAL" ||
      random() <
        NEUTRAL_REGIME_TRIGGER_CHANCE;

    if (shouldChangeRegime) {
      const nextRegime =
        chooseNextRegime(
          nextState.regime,
          random,
        );

      const duration =
        getRegimeDuration(
          nextRegime,
          random,
        );

      regimeChanged =
        nextRegime !==
        nextState.regime;

      const report =
        createRegimeReport(
          nextRegime,
          safeTurnNumber,
        );

      nextState = {
        ...nextState,

        regime:
          nextRegime,

        regimeStartedTurn:
          safeTurnNumber,

        regimeEndsAfterTurn:
          safeTurnNumber +
          duration -
          1,

        pendingReports: [
          ...nextState.pendingReports,
          report,
        ],
      };
    }
  }

  const nextInterestRateLevel =
    resolveInterestRate(
      nextState,
      safeTurnNumber,
      random,
    );

  const interestRateChanged =
    nextInterestRateLevel !==
    nextState.interestRateLevel;

  nextState = {
    ...nextState,

    interestRateLevel:
      nextInterestRateLevel,

    lastInterestRateChangeTurn:
      interestRateChanged
        ? safeTurnNumber
        : nextState
            .lastInterestRateChangeTurn,

    lastResolvedTurn:
      safeTurnNumber,
  };

  const regimeStockBias =
    rollRegimeStockBias(
      nextState.regime,
      random,
    );

  const rateStockBias =
    rollInterestRateStockBias(
      nextState.interestRateLevel,
      random,
    );

  const stockMarketBias =
    roundRate(
      clamp(
        regimeStockBias +
          rateStockBias,

        -MAX_TOTAL_STOCK_BIAS,
        MAX_TOTAL_STOCK_BIAS,
      ),
    );

  return {
    state:
      nextState,

    regimeChanged,

    previousRegime,

    currentRegime:
      nextState.regime,

    interestRateChanged,

    previousInterestRateLevel,

    currentInterestRateLevel:
      nextState.interestRateLevel,

    publishedReports,

    stockMarketBias,
  };
}