import { EASY_CATEGORIES } from "./easy";
import { NORMAL_CATEGORIES } from "./normal";
import { CULTURE_CATEGORIES } from "./culture";
import { MOVIE_CATEGORIES } from "./movies";
import { ANIME_CATEGORIES } from "./anime";
import { DRAMA_CATEGORIES } from "./dramas";
import { GAME_CATEGORIES } from "./games";
import { CHARACTER_CATEGORIES } from "./characters";
import { CELEBRITY_CATEGORIES } from "./celebrities";

export const CATCH_MIND_WORDS = [
  ...EASY_CATEGORIES,
  ...NORMAL_CATEGORIES,
  ...CULTURE_CATEGORIES,
  ...MOVIE_CATEGORIES,
  ...ANIME_CATEGORIES,
  ...DRAMA_CATEGORIES,
  ...GAME_CATEGORIES,
  ...CHARACTER_CATEGORIES,
  ...CELEBRITY_CATEGORIES,
].flatMap((category) => [...category.words]);