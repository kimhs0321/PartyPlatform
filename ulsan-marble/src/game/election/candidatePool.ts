import type {
  MayorCandidate,
  MayorPolicy,
  MayorPolicyCategory,
  MayorPolicyId,
} from "./electionTypes";

export const MAYOR_POLICIES: MayorPolicy[] = [
  {
    id: "URBAN_DEVELOPMENT",
    category: "PROPERTY",
    name: "도시개발 촉진",
    summary: "건설비를 낮추는 대신 부동산 보유세를 높입니다.",
    benefits: ["건설비 15% 감소"],
    tradeoffs: ["부동산 세금 10% 증가"],
    effects: {
      constructionCostMultiplier: 0.85,
      propertyTaxMultiplier: 1.1,
    },
  },
  {
    id: "HOUSING_STABILITY",
    category: "PROPERTY",
    name: "주거 안정",
    summary: "통행료 부담을 줄이고 부동산 매각 회수율을 높입니다.",
    benefits: ["통행료 15% 감소", "부동산 매각률 95%"],
    tradeoffs: ["임대 수익 감소"],
    effects: {
      tollMultiplier: 0.85,
      propertySaleRate: 0.95,
    },
  },
  {
    id: "CITIZEN_INCOME",
    category: "ECONOMY",
    name: "시민소득 확대",
    summary: "출발 월급을 늘리는 대신 부동산 세금을 높입니다.",
    benefits: ["출발 월급 50만원 증가"],
    tradeoffs: ["부동산 세금 10% 증가"],
    effects: {
      salaryBonus: 50,
      propertyTaxMultiplier: 1.1,
    },
  },
  {
    id: "FISCAL_AUSTERITY",
    category: "ECONOMY",
    name: "긴축 재정",
    summary: "부동산 세금을 줄이지만 출발 월급도 줄입니다.",
    benefits: ["부동산 세금 15% 감소"],
    tradeoffs: ["출발 월급 50만원 감소"],
    effects: {
      salaryBonus: -50,
      propertyTaxMultiplier: 0.85,
    },
  },
  {
    id: "CORPORATE_INVESTMENT",
    category: "STOCK",
    name: "기업 투자 활성화",
    summary: "주식시장의 상승과 하락 변동성을 함께 키웁니다.",
    benefits: ["주식 상승 기회 확대"],
    tradeoffs: ["주식 하락 위험 확대"],
    effects: {
      stockMarketVolatilityMultiplier: 1.35,
    },
  },
  {
    id: "FINANCIAL_STABILITY",
    category: "STOCK",
    name: "금융시장 안정",
    summary: "주식시장의 전체 변동폭을 낮춥니다.",
    benefits: ["주식 변동폭 40% 감소"],
    tradeoffs: ["큰 폭의 상승 가능성 감소"],
    effects: {
      stockMarketVolatilityMultiplier: 0.6,
    },
  },
  {
    id: "PROPERTY_STIMULUS",
    category: "MARKET",
    name: "부동산 경기 부양",
    summary: "부동산 시세에 상승 편향을 주는 대신 보유세를 높입니다.",
    benefits: ["부동산 변동률에 +1.5%p 상승 편향"],
    tradeoffs: ["부동산 세금 10% 증가"],
    effects: {
      propertyMarketChangeBias: 0.015,
      propertyTaxMultiplier: 1.1,
    },
  },
  {
    id: "ANTI_SPECULATION",
    category: "MARKET",
    name: "부동산 투기 억제",
    summary: "부동산 변동성을 낮추지만 매각 회수율도 낮춥니다.",
    benefits: ["부동산 변동폭 40% 감소"],
    tradeoffs: ["부동산 매각률 85%"],
    effects: {
      propertyMarketVolatilityMultiplier: 0.6,
      propertySaleRate: 0.85,
    },
  },
  {
    id: "LUCKY_CITY",
    category: "LUCK_SAFETY",
    name: "행운도시 정책",
    summary: "즉석복권 당첨 가능성과 로또 누적 당첨금을 높입니다.",
    benefits: ["즉석복권 당첨 확률 +5%p", "로또 1장당 누적금 +5만원"],
    tradeoffs: ["복권 의존 전략 강화"],
    effects: {
      scratchWinProbabilityBonus: 0.05,
      lottoJackpotContributionBonus: 5,
    },
  },
  {
    id: "DISASTER_SAFETY",
    category: "LUCK_SAFETY",
    name: "재난안전 강화",
    summary: "재해 위험과 복구비를 줄이는 대신 세금을 소폭 높입니다.",
    benefits: ["자연재해 발생 확률 40% 감소", "재해 복구비 30% 감소"],
    tradeoffs: ["부동산 세금 5% 증가"],
    effects: {
      disasterChanceMultiplier: 0.6,
      disasterRepairCostMultiplier: 0.7,
      propertyTaxMultiplier: 1.05,
    },
  },
  {
    id: "URBAN_REGENERATION",
    category: "PROPERTY",
    name: "도시재생 지원",
    summary:
      "건설비와 부동산 변동폭을 낮추는 대신 부동산 세금을 소폭 높입니다.",
    benefits: ["건설비 10% 감소", "부동산 변동폭 20% 감소"],
    tradeoffs: ["부동산 세금 5% 증가"],
    effects: {
      constructionCostMultiplier: 0.9,
      propertyMarketVolatilityMultiplier: 0.8,
      propertyTaxMultiplier: 1.05,
    },
  },
  {
    id: "INDUSTRIAL_SAFETY",
    category: "LUCK_SAFETY",
    name: "산업안전 투자",
    summary:
      "재난 발생 위험과 복구비를 줄이는 대신 건설비가 증가합니다.",
    benefits: ["자연재해 발생 확률 30% 감소", "재해 복구비 15% 감소"],
    tradeoffs: ["건설비 10% 증가"],
    effects: {
      disasterChanceMultiplier: 0.7,
      disasterRepairCostMultiplier: 0.85,
      constructionCostMultiplier: 1.1,
    },
  },
];

export const MAYOR_CANDIDATES: MayorCandidate[] = [
  {
    id: "candidate-kang-minjun",
    number: 1,
    imagePath: "/assets/election/candidates/candidate-01.png",
    name: "강민준",
    title: "도시계획 전문가",
    slogan: "더 빠르게 성장하는 울산",
    policyId: "URBAN_DEVELOPMENT",
  },
  {
    id: "candidate-yoon-seoyeon",
    number: 2,
    imagePath: "/assets/election/candidates/candidate-02.png",
    name: "윤서연",
    title: "주거정책 연구자",
    slogan: "부담은 낮추고 자산은 지키겠습니다",
    policyId: "HOUSING_STABILITY",
  },
  {
    id: "candidate-park-jihun",
    number: 3,
    imagePath: "/assets/election/candidates/candidate-03.png",
    name: "박지훈",
    title: "복지행정 전문가",
    slogan: "시민의 지갑부터 채우겠습니다",
    policyId: "CITIZEN_INCOME",
  },
  {
    id: "candidate-choi-hyejin",
    number: 4,
    imagePath: "/assets/election/candidates/candidate-04.png",
    name: "최혜진",
    title: "재정개혁 전문가",
    slogan: "낭비 없는 가벼운 시정",
    policyId: "FISCAL_AUSTERITY",
  },
  {
    id: "candidate-lee-dohyun",
    number: 5,
    imagePath: "/assets/election/candidates/candidate-05.png",
    name: "이도현",
    title: "기업투자 전략가",
    slogan: "위험을 감수하고 기회를 키우겠습니다",
    policyId: "CORPORATE_INVESTMENT",
  },
  {
    id: "candidate-han-yuna",
    number: 6,
    imagePath: "/assets/election/candidates/candidate-06.png",
    name: "한유나",
    title: "금융시장 분석가",
    slogan: "흔들리지 않는 울산 경제",
    policyId: "FINANCIAL_STABILITY",
  },
  {
    id: "candidate-kim-taeyang",
    number: 7,
    imagePath: "/assets/election/candidates/candidate-07.png",
    name: "김태양",
    title: "지역경제 전문가",
    slogan: "부동산 경기를 다시 뛰게 하겠습니다",
    policyId: "PROPERTY_STIMULUS",
  },
  {
    id: "candidate-song-jiwoo",
    number: 8,
    imagePath: "/assets/election/candidates/candidate-08.png",
    name: "송지우",
    title: "시장감독 전문가",
    slogan: "투기는 낮추고 안정은 높이겠습니다",
    policyId: "ANTI_SPECULATION",
  },
  {
    id: "candidate-oh-harin",
    number: 9,
    imagePath: "/assets/election/candidates/candidate-09.png",
    name: "오하린",
    title: "관광문화 기획자",
    slogan: "행운이 머무는 즐거운 울산",
    policyId: "LUCKY_CITY",
  },
  {
    id: "candidate-jung-woojin",
    number: 10,
    imagePath: "/assets/election/candidates/candidate-10.png",
    name: "정우진",
    title: "재난안전 전문가",
    slogan: "위험보다 한발 먼저 준비하겠습니다",
    policyId: "DISASTER_SAFETY",
  },
  {
    id: "candidate-moon-seojun",
    number: 11,
    imagePath: "/assets/election/candidates/candidate-11.png",
    name: "문서준",
    title: "도시재생 전문가",
    slogan: "낡은 도시는 새롭게, 시민의 부담은 가볍게",
    policyId: "URBAN_REGENERATION",
  },
  {
    id: "candidate-seo-haneul",
    number: 12,
    imagePath: "/assets/election/candidates/candidate-12.png",
    name: "서하늘",
    title: "산업안전 전문가",
    slogan: "성장하는 울산, 안전한 산업현장",
    policyId: "INDUSTRIAL_SAFETY",
  },
];

const policyMap = new Map(MAYOR_POLICIES.map((policy) => [policy.id, policy]));

export function getMayorPolicy(policyId: MayorPolicyId): MayorPolicy {
  const policy = policyMap.get(policyId);
  if (!policy) {
    throw new Error(`Unknown mayor policy: ${policyId}`);
  }
  return policy;
}

export function getCandidatePolicy(candidate: MayorCandidate): MayorPolicy {
  return getMayorPolicy(candidate.policyId);
}

export function getPolicyCategoryLabel(category: MayorPolicyCategory): string {
  switch (category) {
    case "PROPERTY":
      return "부동산";
    case "ECONOMY":
      return "현금·복지";
    case "STOCK":
      return "주식";
    case "MARKET":
      return "부동산 시장";
    case "LUCK_SAFETY":
      return "행운·안전";
  }
}
