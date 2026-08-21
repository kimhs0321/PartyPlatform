import type {
  StockCompanyData,
  StockIndustryData,
  StockMarketCycle,
  StockMarketMap,
  StockMarketMover,
  StockPortfolioMap,
} from "./stockTypes";

const INDUSTRY_CHANGE_MIN = -0.04;
const INDUSTRY_CHANGE_MAX = 0.04;
const FINAL_CHANGE_MIN = -0.2;
const FINAL_CHANGE_MAX = 0.2;
const MINIMUM_STOCK_PRICE = 1;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function randomBetween(
  minimum: number,
  maximum: number,
  random: () => number = Math.random,
): number {
  return minimum + random() * (maximum - minimum);
}

function roundRate(rate: number): number {
  return Math.round(rate * 1000) / 1000;
}


export interface StockMarketCycleOptions {
  volatilityMultiplier?: number;
  industryChangeBiases?: Record<string, number>;
  minimumFinalChangeRate?: number;
  random?: () => number;
}

export function createInitialStockMarket(
  companies: StockCompanyData[],
): StockMarketMap {
  return Object.fromEntries(
    companies.map((company) => [
      company.id,
      {
        companyId: company.id,
        currentPrice: company.basePrice,
        previousPrice: company.basePrice,
        lastChangeRate: 0,
        lastIndustryChangeRate: 0,
        lastCompanyChangeRate: 0,
        status: company.statusAtStart,
      },
    ]),
  );
}

export function createInitialStockPortfolios(
  playerIds: string[],
): StockPortfolioMap {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, {}]));
}

export function getStockQuote(
  market: StockMarketMap,
  companyId: string,
) {
  return market[companyId] ?? null;
}

export function getStockPrice(
  market: StockMarketMap,
  companyId: string,
): number {
  return market[companyId]?.currentPrice ?? 0;
}

export function getHeldShareCount(
  portfolios: StockPortfolioMap,
  companyId: string,
): number {
  return Object.values(portfolios).reduce(
    (total, portfolio) => total + (portfolio[companyId]?.quantity ?? 0),
    0,
  );
}

export function getAvailableShareCount(
  company: StockCompanyData,
  portfolios: StockPortfolioMap,
): number {
  return Math.max(
    0,
    company.totalShares - getHeldShareCount(portfolios, company.id),
  );
}

export function getPortfolioMarketValue(
  portfolio: StockPortfolioMap[string] | undefined,
  market: StockMarketMap,
): number {
  if (!portfolio) return 0;

  return Object.values(portfolio).reduce(
    (total, holding) =>
      total + holding.quantity * getStockPrice(market, holding.companyId),
    0,
  );
}

export function createStockMarketCycle(
  industries: StockIndustryData[],
  companies: StockCompanyData[],
  currentMarket: StockMarketMap,
  turnNumber: number,
  options: StockMarketCycleOptions = {},
): { market: StockMarketMap; cycle: StockMarketCycle } {
  const volatilityMultiplier = Math.max(
    0,
    options.volatilityMultiplier ?? 1,
  );
  const random = options.random ?? Math.random;
  const industryChangeBiases = options.industryChangeBiases ?? {};
  const minimumFinalChangeRate = clamp(
    options.minimumFinalChangeRate ?? FINAL_CHANGE_MIN,
    FINAL_CHANGE_MIN,
    FINAL_CHANGE_MAX,
  );
  const industryRateMap = new Map<string, number>();

  for (const industry of industries) {
    industryRateMap.set(
      industry.id,
      roundRate(
        clamp(
          randomBetween(
            INDUSTRY_CHANGE_MIN * volatilityMultiplier,
            INDUSTRY_CHANGE_MAX * volatilityMultiplier,
            random,
          ) + (industryChangeBiases[industry.id] ?? 0),
          -0.12,
          0.12,
        ),
      ),
    );
  }

  const nextMarket: StockMarketMap = {};
  const movers: StockMarketMover[] = [];

  for (const company of companies) {
    const previousQuote = currentMarket[company.id];
    const previousPrice = previousQuote?.currentPrice ?? company.basePrice;
    const industryChangeRate = industryRateMap.get(company.industry) ?? 0;
    const companyChangeRate = roundRate(
      randomBetween(
        company.randomPriceChangeRange.min * volatilityMultiplier,
        company.randomPriceChangeRange.max * volatilityMultiplier,
        random,
      ),
    );
    const finalChangeRate = roundRate(
      clamp(
        industryChangeRate + companyChangeRate,
        minimumFinalChangeRate,
        FINAL_CHANGE_MAX,
      ),
    );
    const currentPrice = Math.max(
      MINIMUM_STOCK_PRICE,
      Math.round(previousPrice * (1 + finalChangeRate)),
    );

    nextMarket[company.id] = {
      companyId: company.id,
      previousPrice,
      currentPrice,
      lastChangeRate: finalChangeRate,
      lastIndustryChangeRate: industryChangeRate,
      lastCompanyChangeRate: companyChangeRate,
      status: previousQuote?.status ?? company.statusAtStart,
    };

    movers.push({
      companyId: company.id,
      companyName: company.name,
      ticker: company.ticker,
      industryId: company.industry,
      previousPrice,
      currentPrice,
      changeRate: finalChangeRate,
    });
  }

  const sortedMovers = [...movers].sort(
    (first, second) => second.changeRate - first.changeRate,
  );

  return {
    market: nextMarket,
    cycle: {
      turnNumber,
      industryTrends: industries.map((industry) => ({
        industryId: industry.id,
        changeRate: industryRateMap.get(industry.id) ?? 0,
      })),
      movers,
      topGainers: sortedMovers.slice(0, 3),
      topLosers: sortedMovers.slice(-3).reverse(),
    },
  };
}
