import type { DistrictId } from "../../types";

export type EconomicNewsTone =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL";

export type EconomicNewsSource =
  | "NEWSPAPER"
  | "RANDOM"
  | "DEV";

export type EconomicNewsEffect =
  | {
      type: "STOCK_INDUSTRY_BIAS";
      industryId: string;
      changeBias: number;
    }
  | {
      type: "PROPERTY_DISTRICT_BIAS";
      districtId: DistrictId;
      changeBias: number;
    }
  | {
      type: "CONSTRUCTION_COST";
      multiplier: number;
    }
  | {
      type: "TOLL";
      multiplier: number;
    }
  | {
      type: "PORT_SUCCESS";
      chanceDelta: number;
    }
  | {
      type: "BANK_INTEREST";
      multiplier: number;
    }
  | {
      type: "DEVELOPMENT_RESTRICTION";
      durationTurns: number;
      target: "RANDOM_DEVELOPABLE_PROPERTY";
    };

export interface EconomicNewsDefinition {
  id: string;
  headline: string;
  summary: string;
  effectDescription: string;
  tone: EconomicNewsTone;
  durationTurns: number;
  effect: EconomicNewsEffect;
}

export interface ActiveEconomicNews {
  instanceId: string;
  definition: EconomicNewsDefinition;
  source: EconomicNewsSource;
  publishedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
}

export interface EconomicNewsHistoryEntry {
  instanceId: string;
  definitionId: string;
  headline: string;
  source: EconomicNewsSource;
  publishedTurn: number;
  activeFromTurn: number;
  expiresAfterTurn: number;
}

export interface EconomicNewsState {
  drawPile: string[];
  discardPile: string[];
  cycle: number;
  activeNews: ActiveEconomicNews[];
  history: EconomicNewsHistoryEntry[];
  lastRandomPublishedTurn: number | null;
}

export type EconomicNewsResolutionStage =
  | "DRAWN"
  | "APPLIED";

export interface PendingEconomicNewsResolution {
  resolutionId: string;

  controllerPlayerId: string;
  playerId: string | null;

  article: EconomicNewsDefinition;
  source: EconomicNewsSource;

  turnNumber: number;
  turnSequence: number;

  stage: EconomicNewsResolutionStage;
  resultText: string | null;

  additionallyDisabledPlayerIds: string[];
}