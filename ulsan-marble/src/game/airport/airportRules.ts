import type { BoardTile } from "../../types";

export const AIRPORT_TICKET_PRICE = 100;

export function isAirportDestinationEligible(
  tile: BoardTile,
  airportPosition: number,
): boolean {
  if (tile.id === airportPosition) return false;

  return !["AIRPORT", "JAIL", "START"].includes(tile.type);
}

export function getAirportDestinationTiles(
  tiles: BoardTile[],
  airportPosition: number,
): BoardTile[] {
  return tiles.filter((tile) =>
    isAirportDestinationEligible(tile, airportPosition),
  );
}
