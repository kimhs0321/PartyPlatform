import type { PlayerTokenData } from "../../components/PlayerToken";
import type { PropertyData } from "../../types";
import type { PropertyMarketMap } from "../market/marketTypes";
import {
  getCurrentPropertyPrice,
  getPropertyPriceIndex,
} from "../market/propertyMarket";
import type {
  PropertyDevelopmentStage,
  PropertyOwnershipMap,
} from "../property/propertyTypes";
import type { TaxAssessment, TaxAssessmentItem } from "./taxTypes";

export const TAX_INTERVAL_TURNS = 5;

const TAX_RATE_BY_STAGE: Record<PropertyDevelopmentStage, number> = {
  LAND: 0.05,
  DEVELOPED: 0.08,
  BUILDING: 0.12,
  LANDMARK: 0.2,
};

export function isScheduledTaxTurn(turnNumber: number): boolean {
  return turnNumber > 0 && turnNumber % TAX_INTERVAL_TURNS === 0;
}

export function getPropertyTaxRate(
  stage: PropertyDevelopmentStage,
): number {
  return TAX_RATE_BY_STAGE[stage];
}

export function getPropertyTaxAmount(
  property: PropertyData,
  stage: PropertyDevelopmentStage,
  priceIndex = 1,
  taxMultiplier = 1,
): number {
  const currentPrice = Math.max(1, property.basePrice * priceIndex);

  return Math.max(
    1,
    Math.round(currentPrice * getPropertyTaxRate(stage) * taxMultiplier),
  );
}

export function createTaxAssessments(
  players: PlayerTokenData[],
  ownerships: PropertyOwnershipMap,
  properties: PropertyData[],
  propertyMarket: PropertyMarketMap,
  settlementTurn: number,
  taxMultiplier = 1,
): TaxAssessment[] {
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );

  return players
    .filter((player) => !player.isBankrupt)
    .map((player): TaxAssessment => {
      const items: TaxAssessmentItem[] = Object.values(ownerships)
        .filter((ownership) => ownership.ownerPlayerId === player.id)
        .map((ownership) => {
          const property = propertyMap.get(ownership.propertyId);
          if (!property) return null;

          const rate = getPropertyTaxRate(ownership.stage) * taxMultiplier;
          const priceIndex = getPropertyPriceIndex(
            propertyMarket,
            property.id,
          );

          return {
            propertyId: property.id,
            propertyName: property.name,
            stage: ownership.stage,
            basePrice: property.basePrice,
            currentPrice: getCurrentPropertyPrice(property, propertyMarket),
            priceIndex,
            rate,
            amount: getPropertyTaxAmount(
              property,
              ownership.stage,
              priceIndex,
              taxMultiplier,
            ),
          };
        })
        .filter((item): item is TaxAssessmentItem => item !== null)
        .sort((first, second) =>
          first.propertyName.localeCompare(second.propertyName, "ko-KR"),
        );

      return {
        playerId: player.id,
        settlementTurn,
        items,
        totalAmount: items.reduce((total, item) => total + item.amount, 0),
      };
    })
    .filter((assessment) => assessment.totalAmount > 0);
}
