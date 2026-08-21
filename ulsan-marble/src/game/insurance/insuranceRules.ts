import type { PropertyData } from "../../types";
import type { PropertyMarketMap } from "../market/marketTypes";
import { getCurrentPropertyPrice } from "../market/propertyMarket";
import type { PropertyOwnershipMap } from "../property/propertyTypes";
import type {
  InsuranceContract,
  InsuranceContractMap,
  InsurancePlanDefinition,
  InsurancePlanType,
  InsurablePropertyAsset,
} from "./insuranceTypes";

export const INSURANCE_DURATION_TURNS = 10;

export const INSURANCE_PLANS: Record<
  InsurancePlanType,
  InsurancePlanDefinition
> = {
  BASIC: {
    type: "BASIC",
    name: "기본형",
    description: "재난 복구비의 50%를 보상합니다.",
    premiumRate: 0.03,
    coverageRate: 0.5,
  },
  COMPREHENSIVE: {
    type: "COMPREHENSIVE",
    name: "종합형",
    description: "재난 복구비의 80%를 보상합니다.",
    premiumRate: 0.06,
    coverageRate: 0.8,
  },
};

export function createInitialInsuranceContracts(): InsuranceContractMap {
  return {};
}

export function isInsuranceContractActive(
  contract: InsuranceContract | null | undefined,
  turnNumber: number,
): contract is InsuranceContract {
  return Boolean(contract && contract.expiresAfterTurn >= turnNumber);
}

export function getInsuranceRemainingTurns(
  contract: InsuranceContract | null | undefined,
  turnNumber: number,
): number {
  if (!isInsuranceContractActive(contract, turnNumber)) return 0;
  return contract.expiresAfterTurn - turnNumber + 1;
}

export function getInsurancePremium(
  property: PropertyData,
  market: PropertyMarketMap,
  planType: InsurancePlanType,
): number {
  const plan = INSURANCE_PLANS[planType];
  return Math.max(
    1,
    Math.round(getCurrentPropertyPrice(property, market) * plan.premiumRate),
  );
}

export function createOrRenewInsuranceContract(
  contracts: InsuranceContractMap,
  propertyId: string,
  playerId: string,
  planType: InsurancePlanType,
  premiumPaid: number,
  turnNumber: number,
): InsuranceContractMap {
  const plan = INSURANCE_PLANS[planType];
  const current = contracts[propertyId];
  const currentActive = isInsuranceContractActive(current, turnNumber);
  const expiresAfterTurn = currentActive
    ? current.expiresAfterTurn + INSURANCE_DURATION_TURNS
    : turnNumber + INSURANCE_DURATION_TURNS - 1;

  return {
    ...contracts,
    [propertyId]: {
      propertyId,
      playerId,
      planType,
      premiumPaid,
      coverageRate: plan.coverageRate,
      startedTurn: turnNumber,
      expiresAfterTurn,
    },
  };
}

export function removeInsuranceContract(
  contracts: InsuranceContractMap,
  propertyId: string,
): InsuranceContractMap {
  if (!contracts[propertyId]) return contracts;
  const next = { ...contracts };
  delete next[propertyId];
  return next;
}

export function removePlayerInsuranceContracts(
  contracts: InsuranceContractMap,
  playerId: string,
): InsuranceContractMap {
  return Object.fromEntries(
    Object.entries(contracts).filter(
      ([, contract]) => contract.playerId !== playerId,
    ),
  );
}

export function getInsuranceCoverage(
  contracts: InsuranceContractMap,
  propertyId: string,
  playerId: string,
  turnNumber: number,
): {
  contract: InsuranceContract | null;
  coverageRate: number;
} {
  const contract = contracts[propertyId];
  if (
    !isInsuranceContractActive(contract, turnNumber) ||
    contract.playerId !== playerId
  ) {
    return { contract: null, coverageRate: 0 };
  }

  return {
    contract,
    coverageRate: Math.min(Math.max(contract.coverageRate, 0), 1),
  };
}

export function getInsurablePropertyAssets(
  properties: PropertyData[],
  ownerships: PropertyOwnershipMap,
  market: PropertyMarketMap,
  contracts: InsuranceContractMap,
  playerId: string,
  turnNumber: number,
): InsurablePropertyAsset[] {
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );

  return Object.values(ownerships)
    .filter(
      (ownership) =>
        ownership.ownerPlayerId === playerId && ownership.stage !== "LAND",
    )
    .flatMap((ownership) => {
      const property = propertyMap.get(ownership.propertyId);
      if (!property) return [];

      const contract = contracts[property.id] ?? null;
      return [
        {
          property,
          ownership,
          currentPrice: getCurrentPropertyPrice(property, market),
          contract,
          isContractActive: isInsuranceContractActive(contract, turnNumber),
          remainingTurns: getInsuranceRemainingTurns(contract, turnNumber),
          basicPremium: getInsurancePremium(property, market, "BASIC"),
          comprehensivePremium: getInsurancePremium(
            property,
            market,
            "COMPREHENSIVE",
          ),
        },
      ];
    })
    .sort(
      (first, second) =>
        first.property.boardTileId - second.property.boardTileId,
    );
}
