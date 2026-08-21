import type { PropertyData } from "../../types";
import type {
  PropertyDevelopmentStage,
  PropertyOwnership,
} from "./propertyTypes";

const NEXT_STAGE: Partial<
  Record<PropertyDevelopmentStage, PropertyDevelopmentStage>
> = {
  LAND: "DEVELOPED",
  DEVELOPED: "BUILDING",
  BUILDING: "LANDMARK",
};

const CONSTRUCTION_RATE_BY_TARGET_STAGE: Partial<
  Record<PropertyDevelopmentStage, number>
> = {
  DEVELOPED: 0.6,
  BUILDING: 1,
  LANDMARK: 2.5,
};

const STAGE_LABELS: Record<PropertyDevelopmentStage, string> = {
  LAND: "토지",
  DEVELOPED: "개발",
  BUILDING: "건물",
  LANDMARK: "랜드마크",
};

export function getDevelopmentStageLabel(
  stage: PropertyDevelopmentStage,
): string {
  return STAGE_LABELS[stage];
}

export function getNextDevelopmentStage(
  currentStage: PropertyDevelopmentStage,
): PropertyDevelopmentStage | null {
  return NEXT_STAGE[currentStage] ?? null;
}

export function isMaxDevelopmentStage(
  stage: PropertyDevelopmentStage,
): boolean {
  return getNextDevelopmentStage(stage) === null;
}

export function getConstructionCost(
  property: PropertyData,
  targetStage: PropertyDevelopmentStage,
): number {
  const rate = CONSTRUCTION_RATE_BY_TARGET_STAGE[targetStage];

  if (rate === undefined) return 0;

  return Math.max(1, Math.round(property.basePrice * rate));
}

export function getNextConstructionCost(
  property: PropertyData,
  currentStage: PropertyDevelopmentStage,
): number | null {
  const nextStage = getNextDevelopmentStage(currentStage);

  return nextStage ? getConstructionCost(property, nextStage) : null;
}

export function upgradePropertyOwnership(
  ownership: PropertyOwnership,
  property: PropertyData,
  turnNumber: number,
  constructionCostOverride?: number,
): PropertyOwnership | null {
  const nextStage = getNextDevelopmentStage(ownership.stage);

  if (!nextStage) return null;

  const constructionCost =
    constructionCostOverride ?? getConstructionCost(property, nextStage);

  return {
    ...ownership,
    stage: nextStage,
    constructionInvestment:
      ownership.constructionInvestment + constructionCost,
    lastDevelopedTurn: turnNumber,
  };
}
