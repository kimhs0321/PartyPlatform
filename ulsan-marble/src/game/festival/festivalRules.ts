import type { PropertyData } from "../../types";
import { FESTIVAL_IDS } from "./festivalData";
import type {
  ActiveFestival,
  FestivalDeckState,
  FestivalId,
  TouristNpcState,
} from "./festivalTypes";

export const FESTIVAL_TRIGGER_INTERVAL = 5;
export const FESTIVAL_TRIGGER_CHANCE = 0.01;
export const TOURIST_OWNER_PAYOUT_RATE = 0.6;
export const TOURIST_MOVE_STEP_DELAY_MS = 170;

function shuffleFestivalIds(
  festivalIds: FestivalId[],
  random: () => number,
): FestivalId[] {
  const result = [...festivalIds];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [result[index], result[targetIndex]] = [
      result[targetIndex],
      result[index],
    ];
  }

  return result;
}

export function createInitialFestivalDeckState(
  random: () => number = Math.random,
): FestivalDeckState {
  return {
    drawPile: shuffleFestivalIds(FESTIVAL_IDS, random),
    cycle: 1,
  };
}

export interface FestivalTriggerResult {
  deck: FestivalDeckState;
  festivalId: FestivalId | null;
}

export function tryTriggerFestival(
  deck: FestivalDeckState,
  activeFestival: ActiveFestival | null,
  turnNumber: number,
  random: () => number = Math.random,
): FestivalTriggerResult {
  if (
    activeFestival ||
    turnNumber <= 0 ||
    turnNumber % FESTIVAL_TRIGGER_INTERVAL !== 0 ||
    random() >= FESTIVAL_TRIGGER_CHANCE
  ) {
    return {
      deck,
      festivalId: null,
    };
  }

  const currentPile =
    deck.drawPile.length > 0
      ? deck.drawPile
      : shuffleFestivalIds(FESTIVAL_IDS, random);
  const [festivalId, ...remaining] = currentPile;

  return {
    deck: {
      drawPile: remaining,
      cycle:
        deck.drawPile.length > 0
          ? deck.cycle
          : deck.cycle + 1,
    },
    festivalId: festivalId ?? null,
  };
}

export function createTouristNpcState(): TouristNpcState {
  return {
    position: 0,
    travelledSteps: 0,
    moving: false,
    lastDice: null,
  };
}

export interface TouristStepResult {
  npc: TouristNpcState;
  completedLap: boolean;
}

export function advanceTouristNpcOneStep(
  npc: TouristNpcState,
  tileCount: number,
): TouristStepResult {
  if (tileCount <= 0) {
    return {
      npc,
      completedLap: true,
    };
  }

  const travelledSteps = npc.travelledSteps + 1;
  const completedLap = travelledSteps >= tileCount;

  return {
    npc: {
      ...npc,
      position: completedLap
        ? 0
        : (npc.position + 1) % tileCount,
      travelledSteps,
    },
    completedLap,
  };
}

export function getFestivalTollMultiplier(
  activeFestival: ActiveFestival | null,
  property: PropertyData,
): number {
  if (!activeFestival) return 1;

  if (activeFestival.festivalId === "ULSAN_INDUSTRY") {
    return 1.1;
  }

  if (property.landmarkScope === "CITY") {
    return 1;
  }

  const districtByFestival: Partial<
    Record<FestivalId, PropertyData["district"]>
  > = {
    NAM_WHALE: "NAM",
    JUNG_MADUHEE: "JUNG",
    BUK_SOEBURI: "BUK",
    DONG_SHIPBUILDING: "DONG",
    ULJU_ONGGI: "ULJU",
  };

  return districtByFestival[activeFestival.festivalId] ===
    property.district
    ? 1.2
    : 1;
}

export function getTouristOwnerPayout(
  finalToll: number,
): number {
  return Math.max(
    0,
    Math.floor(finalToll * TOURIST_OWNER_PAYOUT_RATE),
  );
}
