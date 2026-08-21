import type { DistrictId } from "../../types";
import type { PropertyDevelopmentStage } from "../property/propertyTypes";
import type { InsurancePlanType } from "../insurance/insuranceTypes";

export type DisasterType =
  | "TYPHOON"
  | "HEAVY_RAIN"
  | "EARTHQUAKE"
  | "WILDFIRE";

export interface DisasterDefinition {
  type: DisasterType;
  name: string;
  description: string;
  minimumTargetCount: number;
  maximumTargetCount: number;
  minimumMarketDropRate: number;
  maximumMarketDropRate: number;
  tollMultiplier: number;
  tollPenaltyTurns: number;
  repairCostMultiplier: number;
}

export interface DisasterPropertyDamage {
  propertyId: string;
  propertyName: string;
  districtId: DistrictId;
  ownerPlayerId: string | null;
  stage: PropertyDevelopmentStage | null;
  previousPriceIndex: number;
  nextPriceIndex: number;
  marketChangeRate: number;
  previousPrice: number;
  currentPrice: number;
  tollMultiplier: number;
  tollPenaltyUntilTurn: number;
  originalRepairCost: number;
  insurancePlanType: InsurancePlanType | null;
  insuranceCoverageRate: number;
  insuranceCoverage: number;
  finalRepairCost: number;
}

export interface DisasterPlayerAssessment {
  playerId: string;
  totalAmount: number;
  damages: DisasterPropertyDamage[];
}

export interface DisasterEventResult {
  id: string;
  turnNumber: number;
  type: DisasterType;
  name: string;
  description: string;
  affectedDistrictIds: DistrictId[];
  propertyDamages: DisasterPropertyDamage[];
  playerAssessments: DisasterPlayerAssessment[];
  totalRepairCost: number;
}

export interface ActiveDisasterPenalty {
  propertyId: string;
  propertyName: string;
  disasterType: DisasterType;
  disasterName: string;
  tollMultiplier: number;
  expiresAfterTurn: number;
}

export type DisasterPenaltyMap = Record<string, ActiveDisasterPenalty>;

export interface DisasterState {
  lastOccurredTurn: number | null;
  penalties: DisasterPenaltyMap;
  history: DisasterEventResult[];
}

export interface PendingDisasterResolution {
  event: DisasterEventResult;
  mode: "SCHEDULED" | "DEV";
  stage: "EVENT" | "SETTLEMENT";
  currentAssessmentIndex: number;
  additionallyDisabledPlayerIds: string[];
  newlyBankruptPlayerIds: string[];
}

export type DisasterPaymentError =
  | "NO_PENDING_DISASTER"
  | "PLAYER_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "PAYMENT_FAILED";

export type DisasterLiquidationError =
  | "NO_PENDING_DISASTER"
  | "PROPERTY_NOT_OWNED"
  | "NOT_OWNER"
  | "SALE_FAILED"
  | "STOCK_NOT_OWNED"
  | "INVALID_STOCK_QUANTITY"
  | "COMPANY_NOT_FOUND"
  | "ASSETS_REMAIN";
