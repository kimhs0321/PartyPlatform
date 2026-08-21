export type DevelopmentRestrictionSource =
  | "ECONOMIC_NEWS"
  | "DISASTER"
  | "MAYOR_POLICY";

export interface DevelopmentRestriction {
  propertyId: string;
  source: DevelopmentRestrictionSource;
  imposedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
}

export type DevelopmentRestrictionMap =
  Record<string, DevelopmentRestriction>;
