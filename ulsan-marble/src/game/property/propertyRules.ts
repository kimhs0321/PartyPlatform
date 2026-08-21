import type { BoardTile, PropertyData } from "../../types";
import type {
  LandmarkPurchaseRequirement,
  PropertyOwnership,
  PropertyOwnershipMap,
} from "./propertyTypes";

export function isPropertyTile(
  tile: BoardTile,
  property: PropertyData | undefined,
): property is PropertyData {
  return tile.type === "PROPERTY" && property !== undefined;
}

export function getLandmarkPurchaseRequirement(
  properties: readonly PropertyData[],
  ownerships: PropertyOwnershipMap,
  playerId: string,
  property: PropertyData,
): LandmarkPurchaseRequirement {
  if (!property.isLandmark) {
    return {
      kind: "NONE",
      eligible: true,
    };
  }

  const ownedPropertyIds = new Set(
    Object.values(ownerships)
      .filter((ownership) => ownership.ownerPlayerId === playerId)
      .map((ownership) => ownership.propertyId),
  );

  if (property.landmarkScope === "CITY") {
    const ownedDistrictLandmarkCount = properties.filter(
      (candidate) =>
        candidate.isLandmark &&
        candidate.landmarkScope !== "CITY" &&
        ownedPropertyIds.has(candidate.id),
    ).length;

    const enteredDistrictCount = new Set(
      properties
        .filter(
          (candidate) =>
            !candidate.isLandmark &&
            ownedPropertyIds.has(candidate.id),
        )
        .map((candidate) => candidate.district),
    ).size;

    const requiredDistrictLandmarkCount = 1;
    const requiredDistrictCount = 3;

    return {
      kind: "CITY",
      eligible:
        ownedDistrictLandmarkCount >= requiredDistrictLandmarkCount &&
        enteredDistrictCount >= requiredDistrictCount,
      ownedDistrictLandmarkCount,
      requiredDistrictLandmarkCount,
      enteredDistrictCount,
      requiredDistrictCount,
    };
  }

  const districtProperties = properties.filter(
    (candidate) =>
      candidate.district === property.district &&
      !candidate.isLandmark,
  );
  const ownedCount = districtProperties.filter((candidate) =>
    ownedPropertyIds.has(candidate.id),
  ).length;
  const requiredCount = Math.ceil(districtProperties.length * 0.5);

  return {
    kind: "DISTRICT",
    eligible: ownedCount >= requiredCount,
    districtId: property.district,
    ownedCount,
    totalCount: districtProperties.length,
    requiredCount,
  };
}

export function canPurchaseLandmarkProperty(
  properties: readonly PropertyData[],
  ownerships: PropertyOwnershipMap,
  playerId: string,
  property: PropertyData,
): boolean {
  return getLandmarkPurchaseRequirement(
    properties,
    ownerships,
    playerId,
    property,
  ).eligible;
}

export function getPropertyPurchasePrice(
  property: PropertyData,
  priceIndex = 1,
): number {
  return Math.max(1, Math.round(property.basePrice * priceIndex));
}

export function getPropertyOwnership(
  ownerships: PropertyOwnershipMap,
  propertyId: string,
): PropertyOwnership | null {
  return ownerships[propertyId] ?? null;
}

export function createPropertyOwnership(
  property: PropertyData,
  ownerPlayerId: string,
  turnNumber: number,
  purchasePrice = getPropertyPurchasePrice(property),
): PropertyOwnership {
  return {
    propertyId: property.id,
    ownerPlayerId,
    purchasePrice,
    purchasedTurn: turnNumber,
    stage: "LAND",
    constructionInvestment: 0,
  };
}
