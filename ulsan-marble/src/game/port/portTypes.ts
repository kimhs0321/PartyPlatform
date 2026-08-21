export type PortContractType = "COASTAL" | "EAST_ASIA" | "OCEAN";

export interface PortContractDefinition {
  type: PortContractType;
  name: string;
  description: string;
  investmentAmount: number;
  baseSuccessChance: number;
  successPayout: number;
  failurePayout: number;
}

export interface PortContract {
  id: string;
  playerId: string;
  type: PortContractType;
  purchasedTurn: number;
  settlesAfterTurn: number;
  investmentAmount: number;
}

export interface PortSettlementModifier {
  type:
    | "TYPHOON"
    | "SHIPBUILDING_UP"
    | "ECONOMIC_NEWS"
    | "CITY_HALL"
    | "CARGO_INSURANCE";
  label: string;
  chanceDelta: number;
}

export interface PortSettlementResult {
  contract: PortContract;
  definition: PortContractDefinition;
  success: boolean;
  finalSuccessChance: number;
  modifiers: PortSettlementModifier[];
  payoutAmount: number;
  netProfit: number;
}

export interface PortState {
  activeContracts: PortContract[];
  settlementHistory: PortSettlementResult[];
}

export interface PendingPortShop {
  playerId: string;
  visitId: string;
}

export interface PendingPortSettlement {
  settlementId: string;
  turnNumber: number;
  turnSequence: number;
  results: PortSettlementResult[];
  additionallyDisabledPlayerIds: string[];
}

export type PortShopError =
  | "NO_PENDING_PORT"
  | "PLAYER_NOT_FOUND"
  | "CONTRACT_NOT_FOUND"
  | "ACTIVE_CONTRACT_EXISTS"
  | "INSUFFICIENT_FUNDS"
  | "PAYMENT_FAILED";
