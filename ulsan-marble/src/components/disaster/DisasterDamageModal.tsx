import type {
  DisasterLiquidationError,
  DisasterPaymentError,
  DisasterPlayerAssessment,
} from "../../game/disaster/disasterTypes";
import { getDevelopmentStageLabel } from "../../game/property/propertyDevelopment";
import { INSURANCE_PLANS } from "../../game/insurance/insuranceRules";
import type { SellablePropertyAsset } from "../../game/property/propertySale";
import type { SellableStockAsset } from "../../game/stock/stockLiquidation";
import type { PlayerTokenData } from "../PlayerToken";
import { StockLiquidationList } from "../StockLiquidationList";
import "./DisasterDamageModal.css";

interface DisasterDamageModalProps {
  disasterName: string | null;
  assessment: DisasterPlayerAssessment | null;
  player: PlayerTokenData | null;
  currentNumber: number;
  totalCount: number;
  shortfall: number;
  liquidationValue: number;
  propertyAssets: SellablePropertyAsset[];
  stockAssets: SellableStockAsset[];
  canPay: boolean;
  canCoverAfterLiquidation: boolean;
  canDeclareBankruptcy: boolean;
  canInteract: boolean;
  paymentError: DisasterPaymentError | null;
  liquidationError: DisasterLiquidationError | null;
  onPay: () => void;
  onSellProperty: (propertyId: string) => void;
  onSellStock: (companyId: string, quantity: number) => void;
  onDeclareBankruptcy: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(
  paymentError: DisasterPaymentError | null,
  liquidationError: DisasterLiquidationError | null,
): string | null {
  switch (paymentError) {
    case "NO_PENDING_DISASTER":
      return "처리할 재난 피해가 없습니다.";
    case "PLAYER_NOT_FOUND":
      return "피해 플레이어 정보를 찾지 못했습니다.";
    case "INSUFFICIENT_FUNDS":
      return "현금이 부족합니다. 보유 자산을 정리해야 합니다.";
    case "PAYMENT_FAILED":
      return "복구비 납부 중 오류가 발생했습니다.";
  }

  switch (liquidationError) {
    case "NO_PENDING_DISASTER":
      return "처리할 재난 피해가 없습니다.";
    case "PROPERTY_NOT_OWNED":
      return "매각할 부동산 소유 정보를 찾지 못했습니다.";
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

export function DisasterDamageModal({
  disasterName,
  assessment,
  player,
  currentNumber,
  totalCount,
  shortfall,
  liquidationValue,
  propertyAssets,
  stockAssets,
  canPay,
  canCoverAfterLiquidation,
  canDeclareBankruptcy,
  canInteract,
  paymentError,
  liquidationError,
  onPay,
  onSellProperty,
  onSellStock,
  onDeclareBankruptcy,
}: DisasterDamageModalProps) {
  if (!assessment || !player || !disasterName) return null;

  const errorMessage = getErrorMessage(paymentError, liquidationError);
  const hasAssets = propertyAssets.length > 0 || stockAssets.length > 0;

  return (
    <div className="disaster-settlement-overlay">
      <section
        className="disaster-settlement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disaster-settlement-title"
      >
        <div className="disaster-settlement-modal__eyebrow">
          {disasterName} 복구비 · {currentNumber}/{totalCount}
        </div>

        <div className="disaster-settlement-modal__heading">
          <div>
            <h2 id="disaster-settlement-title">재난 피해 정산</h2>
            <p>{player.name}의 피해 부동산 복구비입니다.</p>
          </div>
          <span
            style={{ ["--player-color" as string]: player.color }}
            className="disaster-settlement-modal__token"
          >
            {player.shortName}
          </span>
        </div>

        <div className="disaster-settlement-modal__damages">
          {assessment.damages.map((damage) => (
            <article key={damage.propertyId}>
              <div>
                <strong>{damage.propertyName}</strong>
                <span>
                  {damage.stage ? getDevelopmentStageLabel(damage.stage) : "토지"}
                  {damage.insuranceCoverage > 0 && damage.insurancePlanType
                    ? ` · ${INSURANCE_PLANS[damage.insurancePlanType].name} 보상 ${formatMoney(damage.insuranceCoverage)}`
                    : " · 보험 없음"}
                </span>
              </div>
              <b>{formatMoney(damage.finalRepairCost)}</b>
            </article>
          ))}
        </div>

        <dl className="disaster-settlement-modal__summary">
          <div>
            <dt>현재 현금</dt>
            <dd>{formatMoney(player.money)}</dd>
          </div>
          <div>
            <dt>복구비</dt>
            <dd className="is-repair">{formatMoney(assessment.totalAmount)}</dd>
          </div>
          {!canPay && (
            <>
              <div>
                <dt>부족 금액</dt>
                <dd className="is-shortfall">{formatMoney(shortfall)}</dd>
              </div>
              <div>
                <dt>전체 정리 가능액</dt>
                <dd>{formatMoney(liquidationValue)}</dd>
              </div>
            </>
          )}
        </dl>

        {canPay ? (
          <button
            type="button"
            className="disaster-settlement-modal__pay"
            onClick={onPay}
          >
            {formatMoney(assessment.totalAmount)} 납부
          </button>
        ) : (
          <>
            <div
              className={`disaster-settlement-modal__notice${
                canCoverAfterLiquidation ? "" : " is-bankruptcy-risk"
              }`}
            >
              {canCoverAfterLiquidation
                ? "필요한 만큼 자산을 정리하면 복구비를 납부할 수 있습니다."
                : "모든 자산을 정리해도 복구비가 부족해 파산할 수 있습니다."}
            </div>

            <StockLiquidationList
              assets={stockAssets}
              onSellStock={onSellStock}
              disabled={!canInteract}
              disabledMessage="현재 정산 플레이어만 매도할 수 있습니다."
            />

            {propertyAssets.length > 0 && (
              <section className="disaster-settlement-property-section">
                <div className="disaster-settlement-property-section__title">
                  <strong>보유 부동산</strong>
                  <span>현재 정책의 매각률 적용</span>
                </div>

                <div className="disaster-settlement-modal__assets">
                  {propertyAssets.map(
                    ({ property, ownership, currentValue, salePrice }) => (
                      <article key={property.id}>
                        <div>
                          <strong>{property.name}</strong>
                          <span>
                            {getDevelopmentStageLabel(ownership.stage)} · 평가액 {formatMoney(currentValue)}
                          </span>
                        </div>
                        <div>
                          <span>매각 {formatMoney(salePrice)}</span>
                          <button
                            type="button"
                            disabled={!canInteract}
                            onClick={() => onSellProperty(property.id)}
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

            {!hasAssets && (
              <div className="disaster-settlement-modal__empty">
                정리할 수 있는 주식이나 부동산이 없습니다.
              </div>
            )}
          </>
        )}

        {errorMessage && (
          <p className="disaster-settlement-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        {canDeclareBankruptcy && (
          <button
            type="button"
            className="disaster-settlement-modal__bankruptcy"
            disabled={!canInteract}
            onClick={onDeclareBankruptcy}
          >
            남은 현금 정산 후 파산 처리
          </button>
        )}
      </section>
    </div>
  );
}
