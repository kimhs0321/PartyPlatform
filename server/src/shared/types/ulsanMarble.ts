export type UlsanMarbleRoundLimit =
  | 30
  | 50
  | 70
  | null;

export type UlsanMarbleSettings = {
  startingMoney: number;
  salary: number;
  roundLimit: UlsanMarbleRoundLimit;
};

export const DEFAULT_ULSAN_MARBLE_SETTINGS: UlsanMarbleSettings = {
  startingMoney: 35_000_000,
  salary: 2_000_000,
  roundLimit: 50,
};