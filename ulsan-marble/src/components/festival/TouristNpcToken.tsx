import type { CSSProperties } from "react";
import "./TouristNpcToken.css";

import { getTileGridPosition } from "../../board/layout";
import { getFestivalDefinition } from "../../game/festival/festivalData";
import type {
  ActiveFestival,
  TouristNpcState,
} from "../../game/festival/festivalTypes";
import type { BoardTile } from "../../types";

interface TouristNpcTokenProps {
  npc: TouristNpcState;
  tile: BoardTile;
  festival: ActiveFestival | null;
}

export function TouristNpcToken({
  npc,
  tile,
  festival,
}: TouristNpcTokenProps) {
  const position = getTileGridPosition(tile);
  const definition = festival
    ? getFestivalDefinition(festival.festivalId)
    : null;

  const style: CSSProperties = {
    gridRow: position.row,
    gridColumn: position.column,
    ["--tourist-accent" as string]:
      definition?.theme === "FIRE"
        ? "#ff711b"
        : definition?.theme === "WHALE" ||
            definition?.theme === "OCEAN"
          ? "#1a9ed3"
          : definition?.theme === "ONGGI"
            ? "#a8663d"
            : definition?.theme === "TRADITION"
              ? "#e34b4b"
              : "#18a7b5",
  };

  return (
    <div
      className={`tourist-npc-token${npc.moving ? " tourist-npc-token--moving" : ""}`}
      style={style}
      title={`관광객 NPC · ${tile.name}`}
      aria-label={`관광객, 현재 위치 ${tile.name}`}
    >
      <span aria-hidden="true">관</span>
      <small>관광객</small>
    </div>
  );
}
