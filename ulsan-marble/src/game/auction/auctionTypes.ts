import type { PropertyMarketCycle, PropertyMarketMap } from "../market/marketTypes";
import type { StockMarketCycle } from "../stock/stockTypes";

export type AuctionItemId =
  | "DICE_REROLL"
  | "TOLL_EXEMPTION"
  | "CONSTRUCTION_SUPPORT"
  | "TAX_DISCOUNT"
  | "DISASTER_SUPPORT"
  | "SAVINGS_GRACE"
  | "EMERGENCY_FLIGHT"
  | "TOLL_BOOST"
  | "PROPERTY_DEFENSE"
  | "PORT_CARGO_INSURANCE"
  | "DEPOSIT_BONUS"
  | "STOCK_LOSS_PROTECTION";

export type AuctionItemRarity = "COMMON" | "RARE";
export type AuctionItemUseMode = "AUTOMATIC" | "REACTION" | "TARGETED";

export interface AuctionItemDefinition {
  id: AuctionItemId;
  name: string;
  description: string;
  rarity: AuctionItemRarity;
  copies: number;
  useMode: AuctionItemUseMode;
}

export interface AuctionItemInstance {
  instanceId: string;
  itemId: AuctionItemId;
}

export type AuctionInventoryMap = Record<string, AuctionItemInstance[]>;

export interface AuctionDeckState {
  drawPile: AuctionItemInstance[];
  cycle: number;
}

export interface AuctionTargetEffects {
  tollBoostPropertyByPlayer: Record<string, string>;
  propertyDefenseByPlayer: Record<string, string>;
  stockLossIndustryByPlayer: Record<string, string>;
}

export interface AuctionState {
  deck: AuctionDeckState;
  inventories: AuctionInventoryMap;
  targetEffects: AuctionTargetEffects;
}

export type AuctionStage = "BIDDING" | "CHOOSE_DISCARD" | "RESULT";
export type AuctionResult = "SOLD" | "UNSOLD";

export interface PendingAuction {
  auctionId: string;
  arrivalPlayerId: string;
  item: AuctionItemInstance;
  eligibleBidderIds: string[];
  activeBidderIds: string[];
  currentBidderId: string | null;
  highestBidderId: string | null;
  currentBid: number;
  winnerPlayerId: string | null;
  result: AuctionResult | null;
  stage: AuctionStage;
  deadlineAt: number | null;
}

export type AuctionError =
  | "NO_PENDING_AUCTION"
  | "NOT_CURRENT_BIDDER"
  | "INVALID_BID"
  | "INSUFFICIENT_CASH"
  | "DUPLICATE_ITEM"
  | "PLAYER_NOT_FOUND"
  | "PAYMENT_FAILED"
  | "INVALID_DISCARD";

export type AuctionTargetItemId =
  | "EMERGENCY_FLIGHT"
  | "TOLL_BOOST"
  | "PROPERTY_DEFENSE"
  | "STOCK_LOSS_PROTECTION";

export interface AuctionTargetOption {
  id: string;
  label: string;
  description?: string;
}

export interface PendingAuctionTargetSelection {
  playerId: string;
  itemId: AuctionTargetItemId;
  options: AuctionTargetOption[];
}

export interface PendingDiceReroll {
  playerId: string;
  diceValues: [number, number];
}

export interface PropertyDefenseApplication {
  state: AuctionState;
  market: PropertyMarketMap;
  cycle: PropertyMarketCycle;
  protectedPropertyIds: string[];
}

export interface StockProtectionCredit {
  playerId: string;
  industryId: string;
  amount: number;
}

export interface StockProtectionApplication {
  state: AuctionState;
  cycle: StockMarketCycle;
  credits: StockProtectionCredit[];
}
