import type { MayorPolicy, MayorTerm } from "./electionTypes";

export const DEFAULT_PROPERTY_SALE_RATE = 0.9;

export function getActiveMayorPolicy(
  mayorTerm: MayorTerm | null,
  turnNumber: number,
): MayorPolicy | null {
  if (!mayorTerm) return null;
  if (turnNumber < mayorTerm.activeFromTurn) return null;
  if (turnNumber > mayorTerm.expiresAfterTurn) return null;
  return mayorTerm.policy;
}

export const SALARY_INCREASE_RATE_PER_COMPLETED_LAP =
  0.1;

export function getPolicySalary(
  baseSalary: number,
  policy: MayorPolicy | null,
  completedLaps = 0,
): number {
  const safeCompletedLaps = Math.max(
    0,
    Math.trunc(completedLaps),
  );

  const lapAdjustedSalary =
    baseSalary *
    Math.pow(
      1 + SALARY_INCREASE_RATE_PER_COMPLETED_LAP,
      safeCompletedLaps,
    );

  return Math.max(
    0,
    Math.round(
      lapAdjustedSalary +
        (policy?.effects.salaryBonus ?? 0),
    ),
  );
}

export function getPolicyConstructionCost(
  baseCost: number,
  policy: MayorPolicy | null,
): number {
  return Math.max(
    1,
    Math.round(baseCost * (policy?.effects.constructionCostMultiplier ?? 1)),
  );
}

export function getPolicyTaxMultiplier(policy: MayorPolicy | null): number {
  return policy?.effects.propertyTaxMultiplier ?? 1;
}

export function getPolicyTollMultiplier(policy: MayorPolicy | null): number {
  return policy?.effects.tollMultiplier ?? 1;
}

export function getPolicyPropertySaleRate(policy: MayorPolicy | null): number {
  return policy?.effects.propertySaleRate ?? DEFAULT_PROPERTY_SALE_RATE;
}

export function getPolicyPropertyMarketOptions(policy: MayorPolicy | null): {
  volatilityMultiplier: number;
  changeBias: number;
} {
  return {
    volatilityMultiplier:
      policy?.effects.propertyMarketVolatilityMultiplier ?? 1,
    changeBias: policy?.effects.propertyMarketChangeBias ?? 0,
  };
}

export function getPolicyStockMarketVolatilityMultiplier(
  policy: MayorPolicy | null,
): number {
  return policy?.effects.stockMarketVolatilityMultiplier ?? 1;
}

export function getPolicyScratchWinProbabilityBonus(
  policy: MayorPolicy | null,
): number {
  return policy?.effects.scratchWinProbabilityBonus ?? 0;
}

export function getPolicyLottoJackpotContribution(
  baseContribution: number,
  policy: MayorPolicy | null,
): number {
  return Math.max(
    0,
    Math.round(
      baseContribution + (policy?.effects.lottoJackpotContributionBonus ?? 0),
    ),
  );
}
