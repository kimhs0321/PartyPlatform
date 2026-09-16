export const START_SALARY = 200;

export function getNextBoardPosition(
  currentPosition: number,
  tileCount: number,
): number {
  if (tileCount <= 0) return 0;
  return (currentPosition + 1) % tileCount;
}

export function didPassStart(
  currentPosition: number,
  nextPosition: number,
): boolean {
  return nextPosition < currentPosition;
}

export const SALARY_INTERVAL_TURNS = 5;

export function isScheduledSalaryTurn(
  turnNumber: number,
): boolean {
  const safeTurn =
    Math.max(
      0,
      Math.trunc(turnNumber),
    );

  return (
    safeTurn > 0 &&
    safeTurn %
      SALARY_INTERVAL_TURNS ===
      0
  );
}

export function getSalaryCycle(
  turnNumber: number,
): number {
  const safeTurn =
    Math.max(
      0,
      Math.trunc(turnNumber),
    );

  return Math.floor(
    safeTurn /
      SALARY_INTERVAL_TURNS,
  );
}