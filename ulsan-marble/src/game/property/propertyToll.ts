import type { PropertyData } from "../../types";
import type { PropertyDevelopmentStage } from "./propertyTypes";

const TOLL_RATE_BY_STAGE: Record<PropertyDevelopmentStage, number> = {
  LAND: 0.15,
  DEVELOPED: 0.35,
  BUILDING: 0.8,
  LANDMARK: 1.8,
};

export function getPropertyTollRate(
  stage: PropertyDevelopmentStage,
): number {
  return TOLL_RATE_BY_STAGE[stage];
}

export function getPropertyTollAmount(
  property: PropertyData,
  stage: PropertyDevelopmentStage,
  priceIndex = 1,
  policyMultiplier = 1,
): number {
  const currentPrice = Math.max(1, property.basePrice * priceIndex);
  const rawToll =
    currentPrice *
    getPropertyTollRate(stage) *
    property.tollMultiplier *
    policyMultiplier;

  return Math.max(1, Math.round(rawToll));
}
