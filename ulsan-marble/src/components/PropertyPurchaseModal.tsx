import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./PropertyPurchaseModal.css";
import type {
  LandmarkPurchaseRequirement,
  PropertyPurchaseError,
} from "../game/property/propertyTypes";
import type { PropertyData } from "../types";
import { PropertyCard, type PropertyCardData } from "./PropertyCard";
import type { PlayerTokenData } from "./PlayerToken";

type PurchasePresentationPhase =
  | "CONTRACT"
  | "PURCHASING"
  | "STAMPING"
  | "CONTRACT_EXIT"
  | "CARD_REVEAL"
  | "CARD_HOLD"
  | "CARD_HANDOFF";

interface PropertyPurchaseModalProps {
  property: PropertyData | null;
  propertyCard: PropertyCardData | null;
  districtName: string | null;
  player: PlayerTokenData;
  purchasePrice: number | null;
  showBalance: boolean;
  canAfford: boolean;
  canRespond: boolean;
  landmarkRequirement:
    LandmarkPurchaseRequirement | null;
  purchaseSignal?: {
  decisionId: number;
  propertyId: string;
  action: "BUY" | "DECLINE";
  } | null;  
  error: PropertyPurchaseError | null;
  onPurchase: () => void;
  onDecline: () => void;
}

interface PurchaseSnapshot {
  property: PropertyData;
  propertyCard: PropertyCardData;
  districtName: string;
  player: PlayerTokenData;
  purchasePrice: number;
  showBalance: boolean;
  landmarkRequirement: LandmarkPurchaseRequirement | null;
}

const PHASE_DURATIONS: Partial<
  Record<PurchasePresentationPhase, number>
> = {
  STAMPING: 950,
  CONTRACT_EXIT: 380,
  CARD_REVEAL: 620,
  CARD_HOLD: 3000,
  CARD_HANDOFF: 850,
};

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: PropertyPurchaseError | null): string | null {
  switch (error) {
    case "INSUFFICIENT_FUNDS":
      return "보유 자금이 부족합니다.";
    case "ALREADY_OWNED":
      return "이미 다른 플레이어가 소유한 부동산입니다.";
    case "LANDMARK_REQUIREMENT_NOT_MET":
      return "랜드마크 매입 조건을 충족하지 못했습니다.";
    case "NO_PENDING_PURCHASE":
      return "구매할 부동산 정보를 찾지 못했습니다.";
    default:
      return null;
  }
}

function getNextPhase(
  phase: PurchasePresentationPhase,
): PurchasePresentationPhase | null {
  switch (phase) {
    case "STAMPING":
      return "CONTRACT_EXIT";
    case "CONTRACT_EXIT":
      return "CARD_REVEAL";
    case "CARD_REVEAL":
      return "CARD_HOLD";
    case "CARD_HOLD":
      return "CARD_HANDOFF";
    default:
      return null;
  }
}

export function PropertyPurchaseModal({
  property,
  propertyCard,
  districtName,
  player,
  purchasePrice,
  showBalance,
  canAfford,
  canRespond,
  landmarkRequirement,
  purchaseSignal,
  error,
  onPurchase,
  onDecline,
}: PropertyPurchaseModalProps) {
  const [phase, setPhase] =
    useState<PurchasePresentationPhase>("CONTRACT");
  const [snapshot, setSnapshot] = useState<PurchaseSnapshot | null>(null);

  const displayProperty = snapshot?.property ?? property;
  const displayPropertyCard = snapshot?.propertyCard ?? propertyCard;
  const displayDistrictName =
    snapshot?.districtName ??
    districtName ??
    displayProperty?.district ??
    "";
  const displayPlayer = snapshot?.player ?? player;
  const displayPurchasePrice = snapshot?.purchasePrice ?? purchasePrice;
  const displayShowBalance = snapshot?.showBalance ?? showBalance;
  const processedPurchaseSignalIdRef =
    useRef(0);
  const displayLandmarkRequirement =
    snapshot?.landmarkRequirement ?? landmarkRequirement;

  useEffect(() => {
    if (
      !purchaseSignal ||
      purchaseSignal.action !== "BUY" ||
      phase !== "CONTRACT"
    ) {
      return;
    }

    if (
      processedPurchaseSignalIdRef.current >=
      purchaseSignal.decisionId
    ) {
      return;
    }

    if (
      !property ||
      !propertyCard ||
      purchasePrice === null ||
      purchaseSignal.propertyId !== property.id
    ) {
      return;
    }

    processedPurchaseSignalIdRef.current =
      purchaseSignal.decisionId;

    setSnapshot({
      property,
      propertyCard,
      districtName:
        districtName ?? property.district,
      player: { ...player },
      purchasePrice,
      showBalance,
      landmarkRequirement,
    });

    setPhase("PURCHASING");
  }, [
    districtName,
    landmarkRequirement,
    phase,
    player,
    property,
    propertyCard,
    purchasePrice,
    purchaseSignal,
    showBalance,
  ]);    

  const phaseClass = phase.toLowerCase().replace(/_/g, "-");
  const errorMessage = getErrorMessage(error);
  const isContractVisible =
    phase === "CONTRACT" ||
    phase === "PURCHASING" ||
    phase === "STAMPING" ||
    phase === "CONTRACT_EXIT";
  const isBusy = phase !== "CONTRACT";

  useEffect(() => {
    if (phase !== "PURCHASING") return;

    if (error) {
      setSnapshot(null);
      setPhase("CONTRACT");
      return;
    }

    /*
     * 기존 구매 로직은 성공 시 pendingPropertyPurchase를 비우면서
     * property prop이 null이 된다. 그 시점을 구매 성공으로 판단하고
     * 로컬 snapshot을 이용해 연출을 계속한다.
     */
    if (snapshot && property === null) {
      setPhase("STAMPING");
    }
  }, [error, phase, property, snapshot]);

  useEffect(() => {
    const duration = PHASE_DURATIONS[phase];
    if (!duration) return;

    const timer = window.setTimeout(() => {
      if (phase === "CARD_HANDOFF") {
        setSnapshot(null);
        setPhase("CONTRACT");
        return;
      }

      const nextPhase = getNextPhase(phase);
      if (nextPhase) {
        setPhase(nextPhase);
      }
    }, duration);

    return () => window.clearTimeout(timer);
  }, [phase]);

  if (
    !displayProperty ||
    !displayPropertyCard ||
    displayPurchasePrice === null
  ) {
    return null;
  }

  const remainingMoney =
    displayPlayer.money - displayPurchasePrice;
  const hasEnoughMoney = remainingMoney >= 0;
  const landmarkRequirementMet =
    displayLandmarkRequirement?.eligible ?? true;
  const isCityLandmark =
    displayProperty.isLandmark &&
    displayProperty.landmarkScope === "CITY";
  const contractNumber = `UM-${String(
    displayProperty.boardTileId,
  ).padStart(3, "0")}-${displayProperty.id
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase()}`;

  const overlayStyle = {
    "--purchase-player-color": displayPlayer.color,
  } as CSSProperties;

  const handlePurchase = () => {
    if (
      !canRespond ||
      phase !== "CONTRACT" ||
      !property ||
      !propertyCard ||
      purchasePrice === null ||
      !canAfford
    ) {
      return;
    }

    setSnapshot({
      property,
      propertyCard,
      districtName: districtName ?? property.district,
      player: { ...player },
      purchasePrice,
      showBalance,
      landmarkRequirement,
    });
    setPhase("PURCHASING");
    onPurchase();
  };

  const handleDecline = () => {
    if (
      !canRespond ||
      phase !== "CONTRACT"
    ) {
      return;
    }

    onDecline();
  };

  return (
    <div
      className={`property-purchase-overlay property-purchase-overlay--${phaseClass}`}
      style={overlayStyle}
    >
      {isContractVisible ? (
        <section
          className={`property-purchase-modal property-purchase-modal--${phaseClass}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="property-purchase-title"
        >
          <div
            className="property-purchase-modal__paper-texture"
            aria-hidden="true"
          />

          <header className="property-purchase-modal__header">
            <div>
              <span>ULSAN MARBLE REAL ESTATE</span>
              <h2 id="property-purchase-title">
                부동산 매매계약서
              </h2>
            </div>

            <dl className="property-purchase-modal__document-meta">
              <div>
                <dt>계약번호</dt>
                <dd>{contractNumber}</dd>
              </div>
              <div>
                <dt>계약구분</dt>
                <dd>신규 매입</dd>
              </div>
            </dl>
          </header>

          <div className="property-purchase-modal__rule" />

          <section className="property-purchase-modal__section">
            <h3>제1조 · 부동산의 표시</h3>

            <dl className="property-purchase-modal__contract-table">
              <div className="is-wide">
                <dt>소재지</dt>
                <dd>
                  {isCityLandmark
                    ? "울산광역시 광역 랜드마크"
                    : `울산광역시 ${displayDistrictName}`}{" "}
                  <strong>{displayProperty.name}</strong>
                </dd>
              </div>
              <div>
                <dt>{isCityLandmark ? "적용 범위" : "구·군"}</dt>
                <dd>{isCityLandmark ? "울산 전체" : displayDistrictName}</dd>
              </div>
              <div>
                <dt>개발 상태</dt>
                <dd>토지</dd>
              </div>
              <div>
                <dt>부동산 번호</dt>
                <dd>
                  No.
                  {String(displayProperty.boardTileId).padStart(2, "0")}
                </dd>
              </div>
              <div>
                <dt>부동산 구분</dt>
                <dd>
                  {isCityLandmark
                    ? "울산 광역 랜드마크"
                    : displayProperty.isLandmark
                      ? "구·군 대표 랜드마크"
                      : "일반 부동산"}
                </dd>
              </div>
            </dl>
          </section>

          {displayProperty.isLandmark &&
            displayLandmarkRequirement &&
            displayLandmarkRequirement.kind !== "NONE" && (
              <section className="property-purchase-modal__section">
                <h3>제2조 · 랜드마크 매입 자격</h3>

                <div
                  className={`property-purchase-modal__landmark-requirement${
                    displayLandmarkRequirement.eligible
                      ? " is-qualified"
                      : " is-unqualified"
                  }`}
                >
                  <header>
                    <span>
                      {displayLandmarkRequirement.kind === "CITY"
                        ? "울산 전체 랜드마크"
                        : `${displayDistrictName} 대표 랜드마크`}
                    </span>
                    <strong>
                      {displayLandmarkRequirement.eligible
                        ? "매입 자격 충족"
                        : "매입 자격 미충족"}
                    </strong>
                  </header>

                  {displayLandmarkRequirement.kind === "DISTRICT" ? (
                    <>
                      <dl>
                        <div>
                          <dt>일반 부동산 보유</dt>
                          <dd>
                            {displayLandmarkRequirement.ownedCount} /{" "}
                            {displayLandmarkRequirement.totalCount}필지
                          </dd>
                        </div>
                        <div>
                          <dt>최소 필요</dt>
                          <dd>
                            {displayLandmarkRequirement.requiredCount}필지
                          </dd>
                        </div>
                      </dl>
                      <div className="property-purchase-modal__requirement-progress">
                        <i
                          style={{
                            width: `${Math.min(
                              100,
                              (displayLandmarkRequirement.ownedCount /
                                Math.max(
                                  1,
                                  displayLandmarkRequirement.requiredCount,
                                )) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <dl>
                      <div>
                        <dt>구·군 대표 랜드마크</dt>
                        <dd>
                          {
                            displayLandmarkRequirement.ownedDistrictLandmarkCount
                          }{" "}
                          /{" "}
                          {
                            displayLandmarkRequirement.requiredDistrictLandmarkCount
                          }개
                        </dd>
                      </div>
                      <div>
                        <dt>일반 부동산 진출 구·군</dt>
                        <dd>
                          {displayLandmarkRequirement.enteredDistrictCount} /{" "}
                          {displayLandmarkRequirement.requiredDistrictCount}곳
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </section>
            )}

          <section className="property-purchase-modal__section">
            <h3>
              제{displayProperty.isLandmark ? 3 : 2}조 · 계약 당사자 및
              매매대금
            </h3>

            <dl className="property-purchase-modal__contract-table">
              <div>
                <dt>매도인</dt>
                <dd>울산마블 은행</dd>
              </div>
              <div>
                <dt>매수인</dt>
                <dd>{displayPlayer.name}</dd>
              </div>
              <div className="is-price">
                <dt>매매대금</dt>
                <dd>{formatMoney(displayPurchasePrice)}</dd>
              </div>

              {displayShowBalance ? (
                <>
                  <div>
                    <dt>현재 자금</dt>
                    <dd>{formatMoney(displayPlayer.money)}</dd>
                  </div>
                  <div>
                    <dt>계약 후 잔액</dt>
                    <dd className={hasEnoughMoney ? "" : "is-insufficient"}>
                      {hasEnoughMoney
                        ? formatMoney(remainingMoney)
                        : "잔액 부족"}
                    </dd>
                  </div>
                </>
              ) : (
                <div className="is-wide">
                  <dt>계약 당사자</dt>
                  <dd>{displayPlayer.name} 플레이어</dd>
                </div>
              )}
            </dl>
          </section>

          <p className="property-purchase-modal__clause">
            본 계약은 울산마블 게임 규칙에 따라 매매대금 결제와 동시에
            소유권이 매수인에게 이전되며, 해당 부동산의 통행료 및 개발
            권한은 매수인에게 귀속됩니다.
          </p>

          <section className="property-purchase-modal__signatures">
            <div>
              <span>매도인</span>
              <strong>울산마블 은행</strong>
              <small>게임 자산관리부</small>
            </div>

            <div className="property-purchase-modal__buyer-signature">
              <span>매수인</span>
              <strong>{displayPlayer.name}</strong>
              <small>계약 체결 확인</small>
            </div>
          </section>

          {(phase === "STAMPING" || phase === "CONTRACT_EXIT") && (
            <div
              className={`property-purchase-modal__stamp-stage${
                phase === "CONTRACT_EXIT" ? " is-settled" : ""
              }`}
              aria-hidden="true"
            >
              <div className="property-purchase-modal__stamp-handle">
                <i />
                <span>울산마블</span>
              </div>

              <div className="property-purchase-modal__stamp-mark">
                <span>소유권 등록</span>
                <strong>{displayPlayer.name}</strong>
                <span>계약 체결</span>
              </div>

              <div className="property-purchase-modal__impact-ring" />
            </div>
          )}

          {errorMessage && phase === "CONTRACT" && (
            <p className="property-purchase-modal__error" role="alert">
              {errorMessage}
            </p>
          )}

          <footer className="property-purchase-modal__footer">
            <span>
              {canRespond
                ? "계약 체결 시 매매대금이 즉시 차감됩니다."
                : `${displayPlayer.name}님의 선택을 기다리는 중입니다.`}
            </span>

            <div className="property-purchase-modal__actions">
              <button
                type="button"
                className="property-purchase-modal__decline"
                onClick={handleDecline}
                disabled={
                  !canRespond ||
                  isBusy
                }
              >
                계약 보류
              </button>

              <button
                type="button"
                className="property-purchase-modal__purchase"
                onClick={handlePurchase}
                disabled={
                    !canRespond ||
                    !canAfford ||
                    isBusy
                  }
              >
                {isBusy
                  ? phase === "PURCHASING"
                    ? "계약 처리 중..."
                    : "계약 체결 완료"
                  : canAfford
                    ? "계약 체결"
                    : !landmarkRequirementMet
                      ? "매입 조건 미충족"
                      : "자금 부족"}
              </button>
            </div>
          </footer>
        </section>
      ) : (
        <section
          className={`property-purchase-reward property-purchase-reward--${phaseClass} property-purchase-reward--${displayPlayer.dock}`}
          role="status"
          aria-live="polite"
        >
          <header className="property-purchase-reward__headline">
            <span>PROPERTY ACQUIRED</span>
            <strong>소유권 이전 완료</strong>
            <small>
              {displayPlayer.name}님의 부동산 카드가 발급되었습니다.
            </small>
          </header>

          <div className="property-purchase-reward__light" aria-hidden="true" />

          <div className="property-purchase-reward__card-shell">
            <PropertyCard property={displayPropertyCard} />
          </div>

          <div className="property-purchase-reward__handoff">
            <span
              className="property-purchase-reward__player-token"
              aria-hidden="true"
            >
              {displayPlayer.shortName}
            </span>
            <div>
              <strong>{displayPlayer.name}</strong>
              <small>
                {phase === "CARD_HANDOFF"
                  ? "자산 보관함으로 카드를 전달하는 중"
                  : `${displayProperty.name} 소유권 등록`}
              </small>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
