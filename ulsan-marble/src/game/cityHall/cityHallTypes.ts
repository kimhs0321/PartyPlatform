import type { PropertyDevelopmentStage } from "../property/propertyTypes";

export type CityHallProjectCategory =
  | "PROPERTY"
  | "STOCK"
  | "FINANCE"
  | "PUBLIC";

export type CityHallProjectTargetType = "NONE" | "STOCK_INDUSTRY";

export interface CityHallProjectEffects {
  constructionCostMultiplier?: number;
  propertyMarketChangeBias?: number;
  propertyMarketMinimumChangeRate?: number;
  nonLandmarkTollMultiplier?: number;
  stockIndustryChangeBias?: number;
  stockMinimumFinalChangeRate?: number;
  oneTimeStockIndustryBoost?: number;
  propertyTaxMultiplier?: number;
  bankInterestMultiplier?: number;
  landmarkTollMultiplier?: number;
  portSuccessChanceDelta?: number;
  disasterRepairCostMultiplier?: number;
}

export interface CityHallProjectDefinition {
  id: string;
  name: string;
  category: CityHallProjectCategory;
  summary: string;
  effectDescription: string;
  durationTurns: number;
  targetType: CityHallProjectTargetType;
  effects: CityHallProjectEffects;
}

export interface CityHallProjectTerm {
  instanceId: string;
  project: CityHallProjectDefinition;
  selectedByPlayerId: string;
  selectedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
  targetIndustryId: string | null;
  oneTimeEffectConsumed: boolean;
}

export interface CityHallProjectHistoryItem {
  instanceId: string;
  projectId: string;
  projectName: string;
  selectedByPlayerId: string;
  selectedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
  targetIndustryId: string | null;
}

export type CityHallApplicationType =
  | "DEVELOPMENT_PERMIT"
  | "DEVELOPMENT_SUPPORT"
  | "PROPERTY_TAX_SUPPORT";

export interface CityHallPropertyOption {
  propertyId: string;
  propertyName: string;
  stage: PropertyDevelopmentStage;
  isRestricted: boolean;
  canDevelop: boolean;
}

export interface CityHallTargetedSupport {
  propertyId: string;
  multiplier: number;
  grantedTurn: number;
}

export interface CityHallPlayerBenefits {
  developmentSupport: CityHallTargetedSupport | null;
  propertyTaxSupport: CityHallTargetedSupport | null;
}

export type CityHallPlayerBenefitMap = Record<
  string,
  CityHallPlayerBenefits
>;

export interface CityHallState {
  currentTerm: CityHallProjectTerm | null;
  /** 이전 구조와의 호환을 위해 남기지만 자동 발동 구조에서는 항상 null입니다. */
  scheduledTerm: CityHallProjectTerm | null;
  history: CityHallProjectHistoryItem[];
  playerBenefits: CityHallPlayerBenefitMap;
}

export interface PendingCityHallSelection {
  playerId: string;
  visitId: string;
  turnSequence: number;

  activatedTerm: CityHallProjectTerm;

  stage: "APPLICATION" | "COMPLETED";
  applicationType: CityHallApplicationType | null;
  propertyId: string | null;
  resultText: string | null;
}