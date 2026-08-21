import type { PropertyData } from "../../types";
import type { MayorPolicy } from "../election/electionTypes";
import type { PropertyMarketMap } from "../market/marketTypes";
import { getInsuranceCoverage } from "../insurance/insuranceRules";
import type { InsuranceContractMap } from "../insurance/insuranceTypes";
import {
  MAX_PROPERTY_PRICE_INDEX,
  MIN_PROPERTY_PRICE_INDEX,
  getPropertyMarketState,
} from "../market/propertyMarket";
import type {
  PropertyDevelopmentStage,
  PropertyOwnershipMap,
} from "../property/propertyTypes";
import type {
  ActiveDisasterPenalty,
  DisasterDefinition,
  DisasterEventResult,
  DisasterPenaltyMap,
  DisasterPlayerAssessment,
  DisasterPropertyDamage,
  DisasterState,
  DisasterType,
} from "./disasterTypes";

export const DISASTER_MINIMUM_TURN = 4;
export const BASE_DISASTER_CHANCE = 0.1;
export const DISASTER_COOLDOWN_TURNS = 4;
export const MAX_DISASTER_HISTORY = 12;

export const DISASTER_DEFINITIONS: Record<DisasterType, DisasterDefinition> = {
  TYPHOON: {
    type: "TYPHOON",
    name: "태풍",
    description: "강풍과 폭우가 해안 지역의 부동산에 피해를 주었습니다.",
    minimumTargetCount: 2,
    maximumTargetCount: 4,
    minimumMarketDropRate: 0.04,
    maximumMarketDropRate: 0.08,
    tollMultiplier: 0.7,
    tollPenaltyTurns: 2,
    repairCostMultiplier: 1,
  },
  HEAVY_RAIN: {
    type: "HEAVY_RAIN",
    name: "집중호우",
    description: "한 권역에 집중호우가 발생해 교통과 상권이 위축되었습니다.",
    minimumTargetCount: 2,
    maximumTargetCount: 5,
    minimumMarketDropRate: 0.03,
    maximumMarketDropRate: 0.06,
    tollMultiplier: 0.8,
    tollPenaltyTurns: 1,
    repairCostMultiplier: 0.8,
  },
  EARTHQUAKE: {
    type: "EARTHQUAKE",
    name: "지진",
    description: "울산 전역에 지진이 발생해 건설된 부동산을 중심으로 피해가 발생했습니다.",
    minimumTargetCount: 3,
    maximumTargetCount: 6,
    minimumMarketDropRate: 0.02,
    maximumMarketDropRate: 0.07,
    tollMultiplier: 0.75,
    tollPenaltyTurns: 1,
    repairCostMultiplier: 1.3,
  },
  WILDFIRE: {
    type: "WILDFIRE",
    name: "산불",
    description: "울주군과 공원 인접 지역에 산불이 확산되어 관광과 통행이 감소했습니다.",
    minimumTargetCount: 2,
    maximumTargetCount: 4,
    minimumMarketDropRate: 0.04,
    maximumMarketDropRate: 0.09,
    tollMultiplier: 0.6,
    tollPenaltyTurns: 2,
    repairCostMultiplier: 1.1,
  },
};

const REPAIR_COST_RATE_BY_STAGE: Record<PropertyDevelopmentStage, number> = {
  LAND: 0,
  DEVELOPED: 0.05,
  BUILDING: 0.1,
  LANDMARK: 0.18,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function randomInteger(
  minimum: number,
  maximum: number,
  random: () => number,
): number {
  const safeMinimum = Math.ceil(minimum);
  const safeMaximum = Math.max(safeMinimum, Math.floor(maximum));
  return safeMinimum + Math.floor(random() * (safeMaximum - safeMinimum + 1));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function selectTargetProperties(
  type: DisasterType,
  properties: PropertyData[],
  ownerships: PropertyOwnershipMap,
  random: () => number,
): PropertyData[] {
  const definition = DISASTER_DEFINITIONS[type];
  let candidates: PropertyData[];

  switch (type) {
    case "TYPHOON":
      candidates = properties.filter((property) => property.tags.includes("COAST"));
      break;

    case "HEAVY_RAIN": {
      const districtIds = [...new Set(properties.map((property) => property.district))];
      const selectedDistrict =
        districtIds[Math.floor(random() * districtIds.length)] ?? districtIds[0];
      candidates = properties.filter(
        (property) => property.district === selectedDistrict,
      );
      break;
    }

    case "EARTHQUAKE": {
      const developedProperties = properties.filter((property) => {
        const ownership = ownerships[property.id];
        return ownership && ownership.stage !== "LAND";
      });
      const remainingProperties = properties.filter(
        (property) => !developedProperties.some((item) => item.id === property.id),
      );
      candidates = [
        ...shuffle(developedProperties, random),
        ...shuffle(remainingProperties, random),
      ];
      break;
    }

    case "WILDFIRE":
      candidates = properties.filter(
        (property) =>
          property.district === "ULJU" || property.tags.includes("PARK"),
      );
      break;
  }

  if (candidates.length === 0) candidates = [...properties];

  const targetCount = Math.min(
    candidates.length,
    randomInteger(
      definition.minimumTargetCount,
      definition.maximumTargetCount,
      random,
    ),
  );

  if (type === "EARTHQUAKE") {
    return candidates.slice(0, targetCount);
  }

  return shuffle(candidates, random).slice(0, targetCount);
}

export function createInitialDisasterState(): DisasterState {
  return {
    lastOccurredTurn: null,
    penalties: {},
    history: [],
  };
}

export function getPolicyDisasterChanceMultiplier(
  policy: MayorPolicy | null,
): number {
  return Math.max(0, policy?.effects.disasterChanceMultiplier ?? 1);
}

export function getPolicyDisasterRepairCostMultiplier(
  policy: MayorPolicy | null,
): number {
  return Math.max(0, policy?.effects.disasterRepairCostMultiplier ?? 1);
}

export function canDisasterOccur(
  turnNumber: number,
  lastOccurredTurn: number | null,
): boolean {
  if (turnNumber < DISASTER_MINIMUM_TURN) return false;
  if (lastOccurredTurn === null) return true;
  return turnNumber - lastOccurredTurn > DISASTER_COOLDOWN_TURNS;
}

export function shouldTriggerDisaster(
  turnNumber: number,
  lastOccurredTurn: number | null,
  chanceMultiplier: number,
  random: () => number = Math.random,
): boolean {
  if (!canDisasterOccur(turnNumber, lastOccurredTurn)) return false;
  return random() < BASE_DISASTER_CHANCE * Math.max(0, chanceMultiplier);
}

export function selectRandomDisasterType(
  random: () => number = Math.random,
): DisasterType {
  const types = Object.keys(DISASTER_DEFINITIONS) as DisasterType[];
  return types[Math.floor(random() * types.length)] ?? "TYPHOON";
}

export function pruneExpiredDisasterPenalties(
  penalties: DisasterPenaltyMap,
  turnNumber: number,
): DisasterPenaltyMap {
  return Object.fromEntries(
    Object.entries(penalties).filter(
      ([, penalty]) => penalty.expiresAfterTurn >= turnNumber,
    ),
  );
}

export function getActiveDisasterPenalties(
  state: DisasterState,
  turnNumber: number,
): ActiveDisasterPenalty[] {
  return Object.values(state.penalties)
    .filter((penalty) => penalty.expiresAfterTurn >= turnNumber)
    .sort((first, second) => first.expiresAfterTurn - second.expiresAfterTurn);
}

export function getDisasterTollMultiplier(
  state: DisasterState,
  propertyId: string,
  turnNumber: number,
): number {
  const penalty = state.penalties[propertyId];
  if (!penalty || penalty.expiresAfterTurn < turnNumber) return 1;
  return penalty.tollMultiplier;
}

interface CreateDisasterEventOptions {
  type: DisasterType;
  turnNumber: number;
  properties: PropertyData[];
  ownerships: PropertyOwnershipMap;
  market: PropertyMarketMap;
  insuranceContracts?: InsuranceContractMap;
  disabledPlayerIds?: string[];
  repairCostMultiplier?: number;
  random?: () => number;
}

export interface CreateDisasterEventResult {
  event: DisasterEventResult;
  market: PropertyMarketMap;
  penalties: DisasterPenaltyMap;
}

export function createDisasterEvent({
  type,
  turnNumber,
  properties,
  ownerships,
  market,
  insuranceContracts = {},
  disabledPlayerIds = [],
  repairCostMultiplier = 1,
  random = Math.random,
}: CreateDisasterEventOptions): CreateDisasterEventResult {
  const definition = DISASTER_DEFINITIONS[type];
  const disabledPlayerIdSet = new Set(disabledPlayerIds);
  const targets = selectTargetProperties(type, properties, ownerships, random);
  const nextMarket: PropertyMarketMap = { ...market };
  const penalties: DisasterPenaltyMap = {};

  const propertyDamages: DisasterPropertyDamage[] = targets.map((property) => {
    const previousState = getPropertyMarketState(market, property.id);
    const requestedDropRate =
      definition.minimumMarketDropRate +
      random() *
        (definition.maximumMarketDropRate - definition.minimumMarketDropRate);
    const nextPriceIndex = roundRate(
      clamp(
        previousState.priceIndex * (1 - requestedDropRate),
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
    const ownership = ownerships[property.id];
    const ownerEligible =
      ownership && !disabledPlayerIdSet.has(ownership.ownerPlayerId);
    const stage = ownership?.stage ?? null;
    const stageRepairRate = stage ? REPAIR_COST_RATE_BY_STAGE[stage] : 0;
    const originalRepairCost = ownerEligible
      ? Math.max(
          0,
          Math.round(
            previousPrice *
              stageRepairRate *
              definition.repairCostMultiplier,
          ),
        )
      : 0;
    const policyAdjustedRepairCost = Math.max(
      0,
      Math.round(originalRepairCost * Math.max(0, repairCostMultiplier)),
    );
    const insurance = ownerEligible
      ? getInsuranceCoverage(
          insuranceContracts,
          property.id,
          ownership.ownerPlayerId,
          turnNumber,
        )
      : { contract: null, coverageRate: 0 };
    const insuranceCoverage = Math.max(
      0,
      Math.round(policyAdjustedRepairCost * insurance.coverageRate),
    );
    const finalRepairCost = Math.max(
      0,
      policyAdjustedRepairCost - insuranceCoverage,
    );
    const tollPenaltyUntilTurn = turnNumber + definition.tollPenaltyTurns;

    nextMarket[property.id] = {
      propertyId: property.id,
      priceIndex: nextPriceIndex,
      lastChangeRate: appliedChangeRate,
      districtChangeRate: 0,
      individualChangeRate: appliedChangeRate,
      updatedTurn: turnNumber,
    };

    penalties[property.id] = {
      propertyId: property.id,
      propertyName: property.name,
      disasterType: type,
      disasterName: definition.name,
      tollMultiplier: definition.tollMultiplier,
      expiresAfterTurn: tollPenaltyUntilTurn,
    };

    return {
      propertyId: property.id,
      propertyName: property.name,
      districtId: property.district,
      ownerPlayerId: ownerEligible ? ownership.ownerPlayerId : null,
      stage,
      previousPriceIndex: previousState.priceIndex,
      nextPriceIndex,
      marketChangeRate: appliedChangeRate,
      previousPrice,
      currentPrice,
      tollMultiplier: definition.tollMultiplier,
      tollPenaltyUntilTurn,
      originalRepairCost,
      insurancePlanType: insurance.contract?.planType ?? null,
      insuranceCoverageRate: insurance.coverageRate,
      insuranceCoverage,
      finalRepairCost,
    };
  });

  const assessmentMap = new Map<string, DisasterPlayerAssessment>();

  for (const damage of propertyDamages) {
    if (!damage.ownerPlayerId || damage.finalRepairCost <= 0) continue;

    const current = assessmentMap.get(damage.ownerPlayerId) ?? {
      playerId: damage.ownerPlayerId,
      totalAmount: 0,
      damages: [],
    };
    current.damages.push(damage);
    current.totalAmount += damage.finalRepairCost;
    assessmentMap.set(damage.ownerPlayerId, current);
  }

  const playerAssessments = [...assessmentMap.values()];
  const affectedDistrictIds = [
    ...new Set(propertyDamages.map((damage) => damage.districtId)),
  ];
  const totalRepairCost = playerAssessments.reduce(
    (total, assessment) => total + assessment.totalAmount,
    0,
  );

  return {
    market: nextMarket,
    penalties,
    event: {
      id: `disaster-${turnNumber}-${type}-${Date.now()}`,
      turnNumber,
      type,
      name: definition.name,
      description: definition.description,
      affectedDistrictIds,
      propertyDamages,
      playerAssessments,
      totalRepairCost,
    },
  };
}

export function applyDisasterEventToState(
  state: DisasterState,
  event: DisasterEventResult,
  eventPenalties: DisasterPenaltyMap,
): DisasterState {
  const activePenalties = pruneExpiredDisasterPenalties(
    state.penalties,
    event.turnNumber,
  );

  return {
    lastOccurredTurn: event.turnNumber,
    penalties: {
      ...activePenalties,
      ...eventPenalties,
    },
    history: [event, ...state.history].slice(0, MAX_DISASTER_HISTORY),
  };
}
