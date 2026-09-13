import type { PlayerTokenData } from "../../components/PlayerToken";

export type TransactionReason =
  | "STARTING_CASH"
  | "SALARY"
  | "PROPERTY_PURCHASE"
  | "CONSTRUCTION"
  | "TOLL"
  | "TAX"
  | "SALE"
  | "STOCK_PURCHASE"
  | "STOCK_SALE"
  | "STOCK_DIVIDEND"
  | "LOTTERY_PURCHASE"
  | "LOTTERY_PRIZE"
  | "DISASTER_REPAIR"
  | "INSURANCE_PREMIUM"
  | "AIRPORT_TICKET"
  | "PORT_INVESTMENT"
  | "PORT_SETTLEMENT"
  | "BANK_DEPOSIT"
  | "BANK_WITHDRAWAL"
  | "SAVINGS_PAYMENT"
  | "SAVINGS_MATURITY"
  | "SAVINGS_REFUND"
  | "BANKRUPTCY"
  | "AUCTION_PURCHASE"
  | "ITEM_COMPENSATION"
  | "MINIGAME_BET"
  | "MINIGAME_PRIZE"
  | "EVENT";

export type MoneyTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export type MoneyErrorCode =
  | "INVALID_AMOUNT"
  | "PLAYER_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "SAME_PLAYER_TRANSFER";

export interface MoneyTransactionContext {
  reason: TransactionReason;
  turnNumber: number;
  memo?: string;
}

export interface MoneyTransaction {
  id: string;
  transferId?: string;
  type: MoneyTransactionType;
  playerId: string;
  counterpartyPlayerId?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: TransactionReason;
  turnNumber: number;
  memo?: string;
  createdAt: number;
}

export interface MoneyOperationSuccess {
  ok: true;
  players: PlayerTokenData[];
  transactions: MoneyTransaction[];
}

export interface MoneyOperationFailure {
  ok: false;
  players: PlayerTokenData[];
  transactions: [];
  error: MoneyErrorCode;
}

export type MoneyOperationResult =
  | MoneyOperationSuccess
  | MoneyOperationFailure;
