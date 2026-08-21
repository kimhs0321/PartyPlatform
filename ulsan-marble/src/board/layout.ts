import type { BoardTile, GridPosition } from "../types";

export const BOARD_GRID_COLUMNS = 22;
export const BOARD_GRID_ROWS = 10;
export type PhysicalBoardSide = 1 | 2 | 3 | 4;

export function getTileGridPosition(tile: BoardTile): GridPosition {
  const index = tile.id;

  if (index === 0) return { row: BOARD_GRID_ROWS, column: 1 };
  if (index <= 9) return { row: BOARD_GRID_ROWS - index, column: 1 };
  if (index <= 30) return { row: 1, column: index - 8 };
  if (index <= 39) return { row: index - 29, column: BOARD_GRID_COLUMNS };
  return { row: BOARD_GRID_ROWS, column: 61 - index };
}

export function getTileBoardSide(tile: BoardTile): PhysicalBoardSide {
  const { row, column } = getTileGridPosition(tile);

  if (column === 1) return 1;
  if (row === 1) return 2;
  if (column === BOARD_GRID_COLUMNS) return 3;
  return 4;
}

export function validateBoardLayout(tiles: BoardTile[]): void {
  if (tiles.length !== 60) {
    throw new Error(`보드 칸은 60개여야 합니다. 현재: ${tiles.length}개`);
  }

  const ids = new Set<number>();
  const positions = new Set<string>();

  for (const tile of tiles) {
    if (ids.has(tile.id)) {
      throw new Error(`중복된 타일 ID가 있습니다: ${tile.id}`);
    }

    ids.add(tile.id);

    const { row, column } = getTileGridPosition(tile);
    const positionKey = `${row}:${column}`;

    if (positions.has(positionKey)) {
      throw new Error(`중복된 타일 위치가 있습니다: ${positionKey}`);
    }

    positions.add(positionKey);
  }
}
