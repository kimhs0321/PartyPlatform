import type { PlayerTokenData } from "../../components/PlayerToken";
import type { PropertyData } from "../../types";
import {
  getGeneralDepositBalance,
  getRecurringSavingsContract,
} from "../bank/bankRules";
import type { BankState } from "../bank/bankTypes";
import type { PropertyMarketMap } from "../market/marketTypes";
import { getCurrentPropertyPrice } from "../market/propertyMarket";
import { PORT_CONTRACTS } from "../port/portRules";
import type { PortState } from "../port/portTypes";
import type { PropertyOwnershipMap } from "../property/propertyTypes";
import { getPropertySalePrice } from "../property/propertyValuation";
import { getPortfolioMarketValue } from "../stock/stockMarket";
import type {
  StockMarketMap,
  StockPortfolioMap,
} from "../stock/stockTypes";
import type {
  FinalAssetBreakdown,
  FinalRankingEntry,
  GameEndReason,
  GameResult,
  GameRoundLimit,
} from "./endGameTypes";

interface FinalAssetContext {
  players: PlayerTokenData[];
  properties: PropertyData[];
  propertyOwnerships: PropertyOwnershipMap;
  propertyMarket: PropertyMarketMap;
  stockPortfolios: StockPortfolioMap;
  stockMarket: StockMarketMap;
  bankState: BankState;
  portState: PortState;
  propertySaleRate?: number;
}

interface CreateGameResultOptions extends FinalAssetContext {
  reason: GameEndReason;
  completedRound: number;
  roundLimit: GameRoundLimit;
}

function compareBreakdowns(
  first: FinalAssetBreakdown,
  second: FinalAssetBreakdown,
): number {
  return (
    second.totalAssets - first.totalAssets ||
    second.liquidAssets - first.liquidAssets ||
    second.propertySaleValue - first.propertySaleValue ||
    second.stockValue - first.stockValue ||
    first.playerName.localeCompare(second.playerName, "ko")
  );
}

function hasSameWinningMetrics(
  first: FinalAssetBreakdown,
  second: FinalAssetBreakdown,
): boolean {
  return (
    first.totalAssets === second.totalAssets &&
    first.liquidAssets === second.liquidAssets &&
    first.propertySaleValue === second.propertySaleValue &&
    first.stockValue === second.stockValue
  );
}

export function getActivePlayerCount(players: PlayerTokenData[]): number {
  return players.filter((player) => !player.isBankrupt).length;
}

export function shouldEndForLastSurvivor(
  players: PlayerTokenData[],
): boolean {
  return getActivePlayerCount(players) <= 1;
}

export function shouldEndForRoundLimit(
  turnNumber: number,
  roundLimit: GameRoundLimit,
): boolean {
  return roundLimit !== null && turnNumber > roundLimit;
}

export function calculateFinalAssetBreakdowns({
  players,
  properties,
  propertyOwnerships,
  propertyMarket,
  stockPortfolios,
  stockMarket,
  bankState,
  portState,
  propertySaleRate,
}: FinalAssetContext): FinalAssetBreakdown[] {
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );

  return players.map((player) => {
    const cash = player.money;
    const generalDeposit = getGeneralDepositBalance(bankState, player.id);
    const savingsPrincipal =
      getRecurringSavingsContract(bankState, player.id)?.principalPaid ?? 0;
    const stockValue = getPortfolioMarketValue(
      stockPortfolios[player.id] ?? {},
      stockMarket,
    );
    const propertySaleValue = Object.values(propertyOwnerships).reduce(
      (sum, ownership) => {
        if (ownership.ownerPlayerId !== player.id) return sum;

        const property = propertyMap.get(ownership.propertyId);
        if (!property) return sum;

        const currentLandPrice = getCurrentPropertyPrice(
          property,
          propertyMarket,
        );

        return (
          sum +
          getPropertySalePrice(
            ownership,
            currentLandPrice,
            propertySaleRate,
          )
        );
      },
      0,
    );
    const portRecoveryValue = portState.activeContracts.reduce(
      (sum, contract) =>
        contract.playerId === player.id
          ? sum + PORT_CONTRACTS[contract.type].failurePayout
          : sum,
      0,
    );
    const liquidAssets = cash + generalDeposit;

    return {
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      cash,
      generalDeposit,
      savingsPrincipal,
      stockValue,
      propertySaleValue,
      portRecoveryValue,
      liquidAssets,
      totalAssets:
        cash +
        generalDeposit +
        savingsPrincipal +
        stockValue +
        propertySaleValue +
        portRecoveryValue,
    };
  });
}

export function createGameResult({
  reason,
  completedRound,
  roundLimit,
  players,
  ...context
}: CreateGameResultOptions): GameResult {
  const survivors = players.filter((player) => !player.isBankrupt);
  const rankedPlayers = survivors.length > 0 ? survivors : players;
  const breakdowns = calculateFinalAssetBreakdowns({
    players: rankedPlayers,
    ...context,
  }).sort(compareBreakdowns);

  let previous: FinalAssetBreakdown | null = null;
  let previousRank = 0;
  const rankings: FinalRankingEntry[] = breakdowns.map((breakdown, index) => {
    const rank =
      previous && hasSameWinningMetrics(previous, breakdown)
        ? previousRank
        : index + 1;

    previous = breakdown;
    previousRank = rank;

    return {
      ...breakdown,
      rank,
    };
  });

  const first = rankings[0] ?? null;
  const winnerPlayerIds = first
    ? rankings
        .filter((entry) => hasSameWinningMetrics(first, entry))
        .map((entry) => entry.playerId)
    : [];

  return {
    reason,
    completedRound,
    roundLimit,
    winnerPlayerIds,
    rankings,
  };
}
