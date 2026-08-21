import type { PropertyOwnership } from "./propertyTypes";

export const PROPERTY_SALE_RATE = 0.9;

export function getPropertyCurrentValue(
  ownership: PropertyOwnership,
  currentLandPrice: number,
): number {
  return Math.max(
    1,
    Math.round(currentLandPrice + ownership.constructionInvestment),
  );
}

export function getPropertySalePrice(
  ownership: PropertyOwnership,
  currentLandPrice: number,
  saleRate: number = PROPERTY_SALE_RATE,
): number {
  return Math.max(
    1,
    Math.round(
      getPropertyCurrentValue(ownership, currentLandPrice) * saleRate,
    ),
  );
}
