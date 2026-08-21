import "./TaxAssetLiquidationModal.css";

import type {
  TaxAssessment,
  TaxLiquidationError,
} from "../game/economy/taxTypes";
import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type { SellablePropertyAsset } from "../game/property/propertySale";
import type { SellableStockAsset } from "../game/stock/stockLiquidation";
import type { PlayerTokenData } from "./PlayerToken";
import { StockLiquidationList } from "./StockLiquidationList";

interface TaxAssetLiquidationModalProps {
  assessment: TaxAssessment | null;
  player: PlayerTokenData | null;
  currentNumber: number;
  totalCount: number;
  shortfall: number;
  liquidationValue: number;
  propertyAssets: SellablePropertyAsset[];
  stockAssets: SellableStockAsset[];
  canCoverAfterLiquidation: boolean;
  canDeclareBankruptcy: boolean;
  canInteract: boolean;
  error: TaxLiquidationError | null;
  onSellProperty: (propertyId: string) => void;
  onSellStock: (companyId: string, quantity: number) => void;
  onDeclareBankruptcy: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(
  error: TaxLiquidationError | null,
): string | null {
  switch (error) {
    case "NO_PENDING_TAX":
      return "처리할 미납 세금이 없습니다.";
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

export function TaxAssetLiquidationModal({
  assessment,
  player,
  currentNumber,
  totalCount,
  shortfall,
  liquidationValue,
  propertyAssets,
  stockAssets,
  canCoverAfterLiquidation,
  canDeclareBankruptcy,
  canInteract,
  error,
  onSellProperty,
  onSellStock,
  onDeclareBankruptcy,
}: TaxAssetLiquidationModalProps) {
  if (!assessment || !player) return null;

  const errorMessage = getErrorMessage(error);
  const hasAnyAsset = propertyAssets.length > 0 || stockAssets.length > 0;

  return (
    <div className="tax-liquidation-overlay">
      <section
        className="tax-liquidation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-liquidation-title"
      >
        <div className="tax-liquidation-modal__eyebrow">
          {assessment.settlementTurn}턴 정기 세금 · {currentNumber}/{totalCount}
        </div>

        <h2 id="tax-liquidation-title">세금 납부 자금 부족</h2>
        <p className="tax-liquidation-modal__description">
          <strong>{player.name}</strong>은 세금을 납부하려면 주식이나
          부동산을 매각해야 합니다.
        </p>

        <dl className="tax-liquidation-modal__summary">
          <div>
            <dt>현재 현금</dt>
            <dd>{formatMoney(player.money)}</dd>
          </div>
          <div>
            <dt>납부할 세금</dt>
            <dd>{formatMoney(assessment.totalAmount)}</dd>
          </div>
          <div>
            <dt>부족 금액</dt>
            <dd className="is-shortfall">{formatMoney(shortfall)}</dd>
          </div>
          <div>
            <dt>전체 정리 가능액</dt>
            <dd>{formatMoney(liquidationValue)}</dd>
          </div>
        </dl>

        <div
          className={`tax-liquidation-modal__notice${
            canCoverAfterLiquidation
              ? ""
              : " is-bankruptcy-risk"
          }`}
        >
          {!canInteract
            ? `${player.name}님의 세금 처리를 기다리는 중입니다.`
            : canCoverAfterLiquidation
              ? "필요한 만큼 자산을 정리하면 세금 납부 화면으로 전환됩니다."
              : "모든 자산을 정리해도 세금이 부족해 파산할 수 있습니다."}
        </div>

        <StockLiquidationList
          assets={stockAssets}
          disabled={!canInteract}
          disabledMessage={`${player.name}님의 세금 처리를 기다리는 중`}
          onSellStock={onSellStock}
        />

        {propertyAssets.length > 0 && (
          <section className="tax-liquidation-property-section">
            <div className="tax-liquidation-property-section__title">
              <strong>보유 부동산</strong>
              <span>현재 평가액의 90%로 매각</span>
            </div>

            <div className="tax-liquidation-modal__assets">
              {propertyAssets.map(
                ({
                  property,
                  ownership,
                  currentLandPrice,
                  currentValue,
                  salePrice,
                }) => (
                  <article className="tax-liquidation-card" key={property.id}>
                    <div className="tax-liquidation-card__info">
                      <strong>{property.name}</strong>
                      <span>
                        {getDevelopmentStageLabel(ownership.stage)} · 현재가 {" "}
                        {formatMoney(currentLandPrice)} · 평가액 {" "}
                        {formatMoney(currentValue)}
                      </span>
                    </div>

                    <div className="tax-liquidation-card__action">
                      <span>매각 {formatMoney(salePrice)}</span>
                      <button
                        type="button"
                        disabled={!canInteract}
                        onClick={() =>
                          onSellProperty(
                            property.id,
                          )
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
          <div className="tax-liquidation-modal__empty">
            정리할 수 있는 주식이나 부동산이 없습니다.
          </div>
        )}

        {errorMessage && (
          <p className="tax-liquidation-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        {canDeclareBankruptcy && (
          <button
            type="button"
            className="tax-liquidation-modal__bankruptcy"
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
