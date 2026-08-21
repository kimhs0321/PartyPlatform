import type { PlayerTokenData } from "../../components/PlayerToken";
import type { TaxAssessment } from "../economy/taxTypes";
import type { PropertyMarketCycle, PropertyMarketMap } from "../market/marketTypes";
import type { StockCompanyData, StockMarketCycle, StockPortfolioMap } from "../stock/stockTypes";
import {
  AUCTION_ITEMS,
  MAX_AUCTION_ITEMS_PER_PLAYER,
} from "./auctionItems";
import type {
  AuctionDeckState,
  AuctionInventoryMap,
  AuctionItemId,
  AuctionItemInstance,
  AuctionState,
  PropertyDefenseApplication,
  StockProtectionApplication,
} from "./auctionTypes";

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function createDeckInstances(cycle: number): AuctionItemInstance[] {
  return AUCTION_ITEMS.flatMap((definition) =>
    Array.from({ length: definition.copies }, (_, copyIndex) => ({
      instanceId: `auction-${cycle}-${definition.id}-${copyIndex + 1}`,
      itemId: definition.id,
    })),
  );
}

export function createInitialAuctionState(
  playerIds: string[],
  random: () => number = Math.random,
): AuctionState {
  return {
    deck: {
      drawPile: shuffle(createDeckInstances(1), random),
      cycle: 1,
    },
    inventories: Object.fromEntries(playerIds.map((playerId) => [playerId, []])),
    targetEffects: {
      tollBoostPropertyByPlayer: {},
      propertyDefenseByPlayer: {},
      stockLossIndustryByPlayer: {},
    },
  };
}

export function drawAuctionItem(
  state: AuctionState,
  random: () => number = Math.random,
): { state: AuctionState; item: AuctionItemInstance } {
  let deck: AuctionDeckState = state.deck;
  if (deck.drawPile.length === 0) {
    const nextCycle = deck.cycle + 1;
    deck = {
      cycle: nextCycle,
      drawPile: shuffle(createDeckInstances(nextCycle), random),
    };
  }

  const [item, ...drawPile] = deck.drawPile;
  if (!item) throw new Error("Auction item deck is empty.");

  return {
    item,
    state: {
      ...state,
      deck: { ...deck, drawPile },
    },
  };
}

export function getPlayerAuctionItems(
  state: AuctionState,
  playerId: string,
): AuctionItemInstance[] {
  return state.inventories[playerId] ?? [];
}

export function hasAuctionItem(
  state: AuctionState,
  playerId: string,
  itemId: AuctionItemId,
): boolean {
  return getPlayerAuctionItems(state, playerId).some(
    (item) => item.itemId === itemId,
  );
}

export function consumeAuctionItem(
  state: AuctionState,
  playerId: string,
  itemId: AuctionItemId,
): { state: AuctionState; item: AuctionItemInstance } | null {
  const items = getPlayerAuctionItems(state, playerId);
  const index = items.findIndex((item) => item.itemId === itemId);
  if (index < 0) return null;

  const item = items[index];
  return {
    item,
    state: {
      ...state,
      inventories: {
        ...state.inventories,
        [playerId]: items.filter((_, itemIndex) => itemIndex !== index),
      },
    },
  };
}

export function awardAuctionItem(
  state: AuctionState,
  playerId: string,
  item: AuctionItemInstance,
  discardInstanceId?: string,
): AuctionState | null {
  const items = getPlayerAuctionItems(state, playerId);
  if (items.some((ownedItem) => ownedItem.itemId === item.itemId)) return null;

  let nextItems = items;
  if (items.length >= MAX_AUCTION_ITEMS_PER_PLAYER) {
    if (!discardInstanceId || !items.some((owned) => owned.instanceId === discardInstanceId)) {
      return null;
    }
    nextItems = items.filter((owned) => owned.instanceId !== discardInstanceId);
  }

  return {
    ...state,
    inventories: {
      ...state.inventories,
      [playerId]: [...nextItems, item],
    },
  };
}

export function removePlayerAuctionAssets(
  state: AuctionState,
  playerId: string,
): AuctionState {
  const { [playerId]: _toll, ...tollBoostPropertyByPlayer } =
    state.targetEffects.tollBoostPropertyByPlayer;
  const { [playerId]: _defense, ...propertyDefenseByPlayer } =
    state.targetEffects.propertyDefenseByPlayer;
  const { [playerId]: _stock, ...stockLossIndustryByPlayer } =
    state.targetEffects.stockLossIndustryByPlayer;

  return {
    ...state,
    inventories: {
      ...state.inventories,
      [playerId]: [],
    },
    targetEffects: {
      tollBoostPropertyByPlayer,
      propertyDefenseByPlayer,
      stockLossIndustryByPlayer,
    },
  };
}

export function createAuctionBidderOrder(
  players: PlayerTokenData[],
  arrivalPlayerId: string,
): string[] {
  const eligible = players.filter(
    (player) => !player.isBankrupt && !player.isJailed,
  );
  const arrivalIndex = eligible.findIndex((player) => player.id === arrivalPlayerId);
  if (arrivalIndex < 0) return eligible.map((player) => player.id);
  return [
    ...eligible.slice(arrivalIndex),
    ...eligible.slice(0, arrivalIndex),
  ].map((player) => player.id);
}

export function getNextAuctionBidder(
  bidderOrder: string[],
  activeBidderIds: string[],
  currentBidderId: string,
  highestBidderId: string | null,
): string | null {
  const activeSet = new Set(activeBidderIds);
  const currentIndex = Math.max(0, bidderOrder.indexOf(currentBidderId));

  for (let offset = 1; offset <= bidderOrder.length; offset += 1) {
    const candidate = bidderOrder[(currentIndex + offset) % bidderOrder.length];
    if (activeSet.has(candidate) && candidate !== highestBidderId) return candidate;
  }
  return null;
}

export function armTargetedAuctionItem(
  state: AuctionState,
  playerId: string,
  itemId: "TOLL_BOOST" | "PROPERTY_DEFENSE" | "STOCK_LOSS_PROTECTION",
  targetId: string,
): AuctionState | null {
  const consumed = consumeAuctionItem(state, playerId, itemId);
  if (!consumed) return null;

  if (itemId === "TOLL_BOOST") {
    return {
      ...consumed.state,
      targetEffects: {
        ...consumed.state.targetEffects,
        tollBoostPropertyByPlayer: {
          ...consumed.state.targetEffects.tollBoostPropertyByPlayer,
          [playerId]: targetId,
        },
      },
    };
  }

  if (itemId === "PROPERTY_DEFENSE") {
    return {
      ...consumed.state,
      targetEffects: {
        ...consumed.state.targetEffects,
        propertyDefenseByPlayer: {
          ...consumed.state.targetEffects.propertyDefenseByPlayer,
          [playerId]: targetId,
        },
      },
    };
  }

  return {
    ...consumed.state,
    targetEffects: {
      ...consumed.state.targetEffects,
      stockLossIndustryByPlayer: {
        ...consumed.state.targetEffects.stockLossIndustryByPlayer,
        [playerId]: targetId,
      },
    },
  };
}

export function consumeTollBoostForProperty(
  state: AuctionState,
  ownerPlayerId: string,
  propertyId: string,
): { state: AuctionState; multiplier: number } {
  if (state.targetEffects.tollBoostPropertyByPlayer[ownerPlayerId] !== propertyId) {
    return { state, multiplier: 1 };
  }

  const nextTargets = { ...state.targetEffects.tollBoostPropertyByPlayer };
  delete nextTargets[ownerPlayerId];
  return {
    multiplier: 1.5,
    state: {
      ...state,
      targetEffects: {
        ...state.targetEffects,
        tollBoostPropertyByPlayer: nextTargets,
      },
    },
  };
}

export function applyTaxDiscountItems(
  state: AuctionState,
  assessments: TaxAssessment[],
): { state: AuctionState; assessments: TaxAssessment[]; discountedPlayerIds: string[] } {
  let nextState = state;
  const discountedPlayerIds: string[] = [];

  const nextAssessments = assessments.map((assessment) => {
    if (!hasAuctionItem(nextState, assessment.playerId, "TAX_DISCOUNT")) {
      return assessment;
    }

    const consumed = consumeAuctionItem(nextState, assessment.playerId, "TAX_DISCOUNT");
    if (!consumed) return assessment;
    nextState = consumed.state;
    discountedPlayerIds.push(assessment.playerId);

    const items = assessment.items.map((item) => ({
      ...item,
      amount: Math.max(1, Math.round(item.amount * 0.5)),
    }));
    return {
      ...assessment,
      items,
      totalAmount: items.reduce((total, item) => total + item.amount, 0),
    };
  });

  return { state: nextState, assessments: nextAssessments, discountedPlayerIds };
}

export function applyPropertyDefenseItems(
  state: AuctionState,
  currentMarket: PropertyMarketMap,
  nextMarket: PropertyMarketMap,
  cycle: PropertyMarketCycle,
): PropertyDefenseApplication {
  let nextState = state;
  const protectedPropertyIds: string[] = [];
  const protectedOwners = new Map<string, string>();

  for (const [playerId, propertyId] of Object.entries(
    state.targetEffects.propertyDefenseByPlayer,
  )) {
    protectedOwners.set(propertyId, playerId);
  }

  const propertyChanges = cycle.propertyChanges.map((change) => {
    const ownerPlayerId = protectedOwners.get(change.propertyId);
    if (!ownerPlayerId || change.appliedChangeRate >= 0) return change;

    const previousState = currentMarket[change.propertyId];
    if (previousState) nextMarket[change.propertyId] = previousState;
    protectedPropertyIds.push(change.propertyId);

    const targets = { ...nextState.targetEffects.propertyDefenseByPlayer };
    delete targets[ownerPlayerId];
    nextState = {
      ...nextState,
      targetEffects: {
        ...nextState.targetEffects,
        propertyDefenseByPlayer: targets,
      },
    };

    return {
      ...change,
      nextPriceIndex: change.previousPriceIndex,
      appliedChangeRate: 0,
      currentPrice: change.previousPrice,
    };
  });

  return {
    state: nextState,
    market: nextMarket,
    cycle: { ...cycle, propertyChanges },
    protectedPropertyIds,
  };
}

export function applyStockLossProtection(
  state: AuctionState,
  cycle: StockMarketCycle,
  portfolios: StockPortfolioMap,
  companies: StockCompanyData[],
): StockProtectionApplication {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  const credits = [];
  const nextTargets = { ...state.targetEffects.stockLossIndustryByPlayer };

  for (const [playerId, industryId] of Object.entries(
    state.targetEffects.stockLossIndustryByPlayer,
  )) {
    let loss = 0;
    const portfolio = portfolios[playerId] ?? {};
    for (const mover of cycle.movers) {
      const company = companyMap.get(mover.companyId);
      if (!company || company.industry !== industryId || mover.currentPrice >= mover.previousPrice) {
        continue;
      }
      const quantity = portfolio[mover.companyId]?.quantity ?? 0;
      loss += quantity * (mover.previousPrice - mover.currentPrice);
    }

    const amount = Math.floor(loss * 0.5);
    if (amount > 0) credits.push({ playerId, industryId, amount });
    delete nextTargets[playerId];
  }

  return {
    state: {
      ...state,
      targetEffects: {
        ...state.targetEffects,
        stockLossIndustryByPlayer: nextTargets,
      },
    },
    cycle,
    credits,
  };
}

export function getAuctionItemNamesByPlayer(
  state: AuctionState,
): Record<string, AuctionItemId[]> {
  return Object.fromEntries(
    Object.entries(state.inventories).map(([playerId, items]) => [
      playerId,
      items.map((item) => item.itemId),
    ]),
  ) as Record<string, AuctionItemId[]>;
}
