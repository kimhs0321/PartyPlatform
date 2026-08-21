import type { DistrictId, PropertyData } from "../../types";
import type {UlsanMarbleArrivalContext,} from "../../../../shared/ulsanMarbleProtocol";

export type PropertyDevelopmentStage =
  | "LAND"
  | "DEVELOPED"
  | "BUILDING"
  | "LANDMARK";

export interface PropertyOwnership {
  propertyId: string;
  ownerPlayerId: string;
  purchasePrice: number;
  purchasedTurn: number;
  stage: PropertyDevelopmentStage;
  constructionInvestment: number;
  lastDevelopedTurn?: number;
}

export type PropertyOwnershipMap = Record<string, PropertyOwnership>;

export type LandmarkPurchaseRequirement =
  | {
      kind: "NONE";
      eligible: true;
    }
  | {
      kind: "DISTRICT";
      eligible: boolean;
      districtId: DistrictId;
      ownedCount: number;
      totalCount: number;
      requiredCount: number;
    }
  | {
      kind: "CITY";
      eligible: boolean;
      ownedDistrictLandmarkCount: number;
      requiredDistrictLandmarkCount: number;
      enteredDistrictCount: number;
      requiredDistrictCount: number;
    };

export interface PendingPropertyPurchase {
  property: PropertyData;
  playerId: string;
  arrival?: UlsanMarbleArrivalContext;
}

export type PropertyPurchaseError =
  | "INSUFFICIENT_FUNDS"
  | "ALREADY_OWNED"
  | "LANDMARK_REQUIREMENT_NOT_MET"
  | "NO_PENDING_PURCHASE";

export interface PendingPropertyDevelopment {
  property: PropertyData;
  playerId: string;
  propertyId: string;
}

export type PropertyDevelopmentError =
  | "INSUFFICIENT_FUNDS"
  | "NO_PENDING_DEVELOPMENT"
  | "NOT_OWNER"
  | "MAX_STAGE"
  | "DEVELOPMENT_RESTRICTED";

export interface PendingTollPayment {
  property: PropertyData;
  payerPlayerId: string;
  ownerPlayerId: string;
  amount: number;
  stage: PropertyDevelopmentStage;
}

export type TollPaymentError =
  | "INSUFFICIENT_FUNDS"
  | "NO_PENDING_TOLL"
  | "OWNER_NOT_FOUND";

export type AssetLiquidationError =
  | "NO_PENDING_TOLL"
  | "PROPERTY_NOT_OWNED"
  | "NOT_OWNER"
  | "SALE_FAILED"
  | "STOCK_NOT_OWNED"
  | "INVALID_STOCK_QUANTITY"
  | "COMPANY_NOT_FOUND"
  | "ASSETS_REMAIN"
  | "OWNER_NOT_FOUND";
