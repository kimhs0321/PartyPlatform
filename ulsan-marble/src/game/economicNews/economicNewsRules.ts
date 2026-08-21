import type { DistrictId } from "../../types";
import type {
  ActiveEconomicNews,
  EconomicNewsDefinition,
  EconomicNewsEffect,
  EconomicNewsSource,
  EconomicNewsState,
} from "./economicNewsTypes";

export const MAX_ACTIVE_ECONOMIC_NEWS = 3;
export const MAX_ECONOMIC_NEWS_HISTORY = 24;
export const MIN_ECONOMIC_NEWS_START_DELAY = 1;
export const MAX_ECONOMIC_NEWS_START_DELAY = 3;
export const RANDOM_ECONOMIC_NEWS_MIN_TURN = 3;
export const RANDOM_ECONOMIC_NEWS_CHANCE = 0.15;
export const RANDOM_ECONOMIC_NEWS_COOLDOWN_TURNS = 2;

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function getConflictKey(effect: EconomicNewsEffect): string {
  switch (effect.type) {
    case "STOCK_INDUSTRY_BIAS":
      return `${effect.type}:${effect.industryId}`;
    case "PROPERTY_DISTRICT_BIAS":
      return `${effect.type}:${effect.districtId}`;
    default:
      return effect.type;
  }
}

export function createInitialEconomicNewsState(
  pool: EconomicNewsDefinition[],
  random: () => number = Math.random,
): EconomicNewsState {
  return {
    drawPile: shuffle(
      pool.map((article) => article.id),
      random,
    ),
    discardPile: [],
    cycle: 1,
    activeNews: [],
    history: [],
    lastRandomPublishedTurn: null,
  };
}

export function drawEconomicNews(
  state: EconomicNewsState,
  pool: EconomicNewsDefinition[],
  random: () => number = Math.random,
): { state: EconomicNewsState; article: EconomicNewsDefinition } {
  const articleMap = new Map(pool.map((article) => [article.id, article]));
  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  let cycle = state.cycle;

  if (drawPile.length === 0) {
    drawPile = shuffle(
      pool.map((article) => article.id),
      random,
    );
    discardPile = [];
    cycle += 1;
  }

  const articleId = drawPile[0];
  const article = articleMap.get(articleId) ?? pool[0];

  if (!article) {
    throw new Error("경제뉴스 카드 풀이 비어 있습니다.");
  }

  return {
    article,
    state: {
      ...state,
      drawPile: drawPile.slice(1),
      discardPile: [...discardPile, article.id],
      cycle,
    },
  };
}

export function applyResolvedEconomicNewsActivation(
  state: EconomicNewsState,
  article: EconomicNewsDefinition,
  publishedTurn: number,
  source: EconomicNewsSource,
  activeFromTurn: number,
  instanceId: string,
): EconomicNewsState {
  const conflictKey = getConflictKey(article.effect);

  const withoutConflict = state.activeNews.filter(
    (active) =>
      active.expiresAfterTurn >= publishedTurn &&
      getConflictKey(active.definition.effect) !== conflictKey,
  );

  const activeNews: ActiveEconomicNews = {
    instanceId,
    definition: article,
    source,
    publishedTurn,
    activeFromTurn,
    expiresAfterTurn: activeFromTurn + article.durationTurns - 1,
  };

  const nextActiveNews = [...withoutConflict, activeNews]
    .sort((a, b) => a.publishedTurn - b.publishedTurn)
    .slice(-MAX_ACTIVE_ECONOMIC_NEWS);

  return {
    ...state,
    activeNews: nextActiveNews,
    history: [
      {
        instanceId,
        definitionId: article.id,
        headline: article.headline,
        source,
        publishedTurn,
        activeFromTurn,
        expiresAfterTurn: activeNews.expiresAfterTurn,
      },
      ...state.history,
    ].slice(0, MAX_ECONOMIC_NEWS_HISTORY),
  };
}

export function activateEconomicNews(
  state: EconomicNewsState,
  article: EconomicNewsDefinition,
  publishedTurn: number,
  source: EconomicNewsSource = "NEWSPAPER",
  random: () => number = Math.random,
): EconomicNewsState {
  const activationDelay =
    MIN_ECONOMIC_NEWS_START_DELAY +
    Math.floor(
      random() *
        (MAX_ECONOMIC_NEWS_START_DELAY - MIN_ECONOMIC_NEWS_START_DELAY + 1),
    );

  const activeFromTurn = publishedTurn + activationDelay;
  const instanceId =
    `news-${article.id}-${publishedTurn}-${Date.now()}-${random().toString(36).slice(2, 7)}`;

  return applyResolvedEconomicNewsActivation(
    state,
    article,
    publishedTurn,
    source,
    activeFromTurn,
    instanceId,
  );
}

export function shouldTriggerRandomEconomicNews(
  state: EconomicNewsState,
  turnNumber: number,
  random: () => number = Math.random,
): boolean {
  if (turnNumber < RANDOM_ECONOMIC_NEWS_MIN_TURN) return false;

  const visibleNewsCount = getVisibleEconomicNews(state, turnNumber).length;
  if (visibleNewsCount >= MAX_ACTIVE_ECONOMIC_NEWS) return false;

  if (
    state.lastRandomPublishedTurn !== null &&
    turnNumber - state.lastRandomPublishedTurn <=
      RANDOM_ECONOMIC_NEWS_COOLDOWN_TURNS
  ) {
    return false;
  }

  return random() < RANDOM_ECONOMIC_NEWS_CHANCE;
}

export function recordRandomEconomicNewsPublication(
  state: EconomicNewsState,
  turnNumber: number,
): EconomicNewsState {
  return {
    ...state,
    lastRandomPublishedTurn: turnNumber,
  };
}

export function resetRandomEconomicNewsCooldown(
  state: EconomicNewsState,
): EconomicNewsState {
  return {
    ...state,
    lastRandomPublishedTurn: null,
  };
}

export function getVisibleEconomicNews(
  state: EconomicNewsState,
  turnNumber: number,
): ActiveEconomicNews[] {
  return state.activeNews.filter(
    (news) => turnNumber <= news.expiresAfterTurn,
  );
}

export function getActiveEconomicNews(
  state: EconomicNewsState,
  turnNumber: number,
): ActiveEconomicNews[] {
  return getVisibleEconomicNews(state, turnNumber).filter(
    (news) => turnNumber >= news.activeFromTurn,
  );
}

export function getEconomicNewsStockIndustryBiases(
  activeNews: ActiveEconomicNews[],
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const news of activeNews) {
    if (news.definition.effect.type !== "STOCK_INDUSTRY_BIAS") continue;
    const { industryId, changeBias } = news.definition.effect;
    result[industryId] = (result[industryId] ?? 0) + changeBias;
  }

  return result;
}

export function getEconomicNewsPropertyDistrictBiases(
  activeNews: ActiveEconomicNews[],
): Partial<Record<DistrictId, number>> {
  const result: Partial<Record<DistrictId, number>> = {};

  for (const news of activeNews) {
    if (news.definition.effect.type !== "PROPERTY_DISTRICT_BIAS") continue;
    const { districtId, changeBias } = news.definition.effect;
    result[districtId] = (result[districtId] ?? 0) + changeBias;
  }

  return result;
}

export function getEconomicNewsConstructionCostMultiplier(
  activeNews: ActiveEconomicNews[],
): number {
  return activeNews.reduce(
    (multiplier, news) =>
      news.definition.effect.type === "CONSTRUCTION_COST"
        ? multiplier * news.definition.effect.multiplier
        : multiplier,
    1,
  );
}

export function getEconomicNewsTollMultiplier(
  activeNews: ActiveEconomicNews[],
): number {
  return activeNews.reduce(
    (multiplier, news) =>
      news.definition.effect.type === "TOLL"
        ? multiplier * news.definition.effect.multiplier
        : multiplier,
    1,
  );
}

export function getEconomicNewsPortSuccessChanceDelta(
  activeNews: ActiveEconomicNews[],
): number {
  return activeNews.reduce(
    (delta, news) =>
      news.definition.effect.type === "PORT_SUCCESS"
        ? delta + news.definition.effect.chanceDelta
        : delta,
    0,
  );
}

export function getEconomicNewsBankInterestMultiplier(
  activeNews: ActiveEconomicNews[],
): number {
  return activeNews.reduce(
    (multiplier, news) =>
      news.definition.effect.type === "BANK_INTEREST"
        ? multiplier * news.definition.effect.multiplier
        : multiplier,
    1,
  );
}
