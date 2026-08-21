import type { BoardTileType } from "../../types";

export type GoldenKeyCategory = "POSITIVE" | "SITUATION" | "NEGATIVE";

export type GoldenKeyPoolGroup =
  | "CASH_SUPPORT"
  | "COST_LOSS"
  | "MOVEMENT"
  | "PROPERTY"
  | "STOCK";

export type GoldenKeyMarketScope =
  | "ALL"
  | "RANDOM_GROUP"
  | "RANDOM_ITEMS"
  | "PLAYER_OWNED";

export type GoldenKeyEffect =
  | {
      type: "CASH";
      amount: number;
    }
  | {
      type: "CASH_PERCENT";
      rate: number;
      maximumAmount: number;
    }
  | {
      type: "EACH_PLAYER_TRANSFER";
      direction: "FROM_OTHERS" | "TO_OTHERS";
      amountPerPlayer: number;
    }
  | {
      type: "ALL_PLAYERS_CASH";
      amount: number;
    }
  | {
      type: "PORTFOLIO_REWARD";
      rate: number;
      minimumAmount: number;
      maximumAmount: number;
    }
  | {
      type: "PROPERTY_REWARD";
      rate: number;
      minimumAmount: number;
      maximumAmount: number;
    }
  | {
      type: "PROPERTY_MARKET";
      rate: number;
      scope: GoldenKeyMarketScope;
      count?: number;
    }
  | {
      type: "STOCK_MARKET";
      rate: number;
      scope: GoldenKeyMarketScope;
      count?: number;
    }
  | {
      type: "MOVE_TO_TILE";
      tileId: number;
      grantSalary: boolean;
    }
  | {
      type: "MOVE_RELATIVE";
      steps: number;
    }
  | {
      type: "MOVE_RANDOM_PROPERTY";
      unownedOnly: boolean;
    }
  | {
      type: "MOVE_NEAREST_TILE_TYPE";
      tileType: BoardTileType;
    }
  | {
      type: "SWAP_WITH_NEXT_PLAYER";
    }
  | {
      type: "JAIL_ESCAPE_CARD";
      quantity: number;
    };

export interface GoldenKeyCard {
  id: string;
  category: GoldenKeyCategory;
  poolGroup: GoldenKeyPoolGroup;
  title: string;
  description: string;
  effect: GoldenKeyEffect;
}

export interface GoldenKeyDeckState {
  selectedCardIds: string[];
  drawPile: string[];
  discardPile: string[];
  cycle: number;
  lastDrawnCardId: string | null;
}

export interface GoldenKeyDrawResult {
  card: GoldenKeyCard;
  deck: GoldenKeyDeckState;
  reshuffled: boolean;
}

export type PendingGoldenKeyStage = "DRAWN" | "RESOLVED";

export interface PendingGoldenKeyResolution {
  playerId: string;
  card: GoldenKeyCard;
  stage: PendingGoldenKeyStage;
  resultText: string | null;
  followUpPosition: number | null;
}
