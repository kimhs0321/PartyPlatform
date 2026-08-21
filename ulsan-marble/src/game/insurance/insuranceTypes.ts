import type { PropertyData } from "../../types";
import type { PropertyOwnership } from "../property/propertyTypes";

export type InsurancePlanType = "BASIC" | "COMPREHENSIVE";

export interface InsurancePlanDefinition {
  type: InsurancePlanType;
  name: string;
  description: string;
  premiumRate: number;
  coverageRate: number;
}

export interface InsuranceContract {
  propertyId: string;
  playerId: string;
  planType: InsurancePlanType;
  premiumPaid: number;
  coverageRate: number;
  startedTurn: number;
  expiresAfterTurn: number;
}

export type InsuranceContractMap = Record<string, InsuranceContract>;

export interface PendingInsuranceShop {
  playerId: string;
  visitId: string;
  tileId: number;
}

export interface InsurablePropertyAsset {
  property: PropertyData;
  ownership: PropertyOwnership;
  currentPrice: number;
  contract: InsuranceContract | null;
  isContractActive: boolean;
  remainingTurns: number;
  basicPremium: number;
  comprehensivePremium: number;
}

export type InsuranceShopError =
  | "NO_PENDING_SHOP"
  | "PLAN_NOT_FOUND"
  | "PROPERTY_NOT_OWNED"
  | "PROPERTY_NOT_DEVELOPED"
  | "INSUFFICIENT_FUNDS"
  | "DOWNGRADE_NOT_ALLOWED"
  | "PAYMENT_FAILED";
