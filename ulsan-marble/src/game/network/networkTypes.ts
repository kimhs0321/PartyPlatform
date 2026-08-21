import type {
  UlsanMarbleGameEvent,
  UlsanMarbleGameEventRequest,
  UlsanMarblePropertyDecisionRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  DiceValue,
} from "../dice";

export type UlsanMarbleNetworkDiceRoll = {
  rollId: number;
  playerId: string;
  values: [DiceValue, DiceValue];

  total: number;
  isDouble: boolean;
  grantsExtraRoll: boolean;
  sendsToJail: boolean;
};

export type UlsanMarbleNetworkPropertyDecisionRequest =
  UlsanMarblePropertyDecisionRequest;

export type UlsanMarbleNetworkPropertyDecision =
  UlsanMarbleNetworkPropertyDecisionRequest & {
    decisionId: number;
    playerId: string;
  };
  
export type UlsanMarbleNetworkStockTradeRequest = {
  action: "BUY" | "SELL";
  companyId: string;
  quantity: number;
  pricePerShare: number;
};

export type UlsanMarbleNetworkStockTrade =
  UlsanMarbleNetworkStockTradeRequest & {
    tradeId: number;
    playerId: string;
    turnSequence: number;
  };

export interface UsePrototypeGameNetworkOptions {
  networkDiceRoll?:
    UlsanMarbleNetworkDiceRoll | null;

  onNetworkRollRequest?: () => void;

  networkPropertyDecision?:
    UlsanMarbleNetworkPropertyDecision | null;

  onNetworkPropertyDecisionRequest?: (
    request:
      UlsanMarbleNetworkPropertyDecisionRequest,
  ) => void;

  networkStockTrades?:
    UlsanMarbleNetworkStockTrade[];

  onNetworkStockTradeRequest?: (
    request:
      UlsanMarbleNetworkStockTradeRequest,
  ) => void;

  networkGameEvents?:
    UlsanMarbleGameEvent[];

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;

  onNetworkEndTurnRequest?: () => void;
  onNetworkDevEndTurnRequest?: () => void;

  networkTurnNumber?: number;
  networkTurnSequence?: number;
  networkActivePlayerId?: string;
}