export type MacroRegime =
  | "BOOM"
  | "NEUTRAL"
  | "RECESSION";

export type InterestRateLevel =
  | "LOW"
  | "BASE"
  | "HIGH";

export interface MacroEconomyReport {
  reportId: string;

  regime: MacroRegime;

  observedFromTurn: number;
  publishedTurn: number;

  headline: string;
  summary: string;
}

export interface MacroEconomyState {
  regime: MacroRegime;

  regimeStartedTurn: number;
  regimeEndsAfterTurn: number;

  interestRateLevel:
    InterestRateLevel;

  lastInterestRateChangeTurn:
    number | null;

  pendingReports:
    MacroEconomyReport[];

  reportHistory:
    MacroEconomyReport[];

  lastResolvedTurn:
    number;
}

export interface MacroEconomyTurnResolution {
  state: MacroEconomyState;

  regimeChanged: boolean;

  previousRegime:
    MacroRegime;

  currentRegime:
    MacroRegime;

  interestRateChanged:
    boolean;

  previousInterestRateLevel:
    InterestRateLevel;

  currentInterestRateLevel:
    InterestRateLevel;

  publishedReports:
    MacroEconomyReport[];

  /*
   * 이번 턴 주식시장에 가해지는
   * 전 산업 공통 약한 압력.
   *
   * 예:
   * +0.008 = +0.8%p
   */
  stockMarketBias: number;
}