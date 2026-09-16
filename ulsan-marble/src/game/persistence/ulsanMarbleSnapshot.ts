import type {PlayerTokenData,} from "../../components/PlayerToken";
import type {MoneyTransaction,} from "../economy/economyTypes";
import type {TurnRestoreSnapshot,} from "../turn/useTurnSystem";
import type {DoubleStreakState,} from "../doubleDice";
import type {PropertyOwnershipMap,} from "../property/propertyTypes";
import type {DevelopmentRestrictionMap,} from "../property/developmentRestrictionTypes";
import type {PropertyMarketMap,} from "../market/marketTypes";
import type {StockMarketMap,StockPortfolioMap,} from "../stock/stockTypes";
import type {CompanyDividendModifierMap,} from "../stock/companyDividendTypes";
import type {BankState,} from "../bank/bankTypes";
import type {AuctionState,} from "../auction/auctionTypes";
import type {LottoState,} from "../lottery/lotteryTypes";
import type {MayorTerm,} from "../election/electionTypes";
import type {CityHallState,} from "../cityHall/cityHallTypes";
import type {InsuranceContractMap,} from "../insurance/insuranceTypes";
import type {GoldenKeyDeckState,} from "../goldenKey/goldenKeyTypes";
import type {EconomicNewsState,} from "../economicNews/economicNewsTypes";
import type {MacroEconomyState,} from "../economy/macroEconomyTypes";
import type {PortState,} from "../port/portTypes";
import type {MiniGameState,} from "../minigame/minigameTypes";

import type {
  ActiveFestival,
  FestivalDeckState,
  TouristNpcState,
} from "../festival/festivalTypes";

import type {
  DisasterState,
  PendingDisasterResolution,
} from "../disaster/disasterTypes";

import type {
  UlsanMarbleCompanyDividendEventResolvedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

export const
  ULSAN_MARBLE_SNAPSHOT_VERSION = 1 as const;

export interface UlsanMarbleNetworkCursorSnapshot {
  processedRollId: number;
  processedPropertyDecisionId: number;
  processedStockTradeId: number;
  processedGameEventId: number;
  processedTurnSequence:
    number | null;
}

export interface UlsanMarbleGameSnapshotV1 {
  version:
    typeof ULSAN_MARBLE_SNAPSHOT_VERSION;

  roomId: string;

  playerIds: string[];

  players: PlayerTokenData[];

  transactions:
    MoneyTransaction[];

  lastSalaryPaidTurn?: number;  

  doubleStreak:
    DoubleStreakState;

  pendingExtraRoll:
    boolean;

  propertyOwnerships:
    PropertyOwnershipMap;

  developmentRestrictions:
    DevelopmentRestrictionMap;

  propertyMarket:
    PropertyMarketMap;

  stockMarket:
    StockMarketMap;

  stockPortfolios:
    StockPortfolioMap;

  companyDividendModifiers:
    CompanyDividendModifierMap;

  bankState:
    BankState;

  auctionState:
    AuctionState;

  lottoState:
    LottoState;

  currentMayorTerm:
    MayorTerm | null;

  cityHallState:
    CityHallState;

  insuranceContracts:
    InsuranceContractMap;

  goldenKeyDeck:
    GoldenKeyDeckState;

  economicNewsState:
    EconomicNewsState;

  macroEconomyState:
    MacroEconomyState;

  portState:
    PortState;

  miniGameState:
    MiniGameState;

  festivalDeckState:
    FestivalDeckState;

  activeFestival:
    ActiveFestival | null;

  touristNpc:
    TouristNpcState | null;

  disasterState:
    DisasterState;

  pendingDisasterResolution:
    PendingDisasterResolution | null;

  pendingCompanyDividendEvent:
    UlsanMarbleCompanyDividendEventResolvedPayload["event"]
    | null;

  turn:
    TurnRestoreSnapshot;

  networkCursors:
    UlsanMarbleNetworkCursorSnapshot;
}

function getStorageKey(
  roomId: string,
): string {
  return (
    `ulsan-marble:snapshot:${roomId}`
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isNullableRecord(
  value: unknown,
): value is
  | Record<string, unknown>
  | null {
  return (
    value === null ||
    isRecord(value)
  );
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function isCursorNumber(
  value: unknown,
): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0
  );
}

const VALID_TURN_PHASES =
  new Set<
    TurnRestoreSnapshot["phase"]
  >([
    "WAITING_FOR_ROLL",
    "ROLLING_DICE",
    "RESOLVING_JAIL",
    "MOVING",
    "ARRIVED",
    "RESOLVING_TILE",
    "STOCK_TRADING",
    "RESOLVING_TAX",
    "RESOLVING_MARKET",
    "RESOLVING_STOCK_MARKET",
    "RESOLVING_PORT_SETTLEMENT",
    "RESOLVING_LOTTO_DRAW",
    "RESOLVING_MAYOR_ELECTION",
    "RESOLVING_ECONOMIC_NEWS",
    "RESOLVING_DISASTER",
  ]);

function isValidSnapshot(
  value: unknown,
  roomId: string,
  expectedPlayerIds: string[],
): value is UlsanMarbleGameSnapshotV1 {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.version !==
      ULSAN_MARBLE_SNAPSHOT_VERSION ||
    value.roomId !== roomId
  ) {
    return false;
  }

    const snapshotPlayerIds =
    value.playerIds;

    if (
    !Array.isArray(snapshotPlayerIds) ||
    snapshotPlayerIds.length !==
        expectedPlayerIds.length ||
    !expectedPlayerIds.every(
        (playerId, index) =>
        snapshotPlayerIds[index] ===
        playerId,
    )
    ) {
    return false;
    }

    const snapshotPlayers =
    value.players;

    if (
    !Array.isArray(snapshotPlayers) ||
    snapshotPlayers.length !==
        expectedPlayerIds.length ||
    !snapshotPlayers.every(
        (player, index) =>
        isRecord(player) &&
        player.id ===
            expectedPlayerIds[index],
    )
    ) {
    return false;
    }

  if (
    !Array.isArray(
      value.transactions,
    )
  ) {
    return false;
  }

  if (
    value.lastSalaryPaidTurn !==
      undefined &&
    !isCursorNumber(
      value.lastSalaryPaidTurn,
    )
  ) {
    return false;
  }

  if (
    !isRecord(
      value.doubleStreak,
    ) ||
    typeof value.pendingExtraRoll !==
      "boolean" ||

    !isRecord(
      value.propertyOwnerships,
    ) ||
    !isRecord(
      value.developmentRestrictions,
    ) ||
    !isRecord(
      value.propertyMarket,
    ) ||

    !isRecord(
      value.stockMarket,
    ) ||
    !isRecord(
      value.stockPortfolios,
    ) ||
    !isRecord(
      value.companyDividendModifiers,
    ) ||
    !isRecord(
      value.bankState,
    ) ||
    !isRecord(
      value.auctionState,
    ) ||

    !isRecord(
      value.lottoState,
    ) ||
    !isNullableRecord(
      value.currentMayorTerm,
    ) ||
    !isRecord(
      value.cityHallState,
    ) ||
    !isRecord(
      value.insuranceContracts,
    ) ||
    !isRecord(
      value.goldenKeyDeck,
    ) ||
    !isRecord(
      value.economicNewsState,
    ) ||
    !isRecord(
      value.macroEconomyState,
    ) ||
    !isRecord(
      value.portState,
    ) ||
    !isRecord(
      value.miniGameState,
    ) ||
    !isRecord(
      value.festivalDeckState,
    ) ||
    !isNullableRecord(
      value.activeFestival,
    ) ||
    !isNullableRecord(
      value.touristNpc,
    ) ||

    !isRecord(
      value.disasterState,
    ) ||
    !isNullableRecord(
      value.pendingDisasterResolution,
    ) ||
    !isNullableRecord(
      value.pendingCompanyDividendEvent,
    )
  ) {
    return false;
  }

  const turn = value.turn;

  if (
    !isRecord(turn) ||
    !isFiniteNumber(
      turn.turnNumber,
    ) ||
    !isFiniteNumber(
      turn.turnSequence,
    ) ||
    typeof turn.activePlayerId !==
      "string" ||
    typeof turn.phase !== "string" ||
    !VALID_TURN_PHASES.has(
      turn.phase as
        TurnRestoreSnapshot["phase"],
    ) ||
    !expectedPlayerIds.includes(
      turn.activePlayerId,
    )
  ) {
    return false;
  }

  const cursors =
    value.networkCursors;

  if (
    !isRecord(cursors) ||
    !isCursorNumber(
      cursors.processedRollId,
    ) ||
    !isCursorNumber(
      cursors
        .processedPropertyDecisionId,
    ) ||
    !isCursorNumber(
      cursors.processedStockTradeId,
    ) ||
    !isCursorNumber(
      cursors.processedGameEventId,
    ) ||
    !(
      cursors.processedTurnSequence ===
        null ||
      isCursorNumber(
        cursors.processedTurnSequence,
      )
    )
  ) {
    return false;
  }

  return true;
}

export function readUlsanMarbleSnapshot(
  roomId: string | undefined,
  expectedPlayerIds: string[],
): UlsanMarbleGameSnapshotV1 | null {
  if (
    !roomId ||
    typeof window === "undefined"
  ) {
    return null;
  }

  const key =
    getStorageKey(roomId);

  try {
    const raw =
      window.sessionStorage.getItem(
        key,
      );

    if (!raw) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (
      !isValidSnapshot(
        parsed,
        roomId,
        expectedPlayerIds,
      )
    ) {
      window.sessionStorage.removeItem(
        key,
      );

      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(
      key,
    );

    return null;
  }
}

export function writeUlsanMarbleSnapshot(
  snapshot:
    UlsanMarbleGameSnapshotV1,
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  window.sessionStorage.setItem(
    getStorageKey(
      snapshot.roomId,
    ),
    JSON.stringify(snapshot),
  );
}

export function removeUlsanMarbleSnapshot(
  roomId: string | undefined,
): void {
  if (
    !roomId ||
    typeof window === "undefined"
  ) {
    return;
  }

  window.sessionStorage.removeItem(
    getStorageKey(roomId),
  );
}