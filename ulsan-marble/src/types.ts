export type BoardSide = 1 | 2 | 3 | 4;

export type BoardTileType =
  | "START"
  | "PROPERTY"
  | "GOLDEN_KEY"
  | "BANK"
  | "INSURANCE"
  | "JAIL"
  | "PORT"
  | "REAL_ESTATE"
  | "AUCTION"
  | "NEWS"
  | "CITY_HALL"
  | "MINIGAME"
  | "LOTTERY_SHOP"
  | "AIRPORT"
  | "FREE_REST";

export type DistrictId = "NAM" | "JUNG" | "BUK" | "DONG" | "ULJU";

export type LandmarkScope = "DISTRICT" | "CITY";

export interface BoardTile {
  id: number;
  side: BoardSide;
  sideIndex: number;
  name: string;
  type: BoardTileType;
  propertyId?: string;
}

export interface BoardData {
  id: string;
  name: string;
  version: number;
  tileCount: number;
  layout: {
    shape: string;
    tilesPerSide: number;
    startTileId: number;
    direction: string;
  };
  tiles: BoardTile[];
}

export interface PropertyData {
  id: string;
  boardTileId: number;
  name: string;
  district: DistrictId;
  groupOrder: number;
  tags: string[];
  isLandmark: boolean;
  landmarkScope?: LandmarkScope;
  basePrice: number;
  tollMultiplier: number;
}

export interface PropertiesData {
  id: string;
  version: number;
  currencyUnit: string;
  districts: Record<
    DistrictId,
    {
      name: string;
      colorKey: string;
    }
  >;
  properties: PropertyData[];
}

export interface GridPosition {
  row: number;
  column: number;
}
