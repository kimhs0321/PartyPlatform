import type {
  StockMarketCycle,
} from "./stockTypes";

import type {
  StockDividendCredit,
} from "./stockDividend";

export type StockMarketResolutionMode =
  | "SCHEDULED"
  | "DEV";

export interface PendingStockMarketResolution {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  cycle: StockMarketCycle;
  mode: StockMarketResolutionMode;
  dividendCredits: StockDividendCredit[];

  additionallyDisabledPlayerIds:
    string[];
}