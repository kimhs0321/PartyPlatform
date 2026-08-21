import type { DistrictId, PropertyData } from "../../types";
import type {
  DistrictMarketChange,
  PropertyMarketChange,
  PropertyMarketCycle,
  PropertyMarketMap,
  PropertyMarketState,
} from "./marketTypes";

export const MIN_PROPERTY_PRICE_INDEX = 0.6;
export const MAX_PROPERTY_PRICE_INDEX = 1.6;
export const MAX_DISTRICT_CHANGE_RATE = 0.06;
export const MAX_INDIVIDUAL_CHANGE_RATE = 0.04;
export const MAX_TOTAL_CHANGE_RATE = 0.1;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function createRandomRate(maximumAbsoluteRate: number, random: () => number): number {
  return roundRate((random() * 2 - 1) * maximumAbsoluteRate);
}

export function createInitialPropertyMarket(
  properties: PropertyData[],
): PropertyMarketMap {
  return Object.fromEntries(
    properties.map((property) => [
      property.id,
      {
        propertyId: property.id,
        priceIndex: 1,
        lastChangeRate: 0,
        districtChangeRate: 0,
        individualChangeRate: 0,
        updatedTurn: 0,
      } satisfies PropertyMarketState,
    ]),
  );
}

export function getPropertyMarketState(
  market: PropertyMarketMap,
  propertyId: string,
): PropertyMarketState {
  return (
    market[propertyId] ?? {
      propertyId,
      priceIndex: 1,
      lastChangeRate: 0,
      districtChangeRate: 0,
      individualChangeRate: 0,
      updatedTurn: 0,
    }
  );
}

export function getPropertyPriceIndex(
  market: PropertyMarketMap,
  propertyId: string,
): number {
  return getPropertyMarketState(market, propertyId).priceIndex;
}

export function getCurrentPropertyPrice(
  property: PropertyData,
  market: PropertyMarketMap,
): number {
  return Math.max(
    1,
    Math.round(property.basePrice * getPropertyPriceIndex(market, property.id)),
  );
}

export interface PropertyMarketCycleResult {
  market: PropertyMarketMap;
  cycle: PropertyMarketCycle;
}

export interface PropertyMarketCycleOptions {
  volatilityMultiplier?: number;
  changeBias?: number;
  districtChangeBiases?: Partial<Record<DistrictId, number>>;
  minimumChangeRate?: number;
}

export function createPropertyMarketCycle(
  properties: PropertyData[],
  currentMarket: PropertyMarketMap,
  turnNumber: number,
  optionsOrRandom: PropertyMarketCycleOptions | (() => number) = {},
  random: () => number = Math.random,
): PropertyMarketCycleResult {
  const options =
    typeof optionsOrRandom === "function" ? {} : optionsOrRandom;
  const resolvedRandom =
    typeof optionsOrRandom === "function" ? optionsOrRandom : random;
  const volatilityMultiplier = Math.max(
    0,
    options.volatilityMultiplier ?? 1,
  );
  const changeBias = options.changeBias ?? 0;
  const districtChangeBiases = options.districtChangeBiases ?? {};
  const minimumChangeRate = clamp(
    options.minimumChangeRate ?? -MAX_TOTAL_CHANGE_RATE,
    -MAX_TOTAL_CHANGE_RATE,
    MAX_TOTAL_CHANGE_RATE,
  );
  const districtIds = [...new Set(properties.map((property) => property.district))];
  const districtRateMap = new Map<DistrictId, number>(
    districtIds.map((districtId) => [
      districtId,
      roundRate(
        createRandomRate(
          MAX_DISTRICT_CHANGE_RATE * volatilityMultiplier,
          resolvedRandom,
        ) + (districtChangeBiases[districtId] ?? 0),
      ),
    ]),
  );

  const nextMarket: PropertyMarketMap = { ...currentMarket };
  const propertyChanges: PropertyMarketChange[] = properties.map((property) => {
    const previousState = getPropertyMarketState(currentMarket, property.id);
    const districtChangeRate = districtRateMap.get(property.district) ?? 0;
    const individualChangeRate = createRandomRate(
      MAX_INDIVIDUAL_CHANGE_RATE * volatilityMultiplier,
      resolvedRandom,
    );
    const requestedChangeRate = clamp(
      districtChangeRate + individualChangeRate + changeBias,
      minimumChangeRate,
      MAX_TOTAL_CHANGE_RATE,
    );
    const nextPriceIndex = roundRate(
      clamp(
        previousState.priceIndex * (1 + requestedChangeRate),
        MIN_PROPERTY_PRICE_INDEX,
        MAX_PROPERTY_PRICE_INDEX,
      ),
    );
    const appliedChangeRate = roundRate(
      previousState.priceIndex === 0
        ? 0
        : nextPriceIndex / previousState.priceIndex - 1,
    );
    const previousPrice = Math.max(
      1,
      Math.round(property.basePrice * previousState.priceIndex),
    );
    const currentPrice = Math.max(
      1,
      Math.round(property.basePrice * nextPriceIndex),
    );

    nextMarket[property.id] = {
      propertyId: property.id,
      priceIndex: nextPriceIndex,
      lastChangeRate: appliedChangeRate,
      districtChangeRate,
      individualChangeRate,
      updatedTurn: turnNumber,
    };

    return {
      propertyId: property.id,
      propertyName: property.name,
      districtId: property.district,
      previousPriceIndex: previousState.priceIndex,
      nextPriceIndex,
      districtChangeRate,
      individualChangeRate,
      appliedChangeRate,
      previousPrice,
      currentPrice,
    };
  });

  const districtChanges: DistrictMarketChange[] = districtIds.map(
    (districtId) => ({
      districtId,
      changeRate: districtRateMap.get(districtId) ?? 0,
    }),
  );

  return {
    market: nextMarket,
    cycle: {
      turnNumber,
      districtChanges,
      propertyChanges,
    },
  };
}
