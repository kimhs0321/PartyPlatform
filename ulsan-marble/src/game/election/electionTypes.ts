export type MayorPolicyCategory =
  | "PROPERTY"
  | "ECONOMY"
  | "STOCK"
  | "MARKET"
  | "LUCK_SAFETY";

export type MayorPolicyId =
  | "URBAN_DEVELOPMENT"
  | "HOUSING_STABILITY"
  | "CITIZEN_INCOME"
  | "FISCAL_AUSTERITY"
  | "CORPORATE_INVESTMENT"
  | "FINANCIAL_STABILITY"
  | "PROPERTY_STIMULUS"
  | "ANTI_SPECULATION"
  | "LUCKY_CITY"
  | "DISASTER_SAFETY"
  | "URBAN_REGENERATION"
  | "INDUSTRIAL_SAFETY";

export interface MayorPolicyEffects {
  salaryBonus?: number;
  constructionCostMultiplier?: number;
  propertyTaxMultiplier?: number;
  tollMultiplier?: number;
  propertySaleRate?: number;
  propertyMarketVolatilityMultiplier?: number;
  propertyMarketChangeBias?: number;
  stockMarketVolatilityMultiplier?: number;
  scratchWinProbabilityBonus?: number;
  lottoJackpotContributionBonus?: number;
  disasterChanceMultiplier?: number;
  disasterRepairCostMultiplier?: number;
}

export interface MayorPolicy {
  id: MayorPolicyId;
  category: MayorPolicyCategory;
  name: string;
  summary: string;
  benefits: string[];
  tradeoffs: string[];
  effects: MayorPolicyEffects;
}

export interface MayorCandidate {
  id: string;
  number: number;
  imagePath: string;
  name: string;
  title: string;
  slogan: string;
  policyId: MayorPolicyId;
}

export interface MayorTerm {
  candidate: MayorCandidate;
  policy: MayorPolicy;
  electedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
}

export interface MayorElectionResult {
  winnerCandidateId: string;
  voteCounts: Record<string, number>;
  tiedCandidateIds: string[];
  wasTieBreak: boolean;
}

export interface PendingMayorElection {
  electionTurn: number;
  mode: "SCHEDULED" | "DEV";
  candidates: MayorCandidate[];
  eligibleVoterIds: string[];
  currentVoterIndex: number;
  votes: Record<string, string>;
  result: MayorElectionResult | null;
  additionallyDisabledPlayerIds: string[];
}
