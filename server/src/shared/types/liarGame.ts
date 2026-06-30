export type LiarGameSettings = {
  liarCount: number;
  roundCount: number;
  descriptionTime: number;
  discussionTime: number;
  voteTime: number;
  tieSpeechTime: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
};

export const DEFAULT_LIAR_GAME_SETTINGS: LiarGameSettings = {
  liarCount: 1,
  roundCount: 5,
  descriptionTime: 45,
  discussionTime: 120,
  voteTime: 30,
  tieSpeechTime: 20,
  minDescriptionLength: 2,
  maxDescriptionLength: 30,
};