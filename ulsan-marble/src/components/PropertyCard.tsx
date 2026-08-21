import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./PropertyCard.css";
import "./PropertyCard.landmark.css";

import type { PropertyDevelopmentStage } from "../game/property/propertyTypes";
import type { DistrictId } from "../types";

export type PropertyStageTolls = Record<
  PropertyDevelopmentStage,
  number
>;

export interface PropertyCardData {
  propertyId: string;
  boardTileId: number;
  name: string;
  districtId: DistrictId;
  districtName: string;
  isLandmark: boolean;
  ownerName: string;
  ownerShortName: string;
  ownerColor: string;
  stage: PropertyDevelopmentStage;
  currentLandPrice: number;
  nextConstructionCost: number | null;
  currentToll: number;
  tollsByStage: PropertyStageTolls;
  insurancePlanName: string | null;
}

interface PropertyCardProps {
  property: PropertyCardData;
  onClose?: () => void;
}

const STAGE_LABELS: Record<PropertyDevelopmentStage, string> = {
  LAND: "토지",
  DEVELOPED: "개발지",
  BUILDING: "건물",
  LANDMARK: "랜드마크",
};

const DISTRICT_SHORT_LABELS: Record<DistrictId, string> = {
  NAM: "남구",
  JUNG: "중구",
  BUK: "북구",
  DONG: "동구",
  ULJU: "울주군",
};

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getPropertyImageSrc(boardTileId: number): string {
  return `/assets/properties/cities/${String(boardTileId).padStart(3, "0")}.jpg`;
}

function getStageImageSrc(stage: PropertyDevelopmentStage): string {
  return `/assets/properties/stages/${stage.toLowerCase()}.png`;
}

function getMascotImageSrc(districtId: DistrictId): string {
  return `/assets/properties/mascots/${districtId.toLowerCase()}.png`;
}

interface ImageAssetProps {
  src: string;
  alt: string;
  className: string;
  fallback: ReactNode;
}

function ImageAsset({
  src,
  alt,
  className,
  fallback,
}: ImageAssetProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className={`${className}${failed ? " is-fallback" : ""}`}>
      {!failed && (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
      {failed && fallback}
    </div>
  );
}

export function PropertyCard({ property, onClose }: PropertyCardProps) {
  const cardStyle = {
    "--property-owner-color": property.ownerColor,
  } as CSSProperties;

  const isCityLandmark =
    property.isLandmark && property.districtName === "울산 전체";
  const stageLabel = STAGE_LABELS[property.stage];
  const insuranceLabel = property.insurancePlanName ?? "미가입";
  const cardClassName = [
        "property-card",
        `property-card--${property.districtId.toLowerCase()}`,
        property.isLandmark ? "property-card--special-landmark" : "",
        isCityLandmark ? "property-card--city-landmark" : "",
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <article
      className={cardClassName}
      style={cardStyle}
      data-stage={property.stage}
      data-property-kind={property.isLandmark ? "LANDMARK" : "STANDARD"}
      aria-label={`${property.name} 부동산 카드`}
    >
      <div className="property-card__foil" aria-hidden="true" />

      <div className="property-card__frame">
        {onClose && (
          <button
            type="button"
            className="property-card__close"
            onClick={onClose}
            aria-label="부동산 카드 닫기"
          >
            ×
          </button>
        )}

        <header className="property-card__nameplate">
          <span className="property-card__district-medal">
            {isCityLandmark ? "울산" : property.districtName}
          </span>

          <div className="property-card__title">
            <small>
              {isCityLandmark
                ? "ULSAN CITY LANDMARK"
                : property.isLandmark
                  ? "ULSAN LANDMARK"
                  : "ULSAN PROPERTY"}
            </small>
            <h3>{property.name}</h3>
          </div>

          <span className="property-card__number">
            No.{String(property.boardTileId).padStart(2, "0")}
          </span>
        </header>

        <section className="property-card__artwork">
          <ImageAsset
            className="property-card__city-image"
            src={getPropertyImageSrc(property.boardTileId)}
            alt={`${property.name} 대표 이미지`}
            fallback={
              <span className="property-card__city-fallback">
                <b>{property.name}</b>
                <small>지역 대표 이미지</small>
              </span>
            }
          />

          <div className="property-card__artwork-overlay" aria-hidden="true" />
          {property.isLandmark && (
            <div
              className="property-card__landmark-badge"
              aria-label="랜드마크 부동산"
            >
              <span>{isCityLandmark ? "ULSAN CITY" : "ULSAN"}</span>
              <strong>{isCityLandmark ? "CITY LANDMARK" : "LANDMARK"}</strong>
            </div>
          )}

          <div className="property-card__owner-seal">
            <span className="property-card__owner-token">
              {property.ownerShortName}
            </span>
            <div>
              <small>OWNER</small>
              <strong>{property.ownerName}</strong>
            </div>
          </div>

          <ImageAsset
            className="property-card__mascot"
            src={getMascotImageSrc(property.districtId)}
            alt={`${property.districtName} 마스코트`}
            fallback={
              <span>{DISTRICT_SHORT_LABELS[property.districtId]}</span>
            }
          />

          <div className="property-card__stage-medallion">
            <ImageAsset
              className="property-card__stage-image"
              src={getStageImageSrc(property.stage)}
              alt={`${stageLabel} 개발 단계`}
              fallback={<span>{stageLabel}</span>}
            />
          </div>
        </section>

        <section className="property-card__price-ribbon">
          <span>현재가</span>
          <strong>{formatMoney(property.currentLandPrice)}</strong>
        </section>

        <section className="property-card__stats">
          <div className="property-card__toll-stat">
            <small>CURRENT TOLL</small>
            <span>현재 통행료</span>
            <strong>{formatMoney(property.currentToll)}</strong>
          </div>

          <div className="property-card__detail-row">
            <div>
              <small>NEXT DEVELOPMENT</small>
              <span>다음 개발비</span>
              <strong>
                {property.nextConstructionCost === null
                  ? "최종 개발 완료"
                  : formatMoney(property.nextConstructionCost)}
              </strong>
            </div>

            <div
              className={`property-card__insurance-stamp${
                property.insurancePlanName ? " is-active" : ""
              }`}
            >
              <small>INSURANCE</small>
              <strong>{insuranceLabel}</strong>
            </div>
          </div>
        </section>

        <footer className="property-card__footer">
          <span>ULSAN MARBLE</span>
          <b>
            {isCityLandmark
              ? "CITY LANDMARK CARD"
              : property.isLandmark
                ? "LANDMARK CARD"
                : "PROPERTY CARD"}
          </b>
        </footer>
      </div>
    </article>
  );
}
