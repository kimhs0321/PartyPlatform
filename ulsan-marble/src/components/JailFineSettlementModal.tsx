import { useEffect, useRef, useState } from "react";

import "./JailFineSettlementModal.css";

import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type { SellablePropertyAsset } from "../game/property/propertySale";
import type { SellableStockAsset } from "../game/stock/stockLiquidation";
import type { JailLiquidationError } from "../game/jail/jailTypes";
import type { PlayerTokenData } from "./PlayerToken";
import { StockLiquidationList } from "./StockLiquidationList";

interface JailFineSettlementModalProps {
  player: PlayerTokenData | null;
  amountDue: number;
  shortfall: number;
  liquidationValue: number;
  propertyAssets: SellablePropertyAsset[];
  stockAssets: SellableStockAsset[];
  canPay: boolean;
  canCoverAfterLiquidation: boolean;
  canDeclareBankruptcy: boolean;
  canInteract: boolean;
  error: JailLiquidationError | null;
  onPay: () => void;
  onSellProperty: (propertyId: string) => void;
  onSellStock: (companyId: string, quantity: number) => void;
  onDeclareBankruptcy: () => void;
}

type ReleasePhase = "IDLE" | "PROCESSING" | "APPROVED";

const RELEASE_APPROVED_DELAY = 650;
const RELEASE_COMMIT_DELAY = 1450;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: JailLiquidationError | null): string | null {
  switch (error) {
    case "NO_PENDING_FINE":
      return "처리할 구치소 벌금이 없습니다.";
    case "PROPERTY_NOT_OWNED":
      return "매각할 부동산 정보를 찾지 못했습니다.";
    case "NOT_OWNER":
      return "해당 부동산의 소유자가 아닙니다.";
    case "STOCK_NOT_OWNED":
      return "매도할 주식 보유 정보를 찾지 못했습니다.";
    case "INVALID_STOCK_QUANTITY":
      return "매도 수량을 다시 확인해 주세요.";
    case "COMPANY_NOT_FOUND":
      return "종목 정보를 찾지 못했습니다.";
    case "ASSETS_REMAIN":
      return "보유 주식과 부동산을 모두 정리한 뒤 파산 처리할 수 있습니다.";
    case "SALE_FAILED":
      return "자산 처리 중 오류가 발생했습니다.";
    default:
      return null;
  }
}

export function JailFineSettlementModal({
  player,
  amountDue,
  shortfall,
  liquidationValue,
  propertyAssets,
  stockAssets,
  canPay,
  canCoverAfterLiquidation,
  canDeclareBankruptcy,
  canInteract,
  error,
  onPay,
  onSellProperty,
  onSellStock,
  onDeclareBankruptcy,
}: JailFineSettlementModalProps) {
  const [releasePhase, setReleasePhase] =
    useState<ReleasePhase>("IDLE");
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    timerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timerIdsRef.current = [];
    setReleasePhase("IDLE");

    return () => {
      timerIdsRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [player?.id, amountDue]);

  if (!player) return null;

  const errorMessage = getErrorMessage(error);
  const hasAnyAsset =
    propertyAssets.length > 0 || stockAssets.length > 0;
  const isProcessing = releasePhase !== "IDLE";
  const releaseNumber = `REL-${String(player.id)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-5)
    .toUpperCase()
    .padStart(5, "0")}`;

  const handlePay = () => {
    if (
      !canInteract ||
      !canPay ||
      isProcessing
    ) {
      return;
    }
    setReleasePhase("PROCESSING");

    timerIdsRef.current.push(
      window.setTimeout(() => {
        setReleasePhase("APPROVED");
      }, RELEASE_APPROVED_DELAY),
    );

    timerIdsRef.current.push(
      window.setTimeout(() => {
        onPay();
      }, RELEASE_COMMIT_DELAY),
    );
  };

  return (
    <div className="jail-fine-overlay">
      <section
        className={[
          "jail-fine-modal",
          `is-${releasePhase.toLowerCase()}`,
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jail-fine-title"
      >
        <header className="jail-fine-modal__header">
          <div>
            <span>ULSAN MARBLE DETENTION CENTER</span>
            <strong>출소 심사실</strong>
          </div>
          <b>{releaseNumber}</b>
        </header>

        <div className="jail-fine-modal__document">
          <div className="jail-fine-modal__document-heading">
            <div>
              <small>더블 탈출 3회 실패</small>
              <h2 id="jail-fine-title">강제 출소 벌금 납부서</h2>
              <p>
                벌금을 납부하면 즉시 출소하지만 이번 차례에는 이동하지
                않습니다.
              </p>
            </div>

            <span
              className="jail-fine-modal__player-token"
              style={{ ["--player-color" as string]: player.color }}
            >
              {player.shortName}
            </span>
          </div>

          <dl className="jail-fine-modal__summary">
            <div>
              <dt>수감자</dt>
              <dd>{player.name}</dd>
            </div>
            <div>
              <dt>현재 현금</dt>
              <dd>{formatMoney(player.money)}</dd>
            </div>
            <div className="is-fine">
              <dt>강제 출소 벌금</dt>
              <dd>{formatMoney(amountDue)}</dd>
            </div>
            <div>
              <dt>부족 금액</dt>
              <dd className={shortfall > 0 ? "is-shortfall" : ""}>
                {formatMoney(shortfall)}
              </dd>
            </div>
            <div>
              <dt>전체 정리 가능액</dt>
              <dd>{formatMoney(liquidationValue)}</dd>
            </div>
          </dl>

          {canPay ? (
            <section className="jail-fine-modal__payment-ready">
              <div>
                <span>PAYMENT AVAILABLE</span>
                <strong>벌금 납부 가능</strong>
                <p>
                  납부 승인 후 철문이 열리고 수감 상태가 해제됩니다.
                </p>
              </div>

              <button
                type="button"
                className="jail-fine-modal__pay"
                disabled={ !canInteract || isProcessing}
                onClick={handlePay}
              >
                {releasePhase === "IDLE" &&
                  `${formatMoney(amountDue)} 납부 후 출소`}
                {releasePhase === "PROCESSING" && "납부 승인 처리 중"}
                {releasePhase === "APPROVED" && "출소 승인 완료"}
              </button>
            </section>
          ) : (
            <>
              <div
                className={`jail-fine-modal__notice${
                  canCoverAfterLiquidation
                    ? ""
                    : " is-bankruptcy-risk"
                }`}
              >
                <strong>
                  {canCoverAfterLiquidation
                    ? "자산 정리 필요"
                    : "파산 위험"}
                </strong>
                <span>
                  {canCoverAfterLiquidation
                    ? "필요한 만큼 주식이나 부동산을 매각하면 벌금을 납부할 수 있습니다."
                    : "모든 자산을 정리해도 벌금이 부족해 파산할 수 있습니다."}
                </span>
              </div>

              <section className="jail-fine-modal__liquidation">
                <div className="jail-fine-modal__section-title">
                  <strong>보유 주식</strong>
                  <span>즉시 매도 가능 자산</span>
                </div>

                <StockLiquidationList
                  assets={stockAssets}
                  disabled={!canInteract}
                  disabledMessage="본인만 자산을 정리할 수 있습니다."
                  onSellStock={onSellStock}
                />

                {propertyAssets.length > 0 && (
                  <section className="jail-fine-property-section">
                    <div className="jail-fine-modal__section-title">
                      <strong>보유 부동산</strong>
                      <span>현재 정책 매각률 적용</span>
                    </div>

                    <div className="jail-fine-modal__assets">
                      {propertyAssets.map(
                        ({
                          property,
                          ownership,
                          currentLandPrice,
                          currentValue,
                          salePrice,
                        }) => (
                          <article
                            className="jail-fine-card"
                            key={property.id}
                          >
                            <div>
                              <strong>{property.name}</strong>
                              <span>
                                {getDevelopmentStageLabel(
                                  ownership.stage,
                                )}
                                {" · "}현재가{" "}
                                {formatMoney(currentLandPrice)}
                                {" · "}평가액{" "}
                                {formatMoney(currentValue)}
                              </span>
                            </div>

                            <div className="jail-fine-card__action">
                              <span>
                                매각 {formatMoney(salePrice)}
                              </span>
                              <button
                                type="button"
                                disabled={!canInteract}
                                onClick={() =>
                                  onSellProperty(property.id) 
                                }
                              >
                                매각
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                )}

                {!hasAnyAsset && (
                  <div className="jail-fine-modal__empty">
                    정리할 수 있는 주식이나 부동산이 없습니다.
                  </div>
                )}

                {canDeclareBankruptcy && (
                  <button
                    type="button"
                    className="jail-fine-modal__bankruptcy"
                    disabled={!canInteract}
                    onClick={onDeclareBankruptcy}
                  >
                    남은 현금 몰수 후 파산 처리
                  </button>
                )}
              </section>
            </>
          )}

          {errorMessage && (
            <p className="jail-fine-modal__error" role="alert">
              {errorMessage}
            </p>
          )}

          <div
            className="jail-fine-modal__release-stamp"
            aria-hidden="true"
          >
            <span>RELEASE</span>
            <strong>출소 승인</strong>
            <small>ULSAN MARBLE</small>
          </div>
        </div>

        <div className="jail-fine-modal__door" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>
    </div>
  );
}
