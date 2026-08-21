import type { DistrictId } from "../../types";
import type { StockIndustryData } from "../stock/stockTypes";
import type { EconomicNewsDefinition } from "./economicNewsTypes";

const DISTRICT_NAMES: Record<DistrictId, string> = {
  NAM: "남구",
  JUNG: "중구",
  BUK: "북구",
  DONG: "동구",
  ULJU: "울주군",
};

const DISTRICT_IDS = Object.keys(DISTRICT_NAMES) as DistrictId[];

function createStockIndustryNews(
  industries: StockIndustryData[],
): EconomicNewsDefinition[] {
  return industries.flatMap((industry) => [
    {
      id: `stock-${industry.id.toLowerCase()}-up`,
      headline: `${industry.name} 업황 개선 기대감`,
      summary: `${industry.name} 분야의 신규 수주와 투자 확대 전망이 발표됐습니다.`,
      effectDescription: `${industry.name} 테마에 긍정적인 영향`,
      tone: "POSITIVE" as const,
      durationTurns: 3,
      effect: {
        type: "STOCK_INDUSTRY_BIAS" as const,
        industryId: industry.id,
        changeBias: 0.06,
      },
    },
    {
      id: `stock-${industry.id.toLowerCase()}-down`,
      headline: `${industry.name} 실적 둔화 우려`,
      summary: `${industry.name} 분야의 수요 위축과 비용 증가 전망이 확산됐습니다.`,
      effectDescription: `${industry.name} 테마에 부정적인 영향`,
      tone: "NEGATIVE" as const,
      durationTurns: 3,
      effect: {
        type: "STOCK_INDUSTRY_BIAS" as const,
        industryId: industry.id,
        changeBias: -0.06,
      },
    },
  ]);
}

function createPropertyDistrictNews(): EconomicNewsDefinition[] {
  return DISTRICT_IDS.flatMap((districtId) => {
    const districtName = DISTRICT_NAMES[districtId];

    return [
      {
        id: `property-${districtId.toLowerCase()}-up`,
        headline: `${districtName} 개발 호재 발표`,
        summary: `${districtName}의 교통·생활 기반 확충 계획으로 부동산 기대감이 커졌습니다.`,
        effectDescription: `${districtName} 부동산 시장에 긍정적인 영향`,
        tone: "POSITIVE" as const,
        durationTurns: 3,
        effect: {
          type: "PROPERTY_DISTRICT_BIAS" as const,
          districtId,
          changeBias: 0.05,
        },
      },
      {
        id: `property-${districtId.toLowerCase()}-down`,
        headline: `${districtName} 부동산 수요 위축`,
        summary: `${districtName}의 거래 감소와 공급 부담으로 부동산 전망이 약화됐습니다.`,
        effectDescription: `${districtName} 부동산 시장에 부정적인 영향`,
        tone: "NEGATIVE" as const,
        durationTurns: 3,
        effect: {
          type: "PROPERTY_DISTRICT_BIAS" as const,
          districtId,
          changeBias: -0.05,
        },
      },
    ];
  });
}

const MACRO_NEWS: EconomicNewsDefinition[] = [
  {
    id: "macro-construction-cost-down",
    headline: "건설 원자재 가격 안정",
    summary: "건설 자재 공급이 정상화되며 개발 비용 부담이 낮아졌습니다.",
    effectDescription: "건설비 부담 완화",
    tone: "POSITIVE",
    durationTurns: 3,
    effect: { type: "CONSTRUCTION_COST", multiplier: 0.85 },
  },
  {
    id: "macro-construction-cost-up",
    headline: "건설 자재 가격 급등",
    summary: "원자재와 운송비 상승으로 건설 비용이 크게 올랐습니다.",
    effectDescription: "건설비 부담 증가",
    tone: "NEGATIVE",
    durationTurns: 3,
    effect: { type: "CONSTRUCTION_COST", multiplier: 1.15 },
  },
  {
    id: "macro-development-review",
    headline: "울산시, 도시개발계획 긴급 재검토",
    summary:
      "안전성과 기반시설 수용 능력을 다시 심사하기 위해 일부 개발사업에 한시적 제한 명령이 내려졌습니다.",
    effectDescription: "무작위 보유 부동산 1곳 개발 제한",
    tone: "NEGATIVE",
    durationTurns: 3,
    effect: {
      type: "DEVELOPMENT_RESTRICTION",
      durationTurns: 3,
      target: "RANDOM_DEVELOPABLE_PROPERTY",
    },
  },
  {
    id: "macro-tourism-boom",
    headline: "울산 관광객 급증",
    summary: "지역 관광 수요가 증가하며 상권과 숙박 수요가 활기를 띠고 있습니다.",
    effectDescription: "부동산 통행료 수익 증가",
    tone: "POSITIVE",
    durationTurns: 3,
    effect: { type: "TOLL", multiplier: 1.2 },
  },
  {
    id: "macro-consumption-down",
    headline: "지역 소비 심리 위축",
    summary: "소비 지출 감소로 지역 상권 수익성이 낮아졌습니다.",
    effectDescription: "부동산 통행료 수익 감소",
    tone: "NEGATIVE",
    durationTurns: 3,
    effect: { type: "TOLL", multiplier: 0.8 },
  },
  {
    id: "macro-export-boom",
    headline: "울산항 수출 물동량 증가",
    summary: "주요 수출 품목의 해외 주문이 늘면서 항만 물류가 활기를 띠고 있습니다.",
    effectDescription: "울산항 계약 환경 개선",
    tone: "POSITIVE",
    durationTurns: 3,
    effect: { type: "PORT_SUCCESS", chanceDelta: 0.15 },
  },
  {
    id: "macro-logistics-delay",
    headline: "국제 물류망 차질",
    summary: "운송 지연과 항로 불안으로 수출 계약 위험이 높아졌습니다.",
    effectDescription: "울산항 계약 환경 악화",
    tone: "NEGATIVE",
    durationTurns: 3,
    effect: { type: "PORT_SUCCESS", chanceDelta: -0.15 },
  },
  {
    id: "macro-deposit-rate-up",
    headline: "은행 예금 특별 우대금리",
    summary: "시중 자금 유치를 위해 일반예금 우대금리가 한시적으로 적용됩니다.",
    effectDescription: "일반예금 이자 여건 개선",
    tone: "POSITIVE",
    durationTurns: 3,
    effect: { type: "BANK_INTEREST", multiplier: 2 },
  },
  {
    id: "macro-deposit-rate-down",
    headline: "예금금리 인하",
    summary: "금융시장 안정으로 일반예금 이자율이 한시적으로 낮아졌습니다.",
    effectDescription: "일반예금 이자 여건 악화",
    tone: "NEGATIVE",
    durationTurns: 3,
    effect: { type: "BANK_INTEREST", multiplier: 0.5 },
  },
];

export function createEconomicNewsPool(
  industries: StockIndustryData[],
): EconomicNewsDefinition[] {
  return [
    ...createStockIndustryNews(industries),
    ...createPropertyDistrictNews(),
    ...MACRO_NEWS,
  ];
}
