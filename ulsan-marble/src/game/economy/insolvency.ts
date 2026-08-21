import type { SellablePropertyAsset } from "../property/propertySale";
import type { SellableStockAsset } from "../stock/stockLiquidation";
import { getStockLiquidationValue } from "../stock/stockLiquidation";

export function getPropertyLiquidationValue(
  assets: SellablePropertyAsset[],
): number {
  return assets.reduce((total, asset) => total + asset.salePrice, 0);
}

export function getCombinedLiquidationValue(
  propertyAssets: SellablePropertyAsset[],
  stockAssets: SellableStockAsset[],
): number {
  return (
    getPropertyLiquidationValue(propertyAssets) +
    getStockLiquidationValue(stockAssets)
  );
}

export function getDebtShortfall(
  currentMoney: number,
  amountDue: number,
): number {
  return Math.max(0, amountDue - currentMoney);
}

export function canCoverDebtAfterLiquidation(
  currentMoney: number,
  amountDue: number,
  propertyAssets: SellablePropertyAsset[],
  stockAssets: SellableStockAsset[],
): boolean {
  return (
    currentMoney +
      getCombinedLiquidationValue(propertyAssets, stockAssets) >=
    amountDue
  );
}
