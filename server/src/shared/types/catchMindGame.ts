export type CatchMindGameSettings = {
  roundCount: number;
  wordSelectTime: number;
  drawingTime: number;
  roundResultTime: number;
  allowDrawerSkip: boolean;
};
export const DEFAULT_CATCH_MIND_GAME_SETTINGS: CatchMindGameSettings = {
  roundCount: 3,
  wordSelectTime: 10,
  drawingTime: 90,
  roundResultTime: 5,
  allowDrawerSkip: true,
};