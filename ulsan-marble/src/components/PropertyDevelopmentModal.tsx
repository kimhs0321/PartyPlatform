import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import "./PropertyDevelopmentModal.css";

import {
  getDevelopmentStageLabel,
} from "../game/property/propertyDevelopment";
import type {
  PropertyDevelopmentError,
  PropertyDevelopmentStage,
} from "../game/property/propertyTypes";
import type { PropertyData } from "../types";
import {
  PropertyCard,
  type PropertyCardData,
} from "./PropertyCard";
import type { PlayerTokenData } from "./PlayerToken";

type DevelopmentPresentationPhase =
  | "DECISION"
  | "SUBMITTING"
  | "BLUEPRINT"
  | "CONSTRUCTION"
  | "REVEAL"
  | "HOLD";

type ConstructionStep =
  | "FENCE"
  | "SCAFFOLD"
  | "COVER";

interface PropertyDevelopmentModalProps {
  property: PropertyData | null;
  districtName: string | null;
  player: PlayerTokenData | null;
  currentStage: PropertyDevelopmentStage | null;
  nextStage: PropertyDevelopmentStage | null;
  constructionCost: number | null;
  currentToll: number | null;
  nextToll: number | null;
  currentCard: PropertyCardData | null;
  nextCard: PropertyCardData | null;
  showBalance: boolean;
  canAfford: boolean;
  error: PropertyDevelopmentError | null;
  onBuild: () => void;
  onDecline: () => void;
}

interface DevelopmentSnapshot {
  property: PropertyData;
  districtName: string;
  player: PlayerTokenData;
  currentStage: PropertyDevelopmentStage;
  nextStage: PropertyDevelopmentStage;
  constructionCost: number;
  currentToll: number | null;
  nextToll: number | null;
  currentCard: PropertyCardData | null;
  nextCard: PropertyCardData | null;
  showBalance: boolean;
}

const PHASE_DURATIONS: Partial<
  Record<DevelopmentPresentationPhase, number>
> = {
  BLUEPRINT: 1800,
  CONSTRUCTION: 4800,
  REVEAL: 2800,
  HOLD: 5000,
};

const DEVELOPMENT_OVERLAY_IMAGES = {
  fence: "/assets/development/construction-fence.png",
  scaffold: "/assets/development/construction-scaffold.png",
  cover: "/assets/development/construction-cover.png",
  reveal: "/assets/development/construction-reveal.png",
} as const;

const CONSTRUCTION_STEP_DATA: Record<
  ConstructionStep,
  {
    image: string;
    title: string;
    description: string;
    progress: number;
  }
> = {
  FENCE: {
    image: DEVELOPMENT_OVERLAY_IMAGES.fence,
    title: "안전 구역 설치",
    description: "공사 경계와 안전 시설을 설치합니다.",
    progress: 28,
  },
  SCAFFOLD: {
    image: DEVELOPMENT_OVERLAY_IMAGES.scaffold,
    title: "비계 조립",
    description: "본 공사를 위한 작업 구조물을 조립합니다.",
    progress: 64,
  },
  COVER: {
    image: DEVELOPMENT_OVERLAY_IMAGES.cover,
    title: "공사막 설치",
    description: "내부 시공과 마감 작업을 진행합니다.",
    progress: 94,
  },
};

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getDevelopmentStageImageSrc(
  stage: PropertyDevelopmentStage,
): string {
  return `/assets/properties/stages/${stage.toLowerCase()}.png`;
}

function getErrorMessage(
  error: PropertyDevelopmentError | null,
): string | null {
  switch (error) {
    case "INSUFFICIENT_FUNDS":
      return "건설비를 낼 자금이 부족합니다.";
    case "NOT_OWNER":
      return "현재 플레이어가 소유한 부동산이 아닙니다.";
    case "MAX_STAGE":
      return "이미 랜드마크 단계까지 건설된 부동산입니다.";
    case "DEVELOPMENT_RESTRICTED":
      return "도시개발 제한 명령이 적용 중입니다. 제한 기간 종료 또는 울산시청 인허가 처리 후 개발할 수 있습니다.";
    case "NO_PENDING_DEVELOPMENT":
      return "건설할 부동산 정보를 찾지 못했습니다.";
    default:
      return null;
  }
}

function getNextPhase(
  phase: DevelopmentPresentationPhase,
): DevelopmentPresentationPhase | null {
  switch (phase) {
    case "BLUEPRINT":
      return "CONSTRUCTION";
    case "CONSTRUCTION":
      return "REVEAL";
    case "REVEAL":
      return "HOLD";
    default:
      return null;
  }
}

function getReportNumber(boardTileId: number): string {
  return `UM-DEV-${String(boardTileId).padStart(3, "0")}`;
}

function BlueprintDiagram({
  stage,
}: {
  stage: PropertyDevelopmentStage;
}) {
  const patternId = `development-blueprint-grid-${stage}`;

  return (
    <svg
      className="property-development-animation__blueprint-svg"
      viewBox="0 0 520 420"
      role="img"
      aria-label={`${getDevelopmentStageLabel(stage)} 설계 청사진`}
    >
      <defs>
        <pattern
          id={patternId}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M20 0H0V20"
            className="property-development-animation__blueprint-grid-line"
          />
        </pattern>
      </defs>

      <rect width="520" height="420" fill={`url(#${patternId})`} />

      <g className="property-development-animation__blueprint-dimensions">
        <path d="M62 42H458M62 35V49M458 35V49" />
        <path d="M42 70V350M35 70H49M35 350H49" />
        <text x="260" y="31">SITE WIDTH 42.0M</text>
        <text x="25" y="230" transform="rotate(-90 25 230)">
          ELEVATION PLAN
        </text>
      </g>

      {stage === "DEVELOPED" && (
        <g className="property-development-animation__blueprint-building">
          <path d="M82 342H438" />
          <path d="M112 304H408V342H112Z" />
          <path d="M146 258H374V304H146Z" />
          <path d="M184 210H336V258H184Z" />
          <path d="M112 304L184 210M408 304L336 210" />
          <path d="M96 358H424" />
          <circle cx="146" cy="324" r="9" />
          <circle cx="374" cy="324" r="9" />
          <path d="M84 116H214V148H84Z" />
          <path d="M310 94H438V126H310Z" />
          <text x="98" y="137">FOUNDATION A</text>
          <text x="325" y="115">ROAD GRID</text>
        </g>
      )}

      {stage === "BUILDING" && (
        <g className="property-development-animation__blueprint-building">
          <path d="M104 354H416" />
          <path d="M150 94H370V354H150Z" />
          <path d="M184 54H336V94H184Z" />
          <path d="M150 140H370M150 186H370M150 232H370M150 278H370" />
          <path d="M205 94V354M260 94V354M315 94V354" />
          <path d="M126 354L150 94M394 354L370 94" />
          <path d="M184 54L150 94M336 54L370 94" />
          <path d="M232 292H288V354H232Z" />
          <text x="145" y="386">STEEL FRAME / ELEVATION PLAN</text>
        </g>
      )}

      {stage === "LANDMARK" && (
        <g className="property-development-animation__blueprint-building">
          <path d="M96 362H424" />
          <path d="M172 328H348V362H172Z" />
          <path d="M194 142H326V328H194Z" />
          <path d="M220 88H300V142H220Z" />
          <path d="M242 42H278V88H242Z" />
          <path d="M260 17V42" />
          <path d="M194 188H326M194 234H326M194 280H326" />
          <path d="M227 142V328M260 142V328M293 142V328" />
          <path d="M172 328L194 142M348 328L326 142" />
          <path d="M148 362L194 142M372 362L326 142" />
          <circle cx="260" cy="114" r="12" />
          <text x="154" y="394">LANDMARK MASTER PLAN</text>
        </g>
      )}

      <g className="property-development-animation__blueprint-notes">
        <text x="56" y="408">ULSAN MARBLE DEVELOPMENT BUREAU</text>
        <text x="422" y="408">REV. 04</text>
      </g>
    </svg>
  );
}

export function PropertyDevelopmentModal({
  property,
  districtName,
  player,
  currentStage,
  nextStage,
  constructionCost,
  currentToll,
  nextToll,
  currentCard,
  nextCard,
  showBalance,
  canAfford,
  error,
  onBuild,
  onDecline,
}: PropertyDevelopmentModalProps) {
  const [phase, setPhase] =
    useState<DevelopmentPresentationPhase>("DECISION");
  const [snapshot, setSnapshot] =
    useState<DevelopmentSnapshot | null>(null);
  const [constructionStep, setConstructionStep] =
    useState<ConstructionStep>("FENCE");

  const displayProperty = snapshot?.property ?? property;
  const displayPlayer = snapshot?.player ?? player;
  const displayCurrentStage = snapshot?.currentStage ?? currentStage;
  const displayNextStage = snapshot?.nextStage ?? nextStage;
  const displayConstructionCost =
    snapshot?.constructionCost ?? constructionCost;
  const displayCurrentToll = snapshot?.currentToll ?? currentToll;
  const displayNextToll = snapshot?.nextToll ?? nextToll;
  const displayCurrentCard = snapshot?.currentCard ?? currentCard;
  const displayNextCard = snapshot?.nextCard ?? nextCard;
  const displayDistrictName =
    snapshot?.districtName ??
    districtName ??
    displayProperty?.district ??
    "";
  const displayShowBalance = snapshot?.showBalance ?? showBalance;

  const isAnimation = phase !== "DECISION" && phase !== "SUBMITTING";
  const isLandmarkCompletion = displayNextStage === "LANDMARK";
  const errorMessage = getErrorMessage(error);
  const isDevelopmentRestricted =
    error === "DEVELOPMENT_RESTRICTED";
  const phaseClass = phase.toLowerCase();
  const overlayStyle = {
    "--development-player-color": displayPlayer?.color ?? "#3ea6d8",
  } as CSSProperties;
  const constructionStepData =
    CONSTRUCTION_STEP_DATA[constructionStep];

  useEffect(() => {
    if (phase !== "SUBMITTING") return;

    if (error) {
      setSnapshot(null);
      setPhase("DECISION");
      return;
    }

    if (snapshot && property === null) {
      setPhase("BLUEPRINT");
    }
  }, [error, phase, property, snapshot]);

  useEffect(() => {
    if (phase !== "CONSTRUCTION") {
      setConstructionStep("FENCE");
      return;
    }

    setConstructionStep("FENCE");

    const scaffoldTimer = window.setTimeout(() => {
      setConstructionStep("SCAFFOLD");
    }, 1300);
    const coverTimer = window.setTimeout(() => {
      setConstructionStep("COVER");
    }, 2700);

    return () => {
      window.clearTimeout(scaffoldTimer);
      window.clearTimeout(coverTimer);
    };
  }, [phase]);

  useEffect(() => {
    const duration = PHASE_DURATIONS[phase];
    if (!duration) return;

    const timer = window.setTimeout(() => {
      if (phase === "HOLD") {
        setSnapshot(null);
        setPhase("DECISION");
        return;
      }

      const nextPhaseValue = getNextPhase(phase);
      if (nextPhaseValue) {
        setPhase(nextPhaseValue);
      }
    }, duration);

    return () => window.clearTimeout(timer);
  }, [phase]);

  if (
    !displayProperty ||
    !displayPlayer ||
    !displayCurrentStage ||
    !displayNextStage ||
    displayConstructionCost === null
  ) {
    return null;
  }

  const remainingMoney =
    displayPlayer.money - displayConstructionCost;
  const reportNumber = getReportNumber(displayProperty.boardTileId);

  const handleBuild = () => {
    if (
      phase !== "DECISION" ||
      !property ||
      !player ||
      !currentStage ||
      !nextStage ||
      constructionCost === null ||
      !canAfford ||
      isDevelopmentRestricted
    ) {
      return;
    }

    setSnapshot({
      property,
      districtName: districtName ?? property.district,
      player: { ...player },
      currentStage,
      nextStage,
      constructionCost,
      currentToll,
      nextToll,
      currentCard,
      nextCard,
      showBalance,
    });
    setPhase("SUBMITTING");
    onBuild();
  };

  const handleDecline = () => {
    if (phase !== "DECISION") return;
    onDecline();
  };

  return (
    <div
      className={`property-development-overlay property-development-overlay--${phaseClass}${
        isLandmarkCompletion ? " is-landmark-completion" : ""
      }`}
      style={overlayStyle}
    >
      {!isAnimation ? (
        <section
          className={`property-development-report${
            phase === "SUBMITTING" ? " is-submitting" : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-development-title"
        >
          <div
            className="property-development-report__binding"
            aria-hidden="true"
          />

          <header className="property-development-report__header">
            <div className="property-development-report__agency">
              <span>ULSAN MARBLE</span>
              <strong>도시개발본부</strong>
            </div>

            <div className="property-development-report__title">
              <small>부동산 개발 검토 문서</small>
              <h2 id="property-development-title">
                개발계획 보고서
              </h2>
            </div>

            <div className="property-development-report__document">
              <span>문서번호</span>
              <strong>{reportNumber}</strong>
              <span>보안등급</span>
              <strong>일반</strong>
            </div>
          </header>

          <section className="property-development-report__subject">
            <span>사업명</span>
            <strong>
              {displayProperty.name}{" "}
              {getDevelopmentStageLabel(displayNextStage)} 조성사업
            </strong>
          </section>

          <table className="property-development-report__table">
            <tbody>
              <tr>
                <th>사업 대상</th>
                <td>{displayProperty.name}</td>
                <th>사업 권역</th>
                <td>{displayDistrictName}</td>
              </tr>
              <tr>
                <th>시행자</th>
                <td>{displayPlayer.name}</td>
                <th>개발 유형</th>
                <td>
                  {getDevelopmentStageLabel(displayNextStage)} 조성
                </td>
              </tr>
              <tr>
                <th>현재 단계</th>
                <td>
                  {getDevelopmentStageLabel(displayCurrentStage)}
                </td>
                <th>개발 계획</th>
                <td className="is-emphasis">
                  {getDevelopmentStageLabel(displayNextStage)}
                </td>
              </tr>
              <tr>
                <th>총 건설비</th>
                <td className="is-amount">
                  {formatMoney(displayConstructionCost)}
                </td>
                <th>건설 후 잔액</th>
                <td className={canAfford ? "" : "is-insufficient"}>
                  {isDevelopmentRestricted
                    ? "개발 제한"
                    : displayShowBalance
                      ? canAfford
                        ? formatMoney(remainingMoney)
                        : "잔액 부족"
                      : "비공개"}
                </td>
              </tr>
              {displayCurrentToll !== null &&
                displayNextToll !== null && (
                  <tr>
                    <th>현재 통행료</th>
                    <td>{formatMoney(displayCurrentToll)}</td>
                    <th>예상 통행료</th>
                    <td className="is-emphasis">
                      {formatMoney(displayNextToll)}
                    </td>
                  </tr>
                )}
              {displayShowBalance && (
                <tr>
                  <th>현재 보유자금</th>
                  <td>{formatMoney(displayPlayer.money)}</td>
                  <th>자금 검토</th>
                  <td
                    className={
                      isDevelopmentRestricted
                        ? "is-insufficient"
                        : canAfford
                          ? "is-approved"
                          : "is-insufficient"
                    }
                  >
                    {isDevelopmentRestricted
                      ? "제한 명령"
                      : canAfford
                        ? "개발 가능"
                        : "개발 불가"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <section className="property-development-report__opinion">
            <span>검토 의견</span>
            <p>
              {isDevelopmentRestricted
                ? "현재 도시개발 제한 명령이 적용되어 본 사업을 승인할 수 없습니다. 제한 기간 종료 또는 울산시청 인허가 처리가 필요합니다."
                : "본 개발사업 완료 시 해당 부동산의 개발 단계와 통행료가 상향 조정됩니다. 총 건설비와 예상 잔액을 확인한 후 개발 승인 여부를 결정하십시오."}
            </p>
          </section>

          <footer className="property-development-report__footer">
            <div className="property-development-report__approval">
              <span>결재</span>
              <div>
                <small>검토</small>
                <strong>완료</strong>
              </div>
              <div className="is-pending">
                <small>승인</small>
                <strong>
                  {phase === "SUBMITTING" ? "처리 중" : "대기"}
                </strong>
              </div>
            </div>

            <div className="property-development-report__signature">
              <span>시행자</span>
              <strong>{displayPlayer.name}</strong>
            </div>
          </footer>

          {errorMessage && (
            <p
              className="property-development-report__error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <div className="property-development-report__actions">
            <button
              type="button"
              className="property-development-report__decline"
              onClick={handleDecline}
              disabled={phase === "SUBMITTING"}
            >
              개발 보류
            </button>

            <button
              type="button"
              className="property-development-report__approve"
              onClick={handleBuild}
              disabled={
                !canAfford ||
                isDevelopmentRestricted ||
                phase === "SUBMITTING"
              }
            >
              {phase === "SUBMITTING"
                ? "승인 처리 중..."
                : isDevelopmentRestricted
                  ? "개발 제한 중"
                  : canAfford
                    ? "개발 승인"
                    : "자금 부족"}
            </button>
          </div>
        </section>
      ) : (
        <section
          className={`property-development-animation property-development-animation--${phaseClass}`}
          role="status"
          aria-live="polite"
        >
          <header className="property-development-animation__headline">
            <span>
              {isLandmarkCompletion
                ? "LANDMARK DEVELOPMENT"
                : "PROPERTY DEVELOPMENT"}
            </span>
            <strong>
              {phase === "BLUEPRINT" && "개발 설계 검토"}
              {phase === "CONSTRUCTION" && "공사 진행 중"}
              {phase === "REVEAL" && "완공 공개"}
              {phase === "HOLD" &&
                (isLandmarkCompletion
                  ? "랜드마크 완공"
                  : "개발 완료")}
            </strong>
            <small>
              {displayProperty.name} ·{" "}
              {getDevelopmentStageLabel(displayCurrentStage)}에서{" "}
              {getDevelopmentStageLabel(displayNextStage)}으로 개발
            </small>
          </header>

          <div className="property-development-animation__scene">
            <div className="property-development-animation__card-stack">
              {displayCurrentCard && (
                <div className="property-development-animation__card property-development-animation__card--before">
                  <PropertyCard property={displayCurrentCard} />
                </div>
              )}

              <div className="property-development-animation__card property-development-animation__card--after">
                {displayNextCard ? (
                  <PropertyCard property={displayNextCard} />
                ) : (
                  <div className="property-development-animation__card-fallback">
                    <img
                      src={getDevelopmentStageImageSrc(displayNextStage)}
                      alt={`${getDevelopmentStageLabel(displayNextStage)} 개발 단계`}
                      draggable={false}
                    />
                    <strong>
                      {getDevelopmentStageLabel(displayNextStage)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {phase === "BLUEPRINT" && (
              <div className="property-development-animation__blueprint">
                <header>
                  <div>
                    <span>DEVELOPMENT PLAN</span>
                    <strong>{displayProperty.name}</strong>
                  </div>
                  <b>
                    {getDevelopmentStageLabel(displayNextStage)} 설계
                  </b>
                </header>

                <BlueprintDiagram stage={displayNextStage} />

                <footer>
                  <span>
                    건설비 {formatMoney(displayConstructionCost)}
                  </span>
                  <strong>설계 검토 100%</strong>
                </footer>
              </div>
            )}

            {(phase === "CONSTRUCTION" ||
              phase === "REVEAL") && (
              <div
                className={`property-development-animation__construction-site property-development-animation__construction-site--${phase.toLowerCase()}`}
                aria-hidden="true"
              >
                {phase === "CONSTRUCTION" && (
                  <>
                    <img
                      key={constructionStep}
                      className={`property-development-animation__construction-layer property-development-animation__construction-layer--active property-development-animation__construction-layer--${constructionStep.toLowerCase()}`}
                      src={constructionStepData.image}
                      alt=""
                      draggable={false}
                    />

                    <div className="property-development-animation__construction-status">
                      <span>ULSAN DEVELOPMENT</span>
                      <strong>{constructionStepData.title}</strong>

                      <div>
                        <i
                          style={{
                            width: `${constructionStepData.progress}%`,
                          }}
                        />
                      </div>

                      <small>{constructionStepData.description}</small>
                    </div>
                  </>
                )}

                {phase === "REVEAL" && (
                  <img
                    className="property-development-animation__construction-layer property-development-animation__construction-layer--reveal"
                    src={DEVELOPMENT_OVERLAY_IMAGES.reveal}
                    alt=""
                    draggable={false}
                  />
                )}
              </div>
            )}

            {phase === "REVEAL" && (
              <div className="property-development-animation__stage-result">
                <span>
                  {isLandmarkCompletion
                    ? "LANDMARK COMPLETE"
                    : "DEVELOPMENT COMPLETE"}
                </span>

                <img
                  src={getDevelopmentStageImageSrc(displayNextStage)}
                  alt={`${getDevelopmentStageLabel(displayNextStage)} 완성 이미지`}
                  draggable={false}
                />

                <strong>
                  {getDevelopmentStageLabel(displayNextStage)} 완공
                </strong>

                <small>{displayProperty.name}</small>

                {displayCurrentToll !== null &&
                  displayNextToll !== null && (
                    <em>
                      통행료 {formatMoney(displayCurrentToll)}
                      <b>→</b>
                      {formatMoney(displayNextToll)}
                    </em>
                  )}
              </div>
            )}

            {phase === "HOLD" && (
              <div className="property-development-animation__completion">
                <span>
                  {isLandmarkCompletion
                    ? "LANDMARK COMPLETE"
                    : "DEVELOPMENT COMPLETE"}
                </span>
                <strong>
                  {getDevelopmentStageLabel(displayNextStage)} 완공
                </strong>

                {displayCurrentToll !== null &&
                  displayNextToll !== null && (
                    <small>
                      통행료 {formatMoney(displayCurrentToll)}
                      <b>→</b>
                      {formatMoney(displayNextToll)}
                    </small>
                  )}
              </div>
            )}
          </div>

          <footer className="property-development-animation__progress">
            <div>
              <span />
            </div>
            <strong>
              {phase === "BLUEPRINT" && "설계 검토 완료"}
              {phase === "CONSTRUCTION" && "현장 공사 진행"}
              {phase === "REVEAL" && "완성 이미지 공개"}
              {phase === "HOLD" && "부동산 카드 반영 완료"}
            </strong>
          </footer>
        </section>
      )}
    </div>
  );
}
