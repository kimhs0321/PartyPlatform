import type {
  MacroRegime,
} from "../economy/macroEconomyTypes";

import {
  applyCompanyDividendEvent,
  getEffectiveCompanyDividendRate,
} from "./companyDividendRules";

import type {
  CompanyDividendEvent,
  CompanyDividendEventType,
  CompanyDividendModifierMap,
} from "./companyDividendTypes";

import type {
  StockCompanyData,
} from "./stockTypes";


export const COMPANY_DIVIDEND_EVENT_MIN_TURN =
  4;

export const COMPANY_DIVIDEND_EVENT_CHANCE =
  0.12;

export const COMPANY_DIVIDEND_COMPANY_COOLDOWN_TURNS =
  5;


const DIVIDEND_UP_RATE_DELTA =
  0.005;

const DIVIDEND_DOWN_RATE_DELTA =
  -0.005;

const SPECIAL_DIVIDEND_RATE =
  0.015;


function getPositiveEventChance(
  regime: MacroRegime,
): number {
  switch (regime) {
    case "BOOM":
      return 0.65;

    case "RECESSION":
      return 0.35;

    case "NEUTRAL":
    default:
      return 0.5;
  }
}


function isCompanyAvailableForEvent(
  company: StockCompanyData,
  modifiers: CompanyDividendModifierMap,
  turnNumber: number,
): boolean {
  const modifier =
    modifiers[company.id];

  if (!modifier) {
    return true;
  }

  /*
   * 다음 배당에 적용될
   * 1회성 효과가 이미 걸려 있으면
   * 새 이벤트를 겹치지 않는다.
   */
  if (
    modifier.suspendNextDividend ||
    modifier.specialDividendRate > 0
  ) {
    return false;
  }

  if (
    modifier.lastChangedTurn !== null &&
    turnNumber -
      modifier.lastChangedTurn <=
      COMPANY_DIVIDEND_COMPANY_COOLDOWN_TURNS
  ) {
    return false;
  }

  return true;
}


function chooseRandomItem<T>(
  items: readonly T[],
  random: () => number,
): T | null {
  if (items.length === 0) {
    return null;
  }

  const index =
    Math.min(
      items.length - 1,
      Math.floor(
        random() *
          items.length,
      ),
    );

  return items[index] ?? null;
}

type PositiveDividendEventType =
  | "DIVIDEND_UP"
  | "SPECIAL_DIVIDEND";

function getAvailablePositiveDividendEventTypes(
  company: StockCompanyData,
  modifiers: CompanyDividendModifierMap,
  turnNumber: number,
): PositiveDividendEventType[] {
  const currentRate =
    getEffectiveCompanyDividendRate(
      company,
      modifiers[company.id],
    );

  const types: PositiveDividendEventType[] = [
    "DIVIDEND_UP",
    "SPECIAL_DIVIDEND",
  ];

  return types.filter((type) => {
    const testEvent =
      createCompanyDividendEvent(
        company,
        turnNumber,
        type,
        "",
      );

    const nextModifiers =
      applyCompanyDividendEvent(
        modifiers,
        testEvent,
      );

    const nextRate =
      getEffectiveCompanyDividendRate(
        company,
        nextModifiers[company.id],
      );

    return (
      nextRate >
      currentRate + 1e-10
    );
  });
}

function choosePositiveEventType(
  company: StockCompanyData,
  availableTypes:
    PositiveDividendEventType[],
  random: () => number,
): PositiveDividendEventType {
  if (
    availableTypes.length === 1
  ) {
    return availableTypes[0];
  }

  const reliability =
    Math.max(
      0,
      Math.min(
        100,
        company.dividendReliability,
      ),
    );

  /*
   * 두 이벤트 모두 유효할 때만
   * 기존 배당 신뢰도별 확률을 적용한다.
   */
  const dividendUpChance =
    reliability >= 70
      ? 0.75
      : reliability >= 35
        ? 0.55
        : 0.3;

  return random() <
    dividendUpChance
    ? "DIVIDEND_UP"
    : "SPECIAL_DIVIDEND";
}



type NegativeDividendEventType =
  | "DIVIDEND_DOWN"
  | "DIVIDEND_SUSPENDED";

function getAvailableNegativeDividendEventTypes(
  company: StockCompanyData,
  modifiers: CompanyDividendModifierMap,
  turnNumber: number,
): NegativeDividendEventType[] {
  const currentRate =
    getEffectiveCompanyDividendRate(
      company,
      modifiers[company.id],
    );

  if (currentRate <= 0) {
    return [];
  }

  const types: NegativeDividendEventType[] = [
    "DIVIDEND_DOWN",
    "DIVIDEND_SUSPENDED",
  ];

  return types.filter((type) => {
    if (
      type === "DIVIDEND_SUSPENDED"
    ) {
      return true;
    }

    const testEvent =
      createCompanyDividendEvent(
        company,
        turnNumber,
        type,
        "",
      );

    const nextModifiers =
      applyCompanyDividendEvent(
        modifiers,
        testEvent,
      );

    const nextRate =
      getEffectiveCompanyDividendRate(
        company,
        nextModifiers[company.id],
      );

    return (
      nextRate <
      currentRate - 1e-10
    );
  });
}

function chooseNegativeEventType(
  company: StockCompanyData,
  availableTypes:
    NegativeDividendEventType[],
  random: () => number,
): NegativeDividendEventType {
  if (
    !availableTypes.includes(
      "DIVIDEND_DOWN",
    )
  ) {
    return "DIVIDEND_SUSPENDED";
  }

  if (
    !availableTypes.includes(
      "DIVIDEND_SUSPENDED",
    )
  ) {
    return "DIVIDEND_DOWN";
  }

  const reliability =
    Math.max(
      0,
      Math.min(
        100,
        company.dividendReliability,
      ),
    );

  /*
   * 두 이벤트 모두 유효할 때만
   * 기존 배당 신뢰도별 확률을 적용한다.
   */
  const suspendedChance =
    reliability >= 70
      ? 0.1
      : reliability >= 35
        ? 0.25
        : 0.45;

  return random() <
    suspendedChance
    ? "DIVIDEND_SUSPENDED"
    : "DIVIDEND_DOWN";
}


function createCompanyDividendEvent(
  company: StockCompanyData,
  turnNumber: number,
  type: CompanyDividendEventType,
  newsText: string,
): CompanyDividendEvent {
  switch (type) {
    case "DIVIDEND_UP":
      return {
        eventId:
          `COMPANY_DIVIDEND:${turnNumber}:${company.id}:${type}`,

        companyId:
          company.id,

        companyName:
          company.name,

        ticker:
          company.ticker,

        turnNumber,

        type,

        /*
         * 화면에는 이 회사 뉴스 자체를 띄운다.
         * "배당 이벤트" 같은 시스템 문구는
         * 제목에 넣지 않는다.
         */
        headline:
          `${company.name} · ${newsText}`,

        summary:
          "호재를 반영해 주주환원 정책이 강화됐습니다.",

        persistentRateDelta:
          DIVIDEND_UP_RATE_DELTA,

        specialDividendRate: 0,
      };


    case "DIVIDEND_DOWN":
      return {
        eventId:
          `COMPANY_DIVIDEND:${turnNumber}:${company.id}:${type}`,

        companyId:
          company.id,

        companyName:
          company.name,

        ticker:
          company.ticker,

        turnNumber,

        type,

        headline:
          `${company.name} · ${newsText}`,

        summary:
          "경영 여건 악화로 배당정책이 축소됐습니다.",

        persistentRateDelta:
          DIVIDEND_DOWN_RATE_DELTA,

        specialDividendRate: 0,
      };


    case "SPECIAL_DIVIDEND":
      return {
        eventId:
          `COMPANY_DIVIDEND:${turnNumber}:${company.id}:${type}`,

        companyId:
          company.id,

        companyName:
          company.name,

        ticker:
          company.ticker,

        turnNumber,

        type,

        headline:
          `${company.name} · ${newsText}`,

        summary:
          "실적 개선을 반영해 다음 배당 정산에 특별배당이 지급됩니다.",

        persistentRateDelta: 0,

        specialDividendRate:
          SPECIAL_DIVIDEND_RATE,
      };


    case "DIVIDEND_SUSPENDED":
      return {
        eventId:
          `COMPANY_DIVIDEND:${turnNumber}:${company.id}:${type}`,

        companyId:
          company.id,

        companyName:
          company.name,

        ticker:
          company.ticker,

        turnNumber,

        type,

        headline:
          `${company.name} · ${newsText}`,

        summary:
          "경영 불확실성으로 다음 배당 정산의 배당이 일시 중단됩니다.",

        persistentRateDelta: 0,

        specialDividendRate: 0,
      };
  }
}


export function resolveCompanyDividendEvent(
  companies: StockCompanyData[],
  modifiers: CompanyDividendModifierMap,
  turnNumber: number,
  macroRegime: MacroRegime,
  random: () => number = Math.random,
): CompanyDividendEvent | null {
  if (
    turnNumber <
    COMPANY_DIVIDEND_EVENT_MIN_TURN
  ) {
    return null;
  }

  /*
   * 매 턴 독립 12%.
   * 누적 확률이나 pity는 없다.
   */
  if (
    random() >=
    COMPANY_DIVIDEND_EVENT_CHANCE
  ) {
    return null;
  }

  const availableCompanies =
    companies.filter(
      (company) =>
        isCompanyAvailableForEvent(
          company,
          modifiers,
          turnNumber,
        ),
    );

  if (
    availableCompanies.length === 0
  ) {
    return null;
  }

  const positive =
    random() <
    getPositiveEventChance(
      macroRegime,
    );

  /*
   * 악재로 배당을 줄이려면
   * 실제 줄일 배당이 있어야 한다.
   *
   * 현재 배당률 0인 회사에
   * "배당 축소"가 발생하는
   * 무효 이벤트를 막는다.
   */

  const candidates =
    positive
      ? availableCompanies.filter(
          (company) =>
            getAvailablePositiveDividendEventTypes(
              company,
              modifiers,
              turnNumber,
            ).length > 0,
        )
      : availableCompanies.filter(
          (company) =>
            getAvailableNegativeDividendEventTypes(
              company,
              modifiers,
              turnNumber,
            ).length > 0,
        );

  const company =
    chooseRandomItem(
      candidates,
      random,
    );

  if (!company) {
    return null;
  }


  const type =
    positive
      ? choosePositiveEventType(
          company,
          getAvailablePositiveDividendEventTypes(
            company,
            modifiers,
            turnNumber,
          ),
          random,
        )
      : chooseNegativeEventType(
          company,
          getAvailableNegativeDividendEventTypes(
            company,
            modifiers,
            turnNumber,
          ),
          random,
        );

  const newsPool =
    positive
      ? company.positiveNews
      : company.negativeNews;

  const newsText =
    chooseRandomItem(
      newsPool,
      random,
    ) ??
    (
      positive
        ? "실적 개선"
        : "실적 악화"
    );

  return createCompanyDividendEvent(
    company,
    turnNumber,
    type,
    newsText,
  );
}