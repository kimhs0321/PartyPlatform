export type StockArchetype =
  | "STABLE"
  | "BALANCED"
  | "GROWTH"
  | "SPECULATIVE";

export type StockStatus =
  | "NORMAL"
  | "MANAGEMENT"
  | "TRADING_HALT"
  | "DELISTED";

export interface StockIndustryData {
  id: string;
  name: string;
}

export interface StockCompanyData {
  id: string;
  name: string;
  ticker: string;
  industry: string;
  archetype: StockArchetype;
  basePrice: number;
  totalShares: number;
  volatility: number;
  dividendRatePerSettlement: number;
  stability: number;
  managementThresholdRate: number;
  delistingThresholdRate: number;
  statusAtStart: StockStatus;
  businessSummary: string;
  mainBusinesses: string[];
  strengths: string[];
  risks: string[];
  positiveNews: string[];
  negativeNews: string[];
  sensitivity: Record<string, number>;
  growthPotential: number;
  debtRisk: number;
  dividendReliability: number;
  randomPriceChangeRange: {
    min: number;
    max: number;
  };
  marketRole: string;
}

export interface CompaniesData {
  id: string;
  name: string;
  version: number;
  currencyUnit: string;
  rules: {
    companyCount: number;
    industryCount: number;
    companiesPerIndustry: number;
    priceChangeInterval: string;
    tradingTiming: string;
    marketSharesOnly: boolean;
    tradeVolumeSystemEnabled: boolean;
    orderBookSystemEnabled: boolean;
    priceRoundingUnit: number;
    minimumStockPrice: number;
    dividendIntervalTurns: number;
  };
  industries: StockIndustryData[];
  companies: StockCompanyData[];
}

export interface StockQuote {
  companyId: string;
  currentPrice: number;
  previousPrice: number;
  lastChangeRate: number;
  lastIndustryChangeRate: number;
  lastCompanyChangeRate: number;
  status: StockStatus;
}

export type StockMarketMap = Record<string, StockQuote>;

export interface StockIndustryTrend {
  industryId: string;
  changeRate: number;
}

export interface StockMarketMover {
  companyId: string;
  companyName: string;
  ticker: string;
  industryId: string;
  previousPrice: number;
  currentPrice: number;
  changeRate: number;
}

export interface StockMarketCycle {
  turnNumber: number;
  industryTrends: StockIndustryTrend[];
  movers: StockMarketMover[];
  topGainers: StockMarketMover[];
  topLosers: StockMarketMover[];
}

export interface StockHolding {
  companyId: string;
  quantity: number;
  averagePurchasePrice: number;
  totalPurchaseCost: number;
}

export type PlayerStockPortfolio = Record<string, StockHolding>;
export type StockPortfolioMap = Record<string, PlayerStockPortfolio>;

export type StockTradeError =
  | "NOT_TRADING_PHASE"
  | "COMPANY_NOT_FOUND"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_SHARES"
  | "INSUFFICIENT_HOLDING"
  | "TRADING_UNAVAILABLE";
