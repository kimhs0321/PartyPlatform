import type { CSSProperties } from "react";
import "./BoardTile.css";

import { getTileGridPosition } from "../board/layout";
import type { BoardTile, PropertiesData, PropertyData } from "../types";
import type { PropertyDevelopmentStage } from "../game/property/propertyTypes";

interface BoardTileOwner {
  name: string;
  shortName: string;
  color: string;
}

interface BoardTileProps {
  tile: BoardTile;
  property?: PropertyData;
  districts: PropertiesData["districts"];
  owner?: BoardTileOwner;
  developmentStage?: PropertyDevelopmentStage;
  developmentRestrictionLabel?: string;
}

function getTileStyle(
  tile: BoardTile,
  property?: PropertyData,
  owner?: BoardTileOwner,
): CSSProperties {
  const position = getTileGridPosition(tile);

  return {
    gridRow: position.row,
    gridColumn: position.column,
    ["--tile-order" as string]: tile.id,
    ["--district-color" as string]: property
      ? property.isLandmark && property.landmarkScope === "CITY"
        ? "var(--district-city)"
        : `var(--district-${property.district.toLowerCase()})`
      : "transparent",
    ["--owner-color" as string]: owner?.color ?? "transparent",
  };
}

export function BoardTile({
  tile,
  property,
  districts,
  owner,
  developmentStage,
  developmentRestrictionLabel,
}: BoardTileProps) {
  const isProperty = tile.type === "PROPERTY" && property;
  const isCityLandmark =
    Boolean(property?.isLandmark) && property?.landmarkScope === "CITY";
  const districtName = isProperty
    ? isCityLandmark
      ? "울산 전체"
      : districts[property.district]?.name ?? property.district
    : undefined;

  const propertyLabel = isProperty
    ? `${tile.name}, ${districtName}, 기본 가격 ${property.basePrice.toLocaleString("ko-KR")}만 원`
    : tile.name;

  const ownershipLabel = owner
    ? `${propertyLabel}, ${owner.name} 소유`
    : propertyLabel;
  const ariaLabel = developmentRestrictionLabel
    ? `${ownershipLabel}, ${developmentRestrictionLabel}`
    : ownershipLabel;

  const stageModifier = developmentStage
  ? developmentStage.toLowerCase()
  : null;  

  return (
    <article
      className={`board-tile board-tile--side-${tile.side} board-tile--${tile.type.toLowerCase()}${property?.isLandmark ? " board-tile--landmark" : ""}${isCityLandmark ? " board-tile--city-landmark" : ""}${owner ? " board-tile--owned" : ""}${developmentRestrictionLabel ? " board-tile--development-restricted" : ""}${stageModifier ? ` board-tile--stage-${stageModifier}` : ""}`}
      style={getTileStyle(tile, property, owner)}
      data-tile-id={tile.id}
      data-tile-type={tile.type}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {isProperty && <span className="board-tile__district-band" />}

      {developmentStage && (
        <span
          className="board-tile__stage-marker"
          aria-label={`개발 단계 ${developmentStage}`}
          title={`개발 단계 ${developmentStage}`}
        >
          <i />
        </span>
      )}

      <strong className="board-tile__name">{tile.name}</strong>
      {developmentRestrictionLabel && (
        <span
          className="board-tile__development-restriction"
          title={developmentRestrictionLabel}
          aria-hidden="true"
        >
          제한
        </span>
      )}
      {owner && (
        <span
          className="board-tile__owner-marker"
          title={`${owner.name} 소유`}
          aria-hidden="true"
        >
          {owner.shortName}
        </span>
      )}
    </article>
  );
}