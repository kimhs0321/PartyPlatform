import type { PropertyMarketMap } from "../market/marketTypes";
import { getCurrentPropertyPrice } from "../market/propertyMarket";
import type { PropertyData } from "../../types";
import { getPropertySalePrice } from "./propertyValuation";
import type {
  PropertyOwnership,
  PropertyOwnershipMap,
} from "./propertyTypes";

export interface SellablePropertyAsset {
  property: PropertyData;
  ownership: PropertyOwnership;
  currentLandPrice: number;
  currentValue: number;
  salePrice: number;
}

export type PropertySaleError =
  | "PROPERTY_NOT_FOUND"
  | "OWNERSHIP_NOT_FOUND"
  | "NOT_OWNER";

export interface PropertySaleSuccess {
  ok: true;
  ownerships: PropertyOwnershipMap;
  ownership: PropertyOwnership;
  salePrice: number;
}

export interface PropertySaleFailure {
  ok: false;
  ownerships: PropertyOwnershipMap;
  error: PropertySaleError;
}

export type PropertySaleResult =
  | PropertySaleSuccess
  | PropertySaleFailure;

export function getSellablePropertyAssets(
  ownerships: PropertyOwnershipMap,
  properties: PropertyData[],
  playerId: string,
  propertyMarket: PropertyMarketMap,
  saleRate?: number,
): SellablePropertyAsset[] {
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );

  return Object.values(ownerships)
    .filter((ownership) => ownership.ownerPlayerId === playerId)
    .flatMap((ownership) => {
      const property = propertyMap.get(ownership.propertyId);
      if (!property) return [];

      const currentLandPrice = getCurrentPropertyPrice(
        property,
        propertyMarket,
      );
      const currentValue =
        currentLandPrice + ownership.constructionInvestment;

      return [
        {
          property,
          ownership,
          currentLandPrice,
          currentValue,
          salePrice: getPropertySalePrice(
            ownership,
            currentLandPrice,
            saleRate,
          ),
        },
      ];
    })
    .sort(
      (first, second) =>
        first.property.boardTileId - second.property.boardTileId,
    );
}

export function sellPropertyOwnership(
  ownerships: PropertyOwnershipMap,
  propertyId: string,
  playerId: string,
  property: PropertyData,
  propertyMarket: PropertyMarketMap,
  saleRate?: number,
): PropertySaleResult {
  const ownership = ownerships[propertyId];

  if (!ownership) {
    return {
      ok: false,
      ownerships,
      error: "OWNERSHIP_NOT_FOUND",
    };
  }

  if (ownership.ownerPlayerId !== playerId) {
    return {
      ok: false,
      ownerships,
      error: "NOT_OWNER",
    };
  }

  const nextOwnerships = { ...ownerships };
  delete nextOwnerships[propertyId];

  return {
    ok: true,
    ownerships: nextOwnerships,
    ownership,
    salePrice: getPropertySalePrice(
      ownership,
      getCurrentPropertyPrice(property, propertyMarket),
      saleRate,
    ),
  };
}
