export type RecurringSavingsProductId = "SMALL" | "STANDARD" | "LARGE";

export interface RecurringSavingsProduct {
  id: RecurringSavingsProductId;
  name: string;
  installmentAmount: number;
  installmentCount: number;
  maturityPayout: number;
}

export interface RecurringSavingsContract {
  playerId: string;
  productId: RecurringSavingsProductId;
  installmentAmount: number;
  installmentCount: number;
  installmentsPaid: number;
  principalPaid: number;
  failedPayments: number;
  openedTurn: number;
  nextPaymentTurn: number;
}

export interface BankState {
  generalDeposits: Record<string, number>;
  recurringSavings: Record<string, RecurringSavingsContract>;
  lastInterestTurn: number | null;
}

export interface BankInterestCredit {
  playerId: string;
  balanceBefore: number;
  interestAmount: number;
  balanceAfter: number;
}

export interface PendingBankShop {
  playerId: string;
  visitId: string;
}

export type BankShopError =
  | "NO_PENDING_BANK"
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_DEPOSIT"
  | "ACTIVE_SAVINGS_EXISTS"
  | "INSUFFICIENT_LIQUID_FUNDS"
  | "UNKNOWN_PRODUCT";

export type BankNoticeTone = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface BankNoticeData {
  id: string;
  title: string;
  message: string;
  tone: BankNoticeTone;
}
