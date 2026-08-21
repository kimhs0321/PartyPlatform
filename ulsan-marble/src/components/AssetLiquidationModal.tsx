import "./AssetLiquidationModal.css";

import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type { SellablePropertyAsset } from "../game/property/propertySale";
import type { AssetLiquidationError } from "../game/property/propertyTypes";
import type { SellableStockAsset } from "../game/stock/stockLiquidation";
import type { PropertyData } from "../types";
import type { PlayerTokenData } from "./PlayerToken";
import { StockLiquidationList } from "./StockLiquidationList";

interface AssetLiquidationModalProps {
  debtProperty: PropertyData | null;
  districtName: string | null;
  payer: PlayerTokenData | null;
  owner: PlayerTokenData | null;
  amountDue: number;
  shortfall: number;
  liquidationValue: number;
  propertyAssets: SellablePropertyAsset[];
  stockAssets: SellableStockAsset[];
  canCoverAfterLiquidation: boolean;
  canDeclareBankruptcy: boolean;
  error: AssetLiquidationError | null;
  canUseExemptionItem?: boolean;
  onUseExemptionItem?: () => void;
  onSellProperty: (propertyId: string) => void;
  onSellStock: (companyId: string, quantity: number) => void;
  onDeclareBankruptcy: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(
  error: AssetLiquidationError | null,
): string | null {
  switch (error) {
    case "NO_PENDING_TOLL":
      return "처리할 미납 통행료가 없습니다.";
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
    case "OWNER_NOT_FOUND":
      return "통행료를 받을 소유자 정보를 찾지 못했습니다.";
    case "SALE_FAILED":
      return "자산 처리 중 오류가 발생했습니다.";
    default:
      return null;
  }
}

export function AssetLiquidationModal({
  debtProperty,
  districtName,
  payer,
  owner,
  amountDue,
  shortfall,
  liquidationValue,
  propertyAssets,
  stockAssets,
  canCoverAfterLiquidation,
  canDeclareBankruptcy,
  error,
  canUseExemptionItem = false,
  onUseExemptionItem,
  onSellProperty,
  onSellStock,
  onDeclareBankruptcy,
}: AssetLiquidationModalProps) {
  if (!debtProperty || !payer || !owner) return null;

  const errorMessage = getErrorMessage(error);
  const hasAnyAsset = propertyAssets.length > 0 || stockAssets.length > 0;

  return (
    <div className="asset-liquidation-overlay">
      <section
        className="asset-liquidation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-liquidation-title"
      >
        <div className="asset-liquidation-modal__eyebrow">
          {districtName ?? debtProperty.district} · 통행료 자금 부족
        </div>

        <h2 id="asset-liquidation-title">자산 정리</h2>

        <p className="asset-liquidation-modal__description">
          <strong>{debtProperty.name}</strong> 통행료를 납부하려면 주식이나
          부동산을 매각해야 합니다.
        </p>

        <dl className="asset-liquidation-modal__summary">
          <div>
            <dt>지불 플레이어</dt>
            <dd>{payer.name}</dd>
          </div>
          <div>
            <dt>통행료 수령자</dt>
            <dd>{owner.name}</dd>
          </div>
          <div>
            <dt>현재 현금</dt>
            <dd>{formatMoney(payer.money)}</dd>
          </div>
          <div>
            <dt>납부할 통행료</dt>
            <dd>{formatMoney(amountDue)}</dd>
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
          className={`asset-liquidation-modal__notice${
            canCoverAfterLiquidation ? "" : " is-bankruptcy-risk"
          }`}
        >
          {canCoverAfterLiquidation
            ? "필요한 만큼 자산을 정리하면 통행료 납부 화면으로 돌아갑니다."
            : "모든 자산을 정리해도 통행료가 부족해 파산할 수 있습니다."}
        </div>

        <StockLiquidationList
          assets={stockAssets}
          onSellStock={onSellStock}
        />

        {propertyAssets.length > 0 && (
          <section className="asset-liquidation-property-section">
            <div className="asset-liquidation-property-section__title">
              <strong>보유 부동산</strong>
              <span>현재 평가액의 90%로 매각</span>
            </div>

            <div className="asset-liquidation-modal__assets">
              {propertyAssets.map(
                ({
                  property,
                  ownership,
                  currentLandPrice,
                  currentValue,
                  salePrice,
                }) => (
                  <article
                    className="asset-liquidation-card"
                    key={property.id}
                  >
                    <div className="asset-liquidation-card__info">
                      <strong>{property.name}</strong>
                      <span>
                        {getDevelopmentStageLabel(ownership.stage)} · 현재가 {" "}
                        {formatMoney(currentLandPrice)} · 평가액 {" "}
                        {formatMoney(currentValue)}
                      </span>
                    </div>

                    <div className="asset-liquidation-card__action">
                      <span>매각 {formatMoney(salePrice)}</span>
                      <button
                        type="button"
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

        {!hasAnyAsset && (
          <div className="asset-liquidation-modal__empty">
            정리할 수 있는 주식이나 부동산이 없습니다.
          </div>
        )}

        {errorMessage && (
          <p className="asset-liquidation-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        {canUseExemptionItem && onUseExemptionItem && (
          <button
            type="button"
            className="asset-liquidation-modal__exemption"
            onClick={onUseExemptionItem}
          >
            통행료 면제권 사용
          </button>
        )}

        {canDeclareBankruptcy && (
          <button
            type="button"
            className="asset-liquidation-modal__bankruptcy"
            onClick={onDeclareBankruptcy}
          >
            남은 현금 정산 후 파산 처리
          </button>
        )}
      </section>
    </div>
  );
}
