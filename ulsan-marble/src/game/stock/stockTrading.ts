import type {
  PlayerStockPortfolio,
  StockCompanyData,
  StockHolding,
  StockPortfolioMap,
} from "./stockTypes";

export function getPlayerStockPortfolio(
  portfolios: StockPortfolioMap,
  playerId: string,
): PlayerStockPortfolio {
  return portfolios[playerId] ?? {};
}

export function getStockHolding(
  portfolios: StockPortfolioMap,
  playerId: string,
  companyId: string,
): StockHolding | null {
  return portfolios[playerId]?.[companyId] ?? null;
}

export function buyStockHolding(
  portfolios: StockPortfolioMap,
  playerId: string,
  company: StockCompanyData,
  quantity: number,
  pricePerShare: number,
): StockPortfolioMap {
  const currentPortfolio = portfolios[playerId] ?? {};
  const currentHolding = currentPortfolio[company.id];
  const purchaseCost = quantity * pricePerShare;
  const currentQuantity = currentHolding?.quantity ?? 0;
  const currentCost = currentHolding?.totalPurchaseCost ?? 0;
  const nextQuantity = currentQuantity + quantity;
  const nextCost = currentCost + purchaseCost;

  return {
    ...portfolios,
    [playerId]: {
      ...currentPortfolio,
      [company.id]: {
        companyId: company.id,
        quantity: nextQuantity,
        totalPurchaseCost: nextCost,
        averagePurchasePrice: Math.round(nextCost / nextQuantity),
      },
    },
  };
}

export function sellStockHolding(
  portfolios: StockPortfolioMap,
  playerId: string,
  companyId: string,
  quantity: number,
): StockPortfolioMap {
  const currentPortfolio = portfolios[playerId] ?? {};
  const currentHolding = currentPortfolio[companyId];

  if (!currentHolding) return portfolios;

  const nextQuantity = currentHolding.quantity - quantity;
  const nextPortfolio = { ...currentPortfolio };

  if (nextQuantity <= 0) {
    delete nextPortfolio[companyId];
  } else {
    nextPortfolio[companyId] = {
      ...currentHolding,
      quantity: nextQuantity,
      totalPurchaseCost:
        currentHolding.averagePurchasePrice * nextQuantity,
    };
  }

  return {
    ...portfolios,
    [playerId]: nextPortfolio,
  };
}
