import type {
  PropertyDevelopmentStage,
} from "./propertyTypes";

export type PropertyDistrict =
  | "NAM"
  | "JUNG"
  | "BUK"
  | "DONG"
  | "ULJU";

export function getPropertyCityImageSrc(
  boardTileId: number,
): string {
  const fileNumber = String(boardTileId).padStart(3, "0");

  return `/assets/properties/cities/${fileNumber}.webp`;
}

export const PROPERTY_STAGE_IMAGE_MAP: Record<
  PropertyDevelopmentStage,
  string
> = {
  LAND: "/assets/properties/stages/land.png",
  DEVELOPED:
    "/assets/properties/stages/developed.png",
  BUILDING:
    "/assets/properties/stages/building.png",
  LANDMARK:
    "/assets/properties/stages/landmark.png",
};

export const DISTRICT_MASCOT_IMAGE_MAP: Record<
  PropertyDistrict,
  string
> = {
  NAM: "/assets/properties/mascots/nam.png",
  JUNG: "/assets/properties/mascots/jung.png",
  BUK: "/assets/properties/mascots/buk.png",
  DONG: "/assets/properties/mascots/dong.png",
  ULJU: "/assets/properties/mascots/ulju.png",
};