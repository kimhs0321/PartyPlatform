import type { CSSProperties } from "react";
import "./PlayerToken.css";

import { getTileGridPosition } from "../board/layout";
import type { BoardTile } from "../types";

export interface PlayerTokenData {
  id: string;
  name: string;
  shortName: string;
  color: string;
  position: number;
  money: number;
  dock: "left" | "right";

  completedLaps?: number;

  isBankrupt?: boolean;
  isJailed?: boolean;
  jailFailedAttempts?: number;
  jailEscapeCards?: number;
}

interface PlayerTokenProps {
  player: PlayerTokenData;
  tile: BoardTile;
  slotIndex: number;
  slotCount: number;
  active: boolean;
  moving: boolean;
}

const SLOT_OFFSETS: Array<Array<[number, number]>> = [
  [[0, 0]],
  [[-11, 0], [11, 0]],
  [[0, -10], [-11, 8], [11, 8]],
  [[-10, -10], [10, -10], [-10, 10], [10, 10]],
  [[0, -12], [-12, -4], [12, -4], [-8, 11], [8, 11]],
  [[-11, -11], [0, -11], [11, -11], [-11, 11], [0, 11], [11, 11]],
  [[-12, -12], [0, -12], [12, -12], [-12, 0], [12, 0], [-8, 12], [8, 12]],
  [[-12, -12], [0, -12], [12, -12], [-12, 0], [12, 0], [-12, 12], [0, 12], [12, 12]],
];

function getSlotOffset(slotIndex: number, slotCount: number): [number, number] {
  const normalizedCount = Math.min(Math.max(slotCount, 1), SLOT_OFFSETS.length);
  const offsets = SLOT_OFFSETS[normalizedCount - 1];
  return offsets[slotIndex] ?? [0, 0];
}

export function PlayerToken({
  player,
  tile,
  slotIndex,
  slotCount,
  active,
  moving,
}: PlayerTokenProps) {
  const position = getTileGridPosition(tile);
  const [offsetX, offsetY] = getSlotOffset(slotIndex, slotCount);

  const tokenLabel = Array.from(
    player.shortName.trim() || player.name.trim(),
  )
    .slice(0, 2)
    .join("");

  const tokenLabelLength = Array.from(tokenLabel).length;
  const style: CSSProperties = {
    gridRow: position.row,
    gridColumn: position.column,
    ["--player-color" as string]: player.color,
    ["--token-offset-x" as string]: `${offsetX}px`,
    ["--token-offset-y" as string]: `${offsetY}px`,
  };

  return (
    <div
      className={`player-token${active ? " player-token--active" : ""}${moving ? " player-token--moving" : ""}${player.isBankrupt ? " player-token--bankrupt" : ""}${player.isJailed ? " player-token--jailed" : ""}`}
      style={style}
      title={`${player.name} · ${tile.name}${player.isJailed ? " · 수감 중" : ""}`}
      aria-label={`${player.name}, 현재 위치 ${tile.name}`}
    >
      <span
        className={`player-token__label ${
          tokenLabelLength === 1
            ? "player-token__label--single"
            : "player-token__label--double"
        }`}
      >
        {tokenLabel}
      </span>
    </div>
  );
}
