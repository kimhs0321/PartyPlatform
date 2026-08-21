export interface PendingJailEntry {
  playerId: string;
  entryId: string;
  turnSequence: number;
}

export interface PendingJailFine {
  fineId: string;
  playerId: string;
  amount: number;
  turnSequence: number;
}

export type JailActionError =
  | "NO_ACTIVE_PRISONER"
  | "INSUFFICIENT_FUNDS"
  | "NO_ESCAPE_CARD"
  | "ACTION_IN_PROGRESS";

export type JailLiquidationError =
  | "NO_PENDING_FINE"
  | "PROPERTY_NOT_OWNED"
  | "NOT_OWNER"
  | "STOCK_NOT_OWNED"
  | "INVALID_STOCK_QUANTITY"
  | "COMPANY_NOT_FOUND"
  | "ASSETS_REMAIN"
  | "SALE_FAILED";
