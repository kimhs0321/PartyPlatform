import type { PlayerTokenData } from "../../components/PlayerToken";
import type { BoardTile, PropertyData } from "../../types";
import {
  MAX_PROPERTY_PRICE_INDEX,
  MIN_PROPERTY_PRICE_INDEX,
  getPropertyMarketState,
} from "../market/propertyMarket";
import type { PropertyMarketMap } from "../market/marketTypes";
import type { PropertyOwnershipMap } from "../property/propertyTypes";
import { getPropertyCurrentValue } from "../property/propertyValuation";
import { getCurrentPropertyPrice } from "../market/propertyMarket";
import type {
  StockCompanyData,
  StockMarketMap,
  StockPortfolioMap,
} from "../stock/stockTypes";
import {
  GOLDEN_KEY_CARD_MAP,
  GOLDEN_KEY_CARDS,
  GOLDEN_KEY_GROUP_QUOTAS,
} from "./goldenKeyDeck";
import type {
  GoldenKeyDeckState,
  GoldenKeyDrawResult,
  GoldenKeyMarketScope,
  GoldenKeyPoolGroup,
} from "./goldenKeyTypes";

const DISTRICT_LABELS: Record<PropertyData["district"], string> = {
  NAM: "남구",
  JUNG: "중구",
  BUK: "북구",
  DONG: "동구",
  ULJU: "울주군",
};

const INDUSTRY_LABELS: Record<string, string> = {
  AUTOMOTIVE: "자동차·모빌리티",
  SHIPBUILDING: "조선·해양",
  ENERGY_CHEMICAL: "에너지·석유화학",
  SEMICONDUCTOR: "반도체·전자",
  FINANCE: "금융",
  CONSTRUCTION: "건설·인프라",
  STEEL_MATERIALS: "철강·소재",
  BIO_HEALTH: "바이오·헬스케어",
  PLATFORM_GAME: "플랫폼·게임",
  RETAIL_CONSUMER: "유통·소비재",
};

export interface GoldenKeyMarketTargetSelection {
  ids: string[];
  label: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function shuffleGoldenKeyCardIds(
  cardIds: string[],
  random: () => number = Math.random,
): string[] {
  const shuffled = [...cardIds];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function selectRandomUniqueItems<T>(
  items: T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const safeCount = Math.min(Math.max(0, Math.trunc(count)), items.length);
  if (safeCount === 0) return [];

  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, safeCount);
}

export function selectGoldenKeyGameCardIds(
  random: () => number = Math.random,
): string[] {
  const selectedCardIds: string[] = [];

  for (const [group, quota] of Object.entries(
    GOLDEN_KEY_GROUP_QUOTAS,
  ) as Array<[GoldenKeyPoolGroup, number]>) {
    const groupCardIds = GOLDEN_KEY_CARDS.filter(
      (card) => card.poolGroup === group,
    ).map((card) => card.id);

    if (groupCardIds.length < quota) {
      throw new Error(
        `황금열쇠 ${group} 카드가 부족합니다. 필요 ${quota}장, 현재 ${groupCardIds.length}장입니다.`,
      );
    }

    selectedCardIds.push(
      ...shuffleGoldenKeyCardIds(groupCardIds, random).slice(0, quota),
    );
  }

  return shuffleGoldenKeyCardIds(selectedCardIds, random);
}

export function createInitialGoldenKeyDeck(
  random: () => number = Math.random,
): GoldenKeyDeckState {
  const selectedCardIds = selectGoldenKeyGameCardIds(random);

  return {
    selectedCardIds,
    drawPile: [...selectedCardIds],
    discardPile: [],
    cycle: 1,
    lastDrawnCardId: null,
  };
}

export function drawGoldenKeyCard(
  currentDeck: GoldenKeyDeckState,
  random: () => number = Math.random,
): GoldenKeyDrawResult {
  let drawPile = [...currentDeck.drawPile];
  let discardPile = [...currentDeck.discardPile];
  let cycle = currentDeck.cycle;
  let reshuffled = false;

  if (drawPile.length === 0) {
    drawPile = shuffleGoldenKeyCardIds(currentDeck.selectedCardIds, random);
    discardPile = [];
    cycle += 1;
    reshuffled = true;
  }

  const cardId = drawPile.shift();
  const card = cardId ? GOLDEN_KEY_CARD_MAP.get(cardId) : null;

  if (!card) {
    throw new Error("황금열쇠 카드 덱이 비어 있거나 카드 ID가 올바르지 않습니다.");
  }

  discardPile.push(card.id);

  return {
    card,
    reshuffled,
    deck: {
      selectedCardIds: [...currentDeck.selectedCardIds],
      drawPile,
      discardPile,
      cycle,
      lastDrawnCardId: card.id,
    },
  };
}

export function getGoldenKeyCashPercentageAmount(
  balance: number,
  rate: number,
  maximumAmount: number,
): number {
  return Math.min(
    Math.max(0, Math.round(balance * rate)),
    Math.max(0, maximumAmount),
  );
}

export function getGoldenKeyRelativePosition(
  currentPosition: number,
  steps: number,
  tileCount: number,
): number {
  if (tileCount <= 0) return 0;

  const normalized = (currentPosition + steps) % tileCount;
  return normalized < 0 ? normalized + tileCount : normalized;
}

export function getRandomPropertyTilePosition(
  tiles: BoardTile[],
  ownerships: PropertyOwnershipMap,
  unownedOnly: boolean,
  random: () => number = Math.random,
): number | null {
  const candidates = tiles.filter((tile) => {
    if (tile.type !== "PROPERTY" || !tile.propertyId) return false;
    if (!unownedOnly) return true;
    return !ownerships[tile.propertyId];
  });

  if (candidates.length === 0) return null;

  return candidates[Math.floor(random() * candidates.length)]?.id ?? null;
}

export function getNearestForwardTilePosition(
  tiles: BoardTile[],
  currentPosition: number,
  type: BoardTile["type"],
): number | null {
  const tileCount = tiles.length;
  const candidates = tiles.filter((tile) => tile.type === type);
  if (candidates.length === 0 || tileCount <= 0) return null;

  return [...candidates]
    .sort((first, second) => {
      const firstDistance =
        (first.id - currentPosition + tileCount) % tileCount || tileCount;
      const secondDistance =
        (second.id - currentPosition + tileCount) % tileCount || tileCount;
      return firstDistance - secondDistance;
    })[0]?.id ?? null;
}

export function getNextEligiblePlayer(
  players: PlayerTokenData[],
  playerId: string,
): PlayerTokenData | null {
  const currentIndex = players.findIndex((player) => player.id === playerId);
  if (currentIndex < 0) return null;

  for (let offset = 1; offset < players.length; offset += 1) {
    const candidate = players[(currentIndex + offset) % players.length];
    if (candidate && !candidate.isBankrupt) return candidate;
  }

  return null;
}

export function getOwnedPropertyCurrentValue(
  playerId: string,
  properties: PropertyData[],
  ownerships: PropertyOwnershipMap,
  market: PropertyMarketMap,
): number {
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );

  return Object.values(ownerships).reduce((total, ownership) => {
    if (ownership.ownerPlayerId !== playerId) return total;

    const property = propertyMap.get(ownership.propertyId);
    if (!property) return total;

    return (
      total +
      getPropertyCurrentValue(
        ownership,
        getCurrentPropertyPrice(property, market),
      )
    );
  }, 0);
}

export function getGoldenKeyPropertyMarketTargets(
  properties: PropertyData[],
  ownerships: PropertyOwnershipMap,
  playerId: string,
  scope: GoldenKeyMarketScope,
  count = 0,
  random: () => number = Math.random,
): GoldenKeyMarketTargetSelection {
  if (scope === "ALL") {
    return {
      ids: properties.map((property) => property.id),
      label: "모든 부동산",
    };
  }

  if (scope === "PLAYER_OWNED") {
    const ownedIds = Object.values(ownerships)
      .filter((ownership) => ownership.ownerPlayerId === playerId)
      .map((ownership) => ownership.propertyId)
      .filter((propertyId) =>
        properties.some((property) => property.id === propertyId),
      );

    return {
      ids: ownedIds,
      label: `보유 부동산 ${ownedIds.length}곳`,
    };
  }

  if (scope === "RANDOM_GROUP") {
    const districts = [...new Set(properties.map((property) => property.district))];
    const selectedDistrict =
      districts[Math.floor(random() * districts.length)] ?? null;
    const selectedProperties = selectedDistrict
      ? properties.filter((property) => property.district === selectedDistrict)
      : [];

    return {
      ids: selectedProperties.map((property) => property.id),
      label: selectedDistrict
        ? `${DISTRICT_LABELS[selectedDistrict]} 권역`
        : "선택된 권역",
    };
  }

  const selectedProperties = selectRandomUniqueItems(properties, count, random);
  return {
    ids: selectedProperties.map((property) => property.id),
    label: `무작위 부동산 ${selectedProperties.length}곳`,
  };
}

export function getGoldenKeyStockMarketTargets(
  companies: StockCompanyData[],
  portfolios: StockPortfolioMap,
  playerId: string,
  scope: GoldenKeyMarketScope,
  count = 0,
  random: () => number = Math.random,
): GoldenKeyMarketTargetSelection {
  if (scope === "ALL") {
    return {
      ids: companies.map((company) => company.id),
      label: "모든 상장 종목",
    };
  }

  if (scope === "PLAYER_OWNED") {
    const holdingIds = Object.values(portfolios[playerId] ?? {})
      .filter((holding) => holding.quantity > 0)
      .map((holding) => holding.companyId)
      .filter((companyId) =>
        companies.some((company) => company.id === companyId),
      );

    return {
      ids: holdingIds,
      label: `보유 종목 ${holdingIds.length}개`,
    };
  }

  if (scope === "RANDOM_GROUP") {
    const industries = [...new Set(companies.map((company) => company.industry))];
    const selectedIndustry =
      industries[Math.floor(random() * industries.length)] ?? null;
    const selectedCompanies = selectedIndustry
      ? companies.filter((company) => company.industry === selectedIndustry)
      : [];

    return {
      ids: selectedCompanies.map((company) => company.id),
      label: selectedIndustry
        ? `${INDUSTRY_LABELS[selectedIndustry] ?? selectedIndustry} 테마`
        : "선택된 산업 테마",
    };
  }

  const selectedCompanies = selectRandomUniqueItems(companies, count, random);
  return {
    ids: selectedCompanies.map((company) => company.id),
    label: `무작위 종목 ${selectedCompanies.length}개`,
  };
}

export function applyGoldenKeyPropertyMarketRate(
  properties: PropertyData[],
  currentMarket: PropertyMarketMap,
  rate: number,
  turnNumber: number,
  targetPropertyIds: string[] = properties.map((property) => property.id),
): PropertyMarketMap {
  const nextMarket: PropertyMarketMap = { ...currentMarket };
  const targetIdSet = new Set(targetPropertyIds);

  for (const property of properties) {
    if (!targetIdSet.has(property.id)) continue;

    const previous = getPropertyMarketState(currentMarket, property.id);
    const nextPriceIndex = roundRate(
      clamp(
        previous.priceIndex * (1 + rate),
        MIN_PROPERTY_PRICE_INDEX,
        MAX_PROPERTY_PRICE_INDEX,
      ),
    );
    const appliedChangeRate = roundRate(
      previous.priceIndex === 0
        ? 0
        : nextPriceIndex / previous.priceIndex - 1,
    );

    nextMarket[property.id] = {
      propertyId: property.id,
      priceIndex: nextPriceIndex,
      lastChangeRate: appliedChangeRate,
      districtChangeRate: rate,
      individualChangeRate: 0,
      updatedTurn: turnNumber,
    };
  }

  return nextMarket;
}

export function applyGoldenKeyStockMarketRate(
  companies: StockCompanyData[],
  currentMarket: StockMarketMap,
  rate: number,
  targetCompanyIds: string[] = companies.map((company) => company.id),
): StockMarketMap {
  const nextMarket: StockMarketMap = { ...currentMarket };
  const targetIdSet = new Set(targetCompanyIds);

  for (const company of companies) {
    if (!targetIdSet.has(company.id)) continue;

    const previousQuote = currentMarket[company.id];
    const previousPrice = previousQuote?.currentPrice ?? company.basePrice;
    const currentPrice = Math.max(1, Math.round(previousPrice * (1 + rate)));
    const appliedChangeRate =
      previousPrice <= 0 ? 0 : roundRate(currentPrice / previousPrice - 1);

    nextMarket[company.id] = {
      companyId: company.id,
      previousPrice,
      currentPrice,
      lastChangeRate: appliedChangeRate,
      lastIndustryChangeRate: rate,
      lastCompanyChangeRate: 0,
      status: previousQuote?.status ?? company.statusAtStart,
    };
  }

  return nextMarket;
}
