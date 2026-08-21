import type {
  DevelopmentRestriction,
  DevelopmentRestrictionMap,
  DevelopmentRestrictionSource,
} from "./developmentRestrictionTypes";

export function createDevelopmentRestriction(
  propertyId: string,
  imposedTurn: number,
  durationTurns: number,
  source: DevelopmentRestrictionSource,
): DevelopmentRestriction {
  const safeDuration = Math.max(1, Math.trunc(durationTurns));
  const activeFromTurn = imposedTurn + 1;

  return {
    propertyId,
    source,
    imposedTurn,
    activeFromTurn,
    expiresAfterTurn: activeFromTurn + safeDuration - 1,
  };
}

export function applyDevelopmentRestriction(
  restrictions: DevelopmentRestrictionMap,
  restriction: DevelopmentRestriction,
): DevelopmentRestrictionMap {
  const current = restrictions[restriction.propertyId];

  if (
    current &&
    current.expiresAfterTurn >= restriction.expiresAfterTurn
  ) {
    return restrictions;
  }

  return {
    ...restrictions,
    [restriction.propertyId]: restriction,
  };
}

export function removeDevelopmentRestriction(
  restrictions: DevelopmentRestrictionMap,
  propertyId: string,
): DevelopmentRestrictionMap {
  if (!restrictions[propertyId]) return restrictions;

  const nextRestrictions = { ...restrictions };
  delete nextRestrictions[propertyId];
  return nextRestrictions;
}

export function getVisibleDevelopmentRestrictions(
  restrictions: DevelopmentRestrictionMap,
  turnNumber: number,
): DevelopmentRestrictionMap {
  return Object.fromEntries(
    Object.entries(restrictions).filter(
      ([, restriction]) =>
        turnNumber <= restriction.expiresAfterTurn,
    ),
  );
}

export function getActiveDevelopmentRestrictions(
  restrictions: DevelopmentRestrictionMap,
  turnNumber: number,
): DevelopmentRestrictionMap {
  return Object.fromEntries(
    Object.entries(restrictions).filter(
      ([, restriction]) =>
        turnNumber >= restriction.activeFromTurn &&
        turnNumber <= restriction.expiresAfterTurn,
    ),
  );
}

export function isDevelopmentRestricted(
  restrictions: DevelopmentRestrictionMap,
  propertyId: string,
  turnNumber: number,
): boolean {
  const restriction = restrictions[propertyId];

  return Boolean(
    restriction &&
      turnNumber >= restriction.activeFromTurn &&
      turnNumber <= restriction.expiresAfterTurn,
  );
}

export function getDevelopmentRestrictionRemainingTurns(
  restriction: DevelopmentRestriction,
  turnNumber: number,
): number {
  if (turnNumber < restriction.activeFromTurn) {
    return (
      restriction.expiresAfterTurn -
      restriction.activeFromTurn +
      1
    );
  }

  return Math.max(
    0,
    restriction.expiresAfterTurn - turnNumber + 1,
  );
}

export function pruneExpiredDevelopmentRestrictions(
  restrictions: DevelopmentRestrictionMap,
  turnNumber: number,
): DevelopmentRestrictionMap {
  const entries = Object.entries(restrictions).filter(
    ([, restriction]) =>
      turnNumber <= restriction.expiresAfterTurn,
  );

  if (entries.length === Object.keys(restrictions).length) {
    return restrictions;
  }

  return Object.fromEntries(entries);
}
