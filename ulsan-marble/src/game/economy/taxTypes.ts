import type { PropertyDevelopmentStage } from "../property/propertyTypes";

export interface TaxAssessmentItem {
  propertyId: string;
  propertyName: string;
  stage: PropertyDevelopmentStage;
  basePrice: number;
  currentPrice: number;
  priceIndex: number;
  rate: number;
  amount: number;
}

export interface TaxAssessment {
  playerId: string;
  settlementTurn: number;
  items: TaxAssessmentItem[];
  totalAmount: number;
}

export interface PendingTaxSettlement {
  settlementId: string;
  settlementTurn: number;
  turnSequence: number;
  assessments: TaxAssessment[];
  currentIndex: number;
  newlyBankruptPlayerIds: string[];
}

export type TaxPaymentError =
  | "NO_PENDING_TAX"
  | "PLAYER_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "PAYMENT_FAILED";

export type TaxLiquidationError =
  | "NO_PENDING_TAX"
  | "PROPERTY_NOT_OWNED"
  | "NOT_OWNER"
  | "SALE_FAILED"
  | "STOCK_NOT_OWNED"
  | "INVALID_STOCK_QUANTITY"
  | "COMPANY_NOT_FOUND"
  | "ASSETS_REMAIN";
