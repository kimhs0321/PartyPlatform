import type { DistrictId } from "../../types";
import type { DiceValue } from "../dice";

export type FestivalId =
  | "ULSAN_INDUSTRY"
  | "NAM_WHALE"
  | "JUNG_MADUHEE"
  | "BUK_SOEBURI"
  | "DONG_SHIPBUILDING"
  | "ULJU_ONGGI";

export type FestivalTheme =
  | "CITY"
  | "WHALE"
  | "TRADITION"
  | "FIRE"
  | "OCEAN"
  | "ONGGI";

export type FestivalMascotRole =
  | "MAIN"
  | "SUB"
  | "SMALL"
  | "SCENE";

export interface FestivalMascotAsset {
  src: string;
  alt: string;
  role: FestivalMascotRole;
}

export interface FestivalAssets {
  symbolSrc?: string;
  logoSrc?: string;
  secondaryLogoSrc?: string;
  mascots: FestivalMascotAsset[];
  departureMascotSrc?: string;
  completionMascotSrc?: string;
}

export interface FestivalDefinition {
  id: FestivalId;
  name: string;
  shortName: string;
  theme: FestivalTheme;
  districtId: DistrictId | null;
  tollMultiplier: number;
  kicker: string;
  description: string;
  effectLabel: string;
  assets: FestivalAssets;
}

export interface FestivalDeckState {
  drawPile: FestivalId[];
  cycle: number;
}

export interface ActiveFestival {
  festivalId: FestivalId;
  startedTurn: number;
}

export interface TouristNpcState {
  position: number;
  travelledSteps: number;
  moving: boolean;
  lastDice: [DiceValue, DiceValue] | null;
}

export interface PendingFestivalAnnouncement {
  festivalId: FestivalId;
  turnNumber: number;
  continuationDisabledPlayerIds: string[];
}

export type TouristLandingKind =
  | "OWNED_PROPERTY"
  | "UNOWNED_PROPERTY"
  | "SPECIAL_TILE"
  | "FESTIVAL_END";

export interface PendingTouristTurnResult {
  festivalId: FestivalId;
  diceValues: [DiceValue, DiceValue];
  fromPosition: number;
  toPosition: number;
  landedTileName: string;
  landingKind: TouristLandingKind;
  propertyName: string | null;
  ownerPlayerId: string | null;
  ownerName: string | null;
  bankPayout: number;
  finalToll: number;
  completedLap: boolean;
  continuationDisabledPlayerIds: string[];
}
