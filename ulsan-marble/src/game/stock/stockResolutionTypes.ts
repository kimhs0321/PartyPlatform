import type {
  StockMarketCycle,
} from "./stockTypes";

export type StockMarketResolutionMode =
  | "SCHEDULED"
  | "DEV";

export interface PendingStockMarketResolution {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  cycle: StockMarketCycle;
  mode: StockMarketResolutionMode;

  additionallyDisabledPlayerIds:
    string[];
}