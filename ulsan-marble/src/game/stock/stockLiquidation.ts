import type {
  StockCompanyData,
  StockHolding,
  StockMarketMap,
  StockPortfolioMap,
} from "./stockTypes";
import { getStockPrice } from "./stockMarket";

export interface SellableStockAsset {
  company: StockCompanyData;
  holding: StockHolding;
  currentPrice: number;
  marketValue: number;
  profitLoss: number;
  profitLossRate: number;
}

export function getSellableStockAssets(
  portfolios: StockPortfolioMap,
  companies: StockCompanyData[],
  market: StockMarketMap,
  playerId: string,
): SellableStockAsset[] {
  const portfolio = portfolios[playerId] ?? {};
  const companyMap = new Map(
    companies.map((company) => [company.id, company]),
  );

  return Object.values(portfolio)
    .filter((holding) => holding.quantity > 0)
    .map((holding) => {
      const company = companyMap.get(holding.companyId);
      if (!company) return null;

      const currentPrice = getStockPrice(market, holding.companyId);
      if (currentPrice <= 0) return null;

      const marketValue = currentPrice * holding.quantity;
      const profitLoss = marketValue - holding.totalPurchaseCost;
      const profitLossRate =
        holding.totalPurchaseCost > 0
          ? profitLoss / holding.totalPurchaseCost
          : 0;

      return {
        company,
        holding,
        currentPrice,
        marketValue,
        profitLoss,
        profitLossRate,
      } satisfies SellableStockAsset;
    })
    .filter((asset): asset is SellableStockAsset => asset !== null)
    .sort((first, second) => second.marketValue - first.marketValue);
}

export function getStockLiquidationValue(
  assets: SellableStockAsset[],
): number {
  return assets.reduce((total, asset) => total + asset.marketValue, 0);
}
