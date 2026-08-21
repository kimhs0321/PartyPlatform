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
