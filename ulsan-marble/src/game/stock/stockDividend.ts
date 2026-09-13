import { getStockPrice,} from "./stockMarket";

import type {
  StockCompanyData,
  StockMarketMap,
  StockPortfolioMap,
} from "./stockTypes";

import {getEffectiveCompanyDividendRate,} from "./companyDividendRules";

import type {CompanyDividendModifierMap,} from "./companyDividendTypes";

export const STOCK_DIVIDEND_INTERVAL_TURNS =
  5;

export interface StockDividendCredit {
  playerId: string;

  companyId: string;
  companyName: string;
  ticker: string;

  quantity: number;
  pricePerShare: number;
  dividendRate: number;

  amount: number;
}

export interface PlayerStockDividendSummary {
  playerId: string;

  credits: StockDividendCredit[];

  totalAmount: number;
}

export function isScheduledStockDividendTurn(
  turnNumber: number,
): boolean {
  const safeTurnNumber =
    Math.trunc(turnNumber);

  return (
    safeTurnNumber > 0 &&
    safeTurnNumber %
      STOCK_DIVIDEND_INTERVAL_TURNS ===
      0
  );
}

export function calculateStockDividends(
  turnNumber: number,
  companies: StockCompanyData[],
  market: StockMarketMap,
  portfolios: StockPortfolioMap,
  dividendModifiers: CompanyDividendModifierMap,
): StockDividendCredit[] {
  if (
    !isScheduledStockDividendTurn(
      turnNumber,
    )
  ) {
    return [];
  }

  const companyMap =
    new Map(
      companies.map(
        (company) => [
          company.id,
          company,
        ],
      ),
    );

  const credits:
    StockDividendCredit[] = [];

  for (
    const [
      playerId,
      portfolio,
    ] of Object.entries(portfolios)
  ) {
    for (
      const holding
      of Object.values(portfolio)
    ) {
      if (
        holding.quantity <= 0
      ) {
        continue;
      }

      const company =
        companyMap.get(
          holding.companyId,
        );

      if (!company) {
        continue;
      }

      const dividendRate =
        getEffectiveCompanyDividendRate(
          company,
          dividendModifiers[
            company.id
          ],
        );

      if (
        dividendRate <= 0
      ) {
        continue;
      }

      const pricePerShare =
        getStockPrice(
          market,
          company.id,
        );

      if (
        pricePerShare <= 0
      ) {
        continue;
      }

      const amount =
        Math.max(
          0,
          Math.round(
            holding.quantity *
              pricePerShare *
              dividendRate,
          ),
        );

      if (
        amount <= 0
      ) {
        continue;
      }

      credits.push({
        playerId,

        companyId:
          company.id,

        companyName:
          company.name,

        ticker:
          company.ticker,

        quantity:
          holding.quantity,

        pricePerShare,

        dividendRate,

        amount,
      });
    }
  }

  return credits;
}

export function getPlayerStockDividendSummary(
  credits: StockDividendCredit[],
  playerId: string,
): PlayerStockDividendSummary {
  const playerCredits =
    credits.filter(
      (credit) =>
        credit.playerId ===
        playerId,
    );

  return {
    playerId,

    credits:
      playerCredits,

    totalAmount:
      playerCredits.reduce(
        (
          total,
          credit,
        ) =>
          total +
          credit.amount,
        0,
      ),
  };
}

export function getStockDividendTotalAmount(
  credits: StockDividendCredit[],
): number {
  return credits.reduce(
    (
      total,
      credit,
    ) =>
      total +
      credit.amount,
    0,
  );
}