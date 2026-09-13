export interface CompanyDividendModifier {
  companyId: string;
  persistentRateModifier: number;
  specialDividendRate: number;
  suspendNextDividend: boolean;
  lastChangedTurn: number | null;
}

export type CompanyDividendModifierMap =
  Record<
    string,
    CompanyDividendModifier
  >;

export type CompanyDividendEventType =
  | "DIVIDEND_UP"
  | "DIVIDEND_DOWN"
  | "SPECIAL_DIVIDEND"
  | "DIVIDEND_SUSPENDED";

export interface CompanyDividendEvent {
  eventId: string;

  companyId: string;
  companyName: string;
  ticker: string;

  turnNumber: number;

  type: CompanyDividendEventType;

  headline: string;
  summary: string;

  persistentRateDelta: number;
  specialDividendRate: number;
}