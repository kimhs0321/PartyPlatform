import { useEffect, useMemo, useState } from "react";
import "./StockLiquidationList.css";

import type { SellableStockAsset } from "../game/stock/stockLiquidation";

interface StockLiquidationListProps {
  assets: SellableStockAsset[];
  onSellStock: (companyId: string, quantity: number) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

function formatMoney(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

export function StockLiquidationList({
  assets,
  onSellStock,
  disabled = false,
  disabledMessage = "현재가 기준 즉시 매도",
}: StockLiquidationListProps) {
  const initialQuantities = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.company.id, "1"])),
    [assets],
  );
  const [quantityInputs, setQuantityInputs] =
    useState<Record<string, string>>(initialQuantities);

  useEffect(() => {
    setQuantityInputs((current) => {
      const next: Record<string, string> = {};

      for (const asset of assets) {
        const currentValue = current[asset.company.id] ?? "1";
        const safeValue = Math.min(
          Math.max(Math.trunc(Number(currentValue) || 1), 1),
          asset.holding.quantity,
        );
        next[asset.company.id] = String(safeValue);
      }

      return next;
    });
  }, [assets]);

  const getQuantity = (asset: SellableStockAsset): number => {
    const parsed = Math.trunc(Number(quantityInputs[asset.company.id] ?? "1"));

    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), asset.holding.quantity);
  };

  const updateQuantity = (companyId: string, value: string) => {
    setQuantityInputs((current) => ({
      ...current,
      [companyId]: value,
    }));
  };

  if (assets.length === 0) return null;

  return (
    <section className="stock-liquidation-section">
      <div className="stock-liquidation-section__title">
        <strong>보유 주식</strong>
        <span>{disabled ? disabledMessage : "현재가 기준 즉시 매도"}</span>
      </div>

      <div className="stock-liquidation-list">
        {assets.map((asset) => {
          const quantity = getQuantity(asset);
          const proceeds = quantity * asset.currentPrice;
          const profitClass =
            asset.profitLoss > 0
              ? "is-profit"
              : asset.profitLoss < 0
                ? "is-loss"
                : "";

          return (
            <article className="stock-liquidation-card" key={asset.company.id}>
              <div className="stock-liquidation-card__info">
                <strong>
                  {asset.company.name}
                  <small>{asset.company.ticker}</small>
                </strong>
                <span>
                  {asset.holding.quantity.toLocaleString("ko-KR")}주 보유 · 평균
                  매입가 {formatMoney(asset.holding.averagePurchasePrice)} ·
                  현재가 {formatMoney(asset.currentPrice)}
                </span>
                <span className={profitClass}>
                  평가액 {formatMoney(asset.marketValue)} · 평가손익{" "}
                  {formatMoney(asset.profitLoss)} · 수익률{" "}
                  {formatRate(asset.profitLossRate)}
                </span>
              </div>

              <div className="stock-liquidation-card__controls">
                <div className="stock-liquidation-card__quick-buttons">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => updateQuantity(asset.company.id, "1")}
                  >
                    1주
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateQuantity(
                        asset.company.id,
                        String(asset.holding.quantity),
                      )
                    }
                  >
                    전량
                  </button>
                </div>

                <label>
                  <span>매도 수량</span>
                  <input
                    type="number"
                    min={1}
                    max={asset.holding.quantity}
                    step={1}
                    value={quantityInputs[asset.company.id] ?? "1"}
                    disabled={disabled}
                    onChange={(event) =>
                      updateQuantity(asset.company.id, event.target.value)
                    }
                  />
                </label>

                <div className="stock-liquidation-card__sell">
                  <span>{formatMoney(proceeds)}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSellStock(asset.company.id, quantity)}
                  >
                    매도
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
