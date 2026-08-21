export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export const DICE_SYMBOLS: Record<DiceValue, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

export function createDiceValue(random: () => number = Math.random): DiceValue {
  return (Math.floor(random() * 6) + 1) as DiceValue;
}
