import type { DistrictId } from "../../types";

export interface PropertyMarketState {
  propertyId: string;
  priceIndex: number;
  lastChangeRate: number;
  districtChangeRate: number;
  individualChangeRate: number;
  updatedTurn: number;
}

export type PropertyMarketMap =
  Record<string, PropertyMarketState>;

export interface DistrictMarketChange {
  districtId: DistrictId;
  changeRate: number;
}

export type PropertyMarketResolutionMode =
  | "SCHEDULED"
  | "DEV";

export interface PendingMarketResolution {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  cycle: PropertyMarketCycle;

  mode:
    PropertyMarketResolutionMode;

  additionallyDisabledPlayerIds:
    string[];
}

export interface PropertyMarketChange {
  propertyId: string;
  propertyName: string;
  districtId: DistrictId;

  previousPriceIndex: number;
  nextPriceIndex: number;

  districtChangeRate: number;
  individualChangeRate: number;
  appliedChangeRate: number;

  previousPrice: number;
  currentPrice: number;
}

export interface PropertyMarketCycle {
  turnNumber: number;

  districtChanges:
    DistrictMarketChange[];

  propertyChanges:
    PropertyMarketChange[];
}