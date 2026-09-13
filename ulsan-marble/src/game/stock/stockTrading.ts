import type {
  PlayerStockPortfolio,
  StockCompanyData,
  StockHolding,
  StockPortfolioMap,
} from "./stockTypes";

export const STOCK_TRANSACTION_FEE_RATE = 0.01;

export function getStockTradeGrossAmount(
  pricePerShare: number,
  quantity: number,
): number {
  return (
    Math.max(0, pricePerShare) *
    Math.max(0, Math.trunc(quantity))
  );
}

export function getStockTradeFee(
  pricePerShare: number,
  quantity: number,
): number {
  return Math.round(
    getStockTradeGrossAmount(
      pricePerShare,
      quantity,
    ) * STOCK_TRANSACTION_FEE_RATE,
  );
}

export function getStockBuyTotalCost(
  pricePerShare: number,
  quantity: number,
): number {
  const grossAmount =
    getStockTradeGrossAmount(
      pricePerShare,
      quantity,
    );

  return (
    grossAmount +
    getStockTradeFee(
      pricePerShare,
      quantity,
    )
  );
}

export function getStockSellNetProceeds(
  pricePerShare: number,
  quantity: number,
): number {
  const grossAmount =
    getStockTradeGrossAmount(
      pricePerShare,
      quantity,
    );

  return Math.max(
    0,
    grossAmount -
      getStockTradeFee(
        pricePerShare,
        quantity,
      ),
  );
}

export function getMaxAffordableStockQuantity(
  money: number,
  pricePerShare: number,
  availableShares: number,
): number {
  if (
    money <= 0 ||
    pricePerShare <= 0 ||
    availableShares <= 0
  ) {
    return 0;
  }

  let quantity = Math.min(
    availableShares,
    Math.floor(money / pricePerShare),
  );

  while (
    quantity > 0 &&
    getStockBuyTotalCost(
      pricePerShare,
      quantity,
    ) > money
  ) {
    quantity -= 1;
  }

  return quantity;
}

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
  const purchaseCost = getStockBuyTotalCost(pricePerShare,quantity,);
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
