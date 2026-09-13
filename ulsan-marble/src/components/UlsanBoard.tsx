import { useCallback, useEffect, useMemo, useState } from "react";
import "./UlsanBoard.css";

import boardJson from "../data/board.json";
import propertiesJson from "../data/properties.json";
import companiesJson from "../data/companies.json";
import { useBoardCamera } from "../board/useBoardCamera";
import { validateBoardLayout } from "../board/layout";
import {
  usePrototypeGame,
  type UlsanMarbleNetworkDiceRoll,
  type UlsanMarbleNetworkPropertyDecision,
  type UlsanMarbleNetworkStockTrade,
} from "../game/usePrototypeGame";
import type {
  UlsanMarbleCommand,
  UlsanMarbleGameEvent,
} from "../../../shared/ulsanMarbleProtocol";
import {
  createPlayersFromParticipants,
  type UlsanMarbleParticipantInput,
} from "../game/prototypePlayers";
import { getNextConstructionCost } from "../game/property/propertyDevelopment";
import { getPropertyTollAmount } from "../game/property/propertyToll";
import type { PropertyDevelopmentStage } from "../game/property/propertyTypes";
import {
  getCurrentPropertyPrice,
  getPropertyPriceIndex,
} from "../game/market/propertyMarket";
import {
  getPolicyConstructionCost,
  getPolicyPropertySaleRate,
  getPolicyTollMultiplier,
} from "../game/election/policyEffects";
import { getDisasterTollMultiplier } from "../game/disaster/disasterRules";
import {
  getCityHallConstructionCostMultiplier,
  getCityHallTollMultiplier,
} from "../game/cityHall/cityHallRules";
import {
  getActiveEconomicNews,
  getEconomicNewsConstructionCostMultiplier,
} from "../game/economicNews/economicNewsRules";
import { DevTestPanel } from "../dev/DevTestPanel";
import type { BoardData, PropertiesData, PropertyData } from "../types";
import type { CompaniesData } from "../game/stock/stockTypes";
import { AssetLiquidationModal } from "./AssetLiquidationModal";
import { BoardTile } from "./BoardTile";
import { DiceAction } from "./DiceAction";
import { DiceOverlay } from "./DiceOverlay";
import { DoubleDiceNotice } from "./DoubleDiceNotice";
import { MarketChangeModal } from "./MarketChangeModal";
import { LotteryShopModal } from "./LotteryShopModal";
import { InsuranceShopModal } from "./InsuranceShopModal";
import { GoldenKeyModal } from "./GoldenKeyModal";
import { PortContractModal } from "./PortContractModal";
import { PortSettlementModal } from "./PortSettlementModal";
import { BankModal } from "./BankModal";
import { BankActivityNotice } from "./BankActivityNotice";
import { EconomicNewsModal } from "./EconomicNewsModal";
import { EconomicNewsIndicator } from "./EconomicNewsIndicator";
import { JailEntryModal } from "./JailEntryModal";
import { JailTurnModal } from "./JailTurnModal";
import { JailFineSettlementModal } from "./JailFineSettlementModal";
import { LottoDrawModal } from "./LottoDrawModal";
import { MoneyPanel } from "./MoneyPanel";
import { PlayerDock } from "./PlayerDock";
import { PlayerToken, type PlayerTokenData } from "./PlayerToken";
import { PropertyDevelopmentModal } from "./PropertyDevelopmentModal";
import { PropertyPurchaseModal } from "./PropertyPurchaseModal";
import type { PropertyCardData } from "./PropertyCard";
import { SalaryNotice } from "./SalaryNotice";
import { TaxAssetLiquidationModal } from "./TaxAssetLiquidationModal";
import { TaxPaymentModal } from "./TaxPaymentModal";
import { TollPaymentModal } from "./TollPaymentModal";
import { TurnIndicator } from "./TurnIndicator";
import { StockTurnActions } from "./StockTurnActions";
import { StockMarketModal } from "./StockMarketModal";
import { StockMarketChangeModal } from "./StockMarketChangeModal";
import { MayorElectionModal } from "./election/MayorElectionModal";
import { DisasterEventModal } from "./disaster/DisasterEventModal";
import { DisasterEffectLayer } from "./disaster/DisasterEffectLayer";
import { DisasterDamageModal } from "./disaster/DisasterDamageModal";
import { CityHallProjectModal } from "./cityHall/CityHallProjectModal";
import { MayorPolicyIndicator } from "./election/MayorPolicyIndicator";
import { AuctionModal } from "./auction/AuctionModal";
import { AuctionItemActionPanel } from "./auction/AuctionItemActionPanel";
import { AuctionItemTargetModal } from "./auction/AuctionItemTargetModal";
import { DiceRerollModal } from "./auction/DiceRerollModal";
import { MiniGameModal } from "./minigame/MiniGameModal";
import { FestivalAnnouncementModal } from "./festival/FestivalAnnouncementModal";
import { TouristNpcToken } from "./festival/TouristNpcToken";
import { TouristTurnModal } from "./festival/TouristTurnModal";
import { GameSetupModal } from "./GameSetupModal";
import { GameResultModal } from "./GameResultModal";
import {
  createGameResult,
  shouldEndForLastSurvivor,
  shouldEndForRoundLimit,
} from "../game/endGame/endGameRules";
import type { GameResult, GameRoundLimit } from "../game/endGame/endGameTypes";
import { getAuctionItemDefinition } from "../game/auction/auctionItems";
import { getSellableStockAssets } from "../game/stock/stockLiquidation";
import { getRecurringSavingsProduct } from "../game/bank/bankRules";
import {
  getInsuranceRemainingTurns,
  INSURANCE_PLANS,
  isInsuranceContractActive,
} from "../game/insurance/insuranceRules";
import {
  AssetOverviewModal,
  type AssetInsuranceSummary,
  type AssetItemSummary,
  type AssetLottoTicketSummary,
  type AssetPropertySummary,
  type AssetSavingsSummary,
} from "./AssetOverviewModal";
import { AirportTravelModal } from "./AirportTravelModal";
import { AirportFlight } from "./airport/AirportFlight";
import {StockDividendSummary,} from "./StockDividendSummary";
import {CompanyDividendEventModal,} from "./CompanyDividendEventModal";

const board = boardJson as BoardData;
const propertyData = propertiesJson as PropertiesData;
const stockData = companiesJson as unknown as CompaniesData;

function getPropertyDistrictDisplayName(
  property: PropertyData,
): string {
  if (
    property.isLandmark &&
    property.landmarkScope === "CITY"
  ) {
    return "울산 전체";
  }

  return (
    propertyData.districts[property.district]?.name ??
    property.district
  );
}

type UlsanBoardProps = {
  participants?: UlsanMarbleParticipantInput[];
  localPlayerId?: string;

  settings?: {
    startingMoney: number;
    salary: number;
    roundLimit: GameRoundLimit;
  };

  network?: {
    state: {
      activePlayerId: string;
      controllerPlayerId: string;

      turnNumber: number;
      turnSequence: number;

      phase:
        | "WAITING_FOR_ROLL"
        | "STOCK_TRADING";

      diceRoll:
        UlsanMarbleNetworkDiceRoll | null;

      propertyDecision:
        UlsanMarbleNetworkPropertyDecision | null;

      stockTrades:
        UlsanMarbleNetworkStockTrade[];

      gameEvents:
        UlsanMarbleGameEvent[];
    } | null;

    sendCommand: (
      command: UlsanMarbleCommand,
    ) => void;
  };
};

validateBoardLayout(board.tiles);

export function UlsanBoard({
  participants,
  localPlayerId,
  settings,
  network,
}: UlsanBoardProps) {

  const isNetworkGame =
    Boolean(network);
  const [gameStarted, setGameStarted] =
    useState(isNetworkGame);

  useEffect(() => {
    if (isNetworkGame) {
      setGameStarted(true);
    }
  }, [isNetworkGame]);
    
  const [
    standaloneRoundLimit,
    setStandaloneRoundLimit,
  ] =
    useState<GameRoundLimit>(50);

  const roundLimit: GameRoundLimit =
    isNetworkGame
      ? settings
        ? settings.roundLimit
        : 50
    : standaloneRoundLimit;
  const [dismissedStockMarketResolutionId,setDismissedStockMarketResolutionId,] = useState<string | null>(null);    
  const [stockDividendViewResolutionId,setStockDividendViewResolutionId,] = useState<string | null>(null,);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [assetOverviewOpen, setAssetOverviewOpen] = useState(false);
  const [completedDisasterEffectId, setCompletedDisasterEffectId] =
    useState<string | null>(null);
  const completeDisasterEffect = useCallback((eventId: string) => {
    setCompletedDisasterEffectId(eventId);
  }, []);

  const platformPlayers = useMemo(() => {
    if (!participants || participants.length === 0) {
      return undefined;
    }

    const startingMoneyInTenThousands = Math.max(
      0,
      Math.round(
        (settings?.startingMoney ?? 20_000_000) / 10_000,
      ),
    );

    return createPlayersFromParticipants(
      participants,
      startingMoneyInTenThousands,
    );
  }, [
    participants,
    settings?.startingMoney,
  ]);

  const salaryInTenThousands =
    settings === undefined
      ? undefined
      : Math.max(
          0,
          Math.round(settings.salary / 10_000),
        );

  const game = usePrototypeGame({
    tiles: board.tiles,
    properties: propertyData.properties,
    stockIndustries: stockData.industries,
    stockCompanies: stockData.companies,

    initialPlayers: platformPlayers,
    localPlayerId,
    salary: salaryInTenThousands,

    networkDiceRoll:
      network?.state?.diceRoll ?? null,

    onNetworkRollRequest:
      network
        ? () => {
            network.sendCommand({
              type: "ROLL_DICE",
            });
          }
        : undefined,

    networkPropertyDecision:
      network?.state
        ?.propertyDecision ?? null,

    onNetworkPropertyDecisionRequest:
      network
        ? (request) => {
            network.sendCommand({
              type:
                "PROPERTY_DECISION",
              ...request,
            });
          }
        : undefined,

    networkStockTrades:
      network?.state?.stockTrades ?? [],

    onNetworkStockTradeRequest:
      network
        ? (request) => {
            network.sendCommand({
              type: "STOCK_TRADE",
              ...request,
            });
          }
        : undefined,

    networkGameEvents:
      network?.state?.gameEvents ?? [],

    onNetworkGameEventRequest:
      network
        ? (event) => {
            const expectedTurnSequence =
              network.state?.turnSequence;

            if (
              expectedTurnSequence ===
              undefined
            ) {
              return;
            }

            network.sendCommand({
              type: "PUBLISH_GAME_EVENT",
              expectedTurnSequence,
              event,
            });
          }
        : undefined,

    onNetworkGameEventAck:
      network
        ? (
            eventId,
            turnSequence,
          ) => {
            network.sendCommand({
              type: "ACK_GAME_EVENT",
              eventId,
              turnSequence,
            });
          }
        : undefined,

    onNetworkTurnReady:
      network
        ? (turnSequence) => {
            network.sendCommand({
              type: "TURN_READY",
              turnSequence,
            });
          }
        : undefined,

    networkTurnNumber:
      network?.state?.turnNumber,

    networkTurnSequence:
      network?.state?.turnSequence,

    networkActivePlayerId:
      network?.state?.activePlayerId,

    networkControllerPlayerId:
      network?.state?.controllerPlayerId,  

    onNetworkEndTurnRequest:
      network
        ? () => {
            const state = network.state;

            if (
              !state ||
              state.activePlayerId !== localPlayerId ||
              state.phase !== "STOCK_TRADING"
            ) {
              return;
            }

            network.sendCommand({
              type: "END_TURN",
            });
          }
        : undefined,        

    onNetworkDevEndTurnRequest:
      network
        ? () => {
            const state =
              network.state;

            if (
              !state ||
              state.activePlayerId !==
                localPlayerId
            ) {
              return;
            }

            network.sendCommand({
              type: "DEV_END_TURN",
            });
          }
        : undefined,        

  });

  const canRequestNetworkRoll =
    !isNetworkGame ||
    (
      network?.state?.phase ===
        "WAITING_FOR_ROLL" &&
      network.state.activePlayerId ===
        localPlayerId &&
      game.turnPhase ===
        "WAITING_FOR_ROLL"
    );

  const activeTile = board.tiles[game.activePlayer.position];
  const cameraMode =
    game.airportFlight || game.movementPhase === "IDLE"
      ? "overview"
      : "follow";
  const camera = useBoardCamera({ activeTile, mode: cameraMode });

  const activePlayerCount = game.players.filter(
    (player) => !player.isBankrupt,
  ).length;
  const gameEndPending =
    gameStarted &&
    (activePlayerCount <= 1 ||
      shouldEndForRoundLimit(game.turnNumber, roundLimit));
  const gameLocked = !gameStarted || Boolean(gameResult) || gameEndPending;

  useEffect(() => {
    if (!gameStarted || gameResult) return;

    const endedBySurvival = shouldEndForLastSurvivor(game.players);
    const endedByRound = shouldEndForRoundLimit(game.turnNumber, roundLimit);

    if (!endedBySurvival && !endedByRound) return;

    setGameResult(
      createGameResult({
        reason: endedBySurvival ? "LAST_SURVIVOR" : "ROUND_LIMIT",
        completedRound:
          endedByRound && roundLimit !== null ? roundLimit : game.turnNumber,
        roundLimit,
        players: game.players,
        properties: propertyData.properties,
        propertyOwnerships: game.propertyOwnerships,
        propertyMarket: game.propertyMarket,
        stockPortfolios: game.stockPortfolios,
        stockMarket: game.stockMarket,
        bankState: game.bankState,
        portState: game.portState,
        propertySaleRate: getPolicyPropertySaleRate(game.activeMayorPolicy),
      }),
    );
  }, [
    game.activeMayorPolicy,
    game.bankState,
    game.players,
    game.portState,
    game.propertyMarket,
    game.propertyOwnerships,
    game.stockMarket,
    game.stockPortfolios,
    game.turnNumber,
    gameResult,
    gameStarted,
    roundLimit,
  ]);

  const startGame = () => {
    game.resetGame();
    setAssetOverviewOpen(false);
    setGameResult(null);
    setCompletedDisasterEffectId(null);
    setGameStarted(true);
  };

  const restartGame = () => {
    game.resetGame();
    setAssetOverviewOpen(false);
    setGameResult(null);
    setCompletedDisasterEffectId(null);
    setGameStarted(true);
  };

  const returnToSetup = () => {
    game.resetGame();
    setAssetOverviewOpen(false);
    setGameResult(null);
    setCompletedDisasterEffectId(null);
    setGameStarted(false);
  };

  const propertyMap = useMemo(
    () =>
      new Map<string, PropertyData>(
        propertyData.properties.map((property) => [property.id, property]),
      ),
    [],
  );

  const playerMap = useMemo(
    () =>
      new Map<string, PlayerTokenData>(
        game.players.map((player) => [player.id, player]),
      ),
    [game.players],
  );

  const itemNamesByPlayer = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(game.auctionState.inventories).map(
          ([playerId, items]) => [
            playerId,
            items.map((item) => getAuctionItemDefinition(item.itemId).name),
          ],
        ),
      ),
    [game.auctionState],
  );

  const playersByPosition = useMemo(() => {
    const grouped = new Map<number, PlayerTokenData[]>();

    for (const player of game.players) {
      const group = grouped.get(player.position) ?? [];
      group.push(player);
      grouped.set(player.position, group);
    }

    return grouped;
  }, [game.players]);

  const localPropertyAssets = useMemo<AssetPropertySummary[]>(() => {
    return Object.values(game.propertyOwnerships)
      .filter((ownership) => ownership.ownerPlayerId === game.localPlayer.id)
      .flatMap((ownership) => {
        const property = propertyMap.get(ownership.propertyId);
        if (!property) return [];

        const currentLandPrice = getCurrentPropertyPrice(
          property,
          game.propertyMarket,
        );
        const propertyPriceIndex = getPropertyPriceIndex(
          game.propertyMarket,
          property.id,
        );
        const sharedTollMultiplier =
          getPolicyTollMultiplier(game.activeMayorPolicy) *
          game.economicNewsTollMultiplier *
          getDisasterTollMultiplier(
            game.disasterState,
            property.id,
            game.turnNumber,
          ) *
          game.getActiveFestivalTollMultiplier(property);
        const getCurrentStageToll = (
          stage: PropertyDevelopmentStage,
        ): number =>
          getPropertyTollAmount(
            property,
            stage,
            propertyPriceIndex,
            sharedTollMultiplier *
              getCityHallTollMultiplier(game.activeCityHallTerm, stage),
          );
        const tollsByStage: AssetPropertySummary["tollsByStage"] = {
          LAND: getCurrentStageToll("LAND"),
          DEVELOPED: getCurrentStageToll("DEVELOPED"),
          BUILDING: getCurrentStageToll("BUILDING"),
          LANDMARK: getCurrentStageToll("LANDMARK"),
        };
        const baseNextConstructionCost = getNextConstructionCost(
          property,
          ownership.stage,
        );
        const activeEconomicNews = getActiveEconomicNews(
          game.economicNewsState,
          game.turnNumber,
        );
        const nextConstructionCost =
          baseNextConstructionCost === null
            ? null
            : Math.max(
                1,
                Math.round(
                  getPolicyConstructionCost(
                    baseNextConstructionCost,
                    game.activeMayorPolicy,
                  ) *
                    getCityHallConstructionCostMultiplier(
                      game.activeCityHallTerm,
                    ) *
                    getEconomicNewsConstructionCostMultiplier(
                      activeEconomicNews,
                    ),
                ),
              );
        const currentToll = tollsByStage[ownership.stage];
        const contract = game.insuranceContracts[property.id];
        const activeContract =
          contract?.playerId === game.localPlayer.id &&
          isInsuranceContractActive(contract, game.turnNumber)
            ? contract
            : null;

        return [
          {
            propertyId: property.id,
            boardTileId: property.boardTileId,
            name: property.name,
            districtId: property.district,
            isLandmark: property.isLandmark,
            districtName: getPropertyDistrictDisplayName(property),
            ownerName: game.localPlayer.name,
            ownerShortName: game.localPlayer.shortName,
            ownerColor: game.localPlayer.color,
            stage: ownership.stage,
            purchasePrice: ownership.purchasePrice,
            currentLandPrice,
            constructionInvestment: ownership.constructionInvestment,
            estimatedValue: currentLandPrice + ownership.constructionInvestment,
            nextConstructionCost,
            currentToll,
            tollsByStage,
            priceChangeRate:
              ownership.purchasePrice > 0
                ? (currentLandPrice - ownership.purchasePrice) /
                  ownership.purchasePrice
                : 0,
            insurancePlanName: activeContract
              ? INSURANCE_PLANS[activeContract.planType].name
              : null,
          },
        ];
      })
      .sort((first, second) => {
        const firstProperty = propertyMap.get(first.propertyId);
        const secondProperty = propertyMap.get(second.propertyId);
        return (
          (firstProperty?.boardTileId ?? 0) - (secondProperty?.boardTileId ?? 0)
        );
      });
  }, [
    game.activeCityHallTerm,
    game.activeMayorPolicy,
    game.getActiveFestivalTollMultiplier,
    game.disasterState,
    game.economicNewsState,
    game.economicNewsTollMultiplier,
    game.insuranceContracts,
    game.localPlayer.color,
    game.localPlayer.id,
    game.localPlayer.name,
    game.localPlayer.shortName,
    game.propertyMarket,
    game.propertyOwnerships,
    game.turnNumber,
    propertyMap,
  ]);

  const localStockAssets = useMemo(
    () =>
      getSellableStockAssets(
        game.stockPortfolios,
        stockData.companies,
        game.stockMarket,
        game.localPlayer.id,
      ),
    [game.localPlayer.id, game.stockMarket, game.stockPortfolios],
  );

  const localSavingsSummary = useMemo<AssetSavingsSummary | null>(() => {
    if (!game.localSavingsContract) return null;

    const product = getRecurringSavingsProduct(
      game.localSavingsContract.productId,
    );
    if (!product) return null;

    return {
      productName: product.name,
      installmentAmount: game.localSavingsContract.installmentAmount,
      installmentCount: game.localSavingsContract.installmentCount,
      installmentsPaid: game.localSavingsContract.installmentsPaid,
      principalPaid: game.localSavingsContract.principalPaid,
      maturityPayout: product.maturityPayout,
      failedPayments: game.localSavingsContract.failedPayments,
      nextPaymentTurn: game.localSavingsContract.nextPaymentTurn,
    };
  }, [game.localSavingsContract]);

  const localInsuranceSummaries = useMemo<AssetInsuranceSummary[]>(() => {
    return Object.values(game.insuranceContracts)
      .filter(
        (contract) =>
          contract.playerId === game.localPlayer.id &&
          isInsuranceContractActive(contract, game.turnNumber),
      )
      .flatMap((contract) => {
        const property = propertyMap.get(contract.propertyId);
        if (!property) return [];

        return [
          {
            propertyId: contract.propertyId,
            propertyName: property.name,
            planName: INSURANCE_PLANS[contract.planType].name,
            coverageRate: contract.coverageRate,
            premiumPaid: contract.premiumPaid,
            remainingTurns: getInsuranceRemainingTurns(
              contract,
              game.turnNumber,
            ),
            expiresAfterTurn: contract.expiresAfterTurn,
          },
        ];
      })
      .sort((first, second) =>
        first.propertyName.localeCompare(second.propertyName, "ko"),
      );
  }, [
    game.insuranceContracts,
    game.localPlayer.id,
    game.turnNumber,
    propertyMap,
  ]);

  const localAuctionItemSummaries = useMemo<AssetItemSummary[]>(
    () =>
      game.localAuctionItems.map((item, index) => {
        const definition = getAuctionItemDefinition(item.itemId);
        const useModeLabel =
          definition.useMode === "AUTOMATIC"
            ? "조건 충족 시 자동 적용"
            : definition.useMode === "REACTION"
              ? "상황 발생 시 사용"
              : "대상 선택 후 사용";

        return {
          key: `${item.itemId}-${index}`,
          name: definition.name,
          description: definition.description,
          rarity: definition.rarity,
          useModeLabel,
        };
      }),
    [game.localAuctionItems],
  );

  const localLottoTickets = useMemo<AssetLottoTicketSummary[]>(
    () =>
      game.lottoState.tickets
        .filter(
          (ticket) =>
            ticket.playerId === game.localPlayer.id &&
            ticket.drawNumber === game.lottoState.drawNumber,
        )
        .map((ticket) => ({
          id: ticket.id,
          drawNumber: ticket.drawNumber,
          numbers: ticket.numbers,
          purchasedTurn: ticket.purchasedTurn,
        })),
    [game.localPlayer.id, game.lottoState],
  );

  const canSellLocalStocks =
    !gameLocked &&
    !game.localPlayer.isBankrupt &&
    game.turnPhase === "STOCK_TRADING" &&
    game.activePlayerId === game.localPlayer.id;

  const pendingProperty = game.pendingPropertyPurchase?.property ?? null;
  const pendingDistrictName = pendingProperty
    ? getPropertyDistrictDisplayName(pendingProperty)
    : null;
  const pendingPurchasePlayer =
    game.pendingPurchasePlayer ?? game.activePlayer;

  const canRespondToPropertyPurchase =
    !isNetworkGame ||
    game.pendingPropertyPurchase
      ?.playerId === localPlayerId;

  const pendingPurchaseCardData = useMemo<PropertyCardData | null>(() => {
    if (!pendingProperty || game.pendingPurchasePrice === null) {
      return null;
    }

    const propertyPriceIndex = getPropertyPriceIndex(
      game.propertyMarket,
      pendingProperty.id,
    );
    const sharedTollMultiplier =
      getPolicyTollMultiplier(game.activeMayorPolicy) *
      game.economicNewsTollMultiplier *
      getDisasterTollMultiplier(
        game.disasterState,
        pendingProperty.id,
        game.turnNumber,
      ) *
      game.getActiveFestivalTollMultiplier(
        pendingProperty,
      );

    const getStageToll = (
      stage: PropertyDevelopmentStage,
    ): number =>
      getPropertyTollAmount(
        pendingProperty,
        stage,
        propertyPriceIndex,
        sharedTollMultiplier *
          getCityHallTollMultiplier(
            game.activeCityHallTerm,
            stage,
          ),
      );

    const tollsByStage: PropertyCardData["tollsByStage"] = {
      LAND: getStageToll("LAND"),
      DEVELOPED: getStageToll("DEVELOPED"),
      BUILDING: getStageToll("BUILDING"),
      LANDMARK: getStageToll("LANDMARK"),
    };

    const baseNextConstructionCost = getNextConstructionCost(
      pendingProperty,
      "LAND",
    );
    const activeEconomicNews = getActiveEconomicNews(
      game.economicNewsState,
      game.turnNumber,
    );
    const nextConstructionCost =
      baseNextConstructionCost === null
        ? null
        : Math.max(
            1,
            Math.round(
              getPolicyConstructionCost(
                baseNextConstructionCost,
                game.activeMayorPolicy,
              ) *
                getCityHallConstructionCostMultiplier(
                  game.activeCityHallTerm,
                ) *
                getEconomicNewsConstructionCostMultiplier(
                  activeEconomicNews,
                ),
            ),
          );

    return {
      propertyId: pendingProperty.id,
      boardTileId: pendingProperty.boardTileId,
      name: pendingProperty.name,
      districtId: pendingProperty.district,
      districtName: getPropertyDistrictDisplayName(pendingProperty),
      isLandmark: pendingProperty.isLandmark,
      ownerName: pendingPurchasePlayer.name,
      ownerShortName: pendingPurchasePlayer.shortName,
      ownerColor: pendingPurchasePlayer.color,
      stage: "LAND",
      currentLandPrice: game.pendingPurchasePrice,
      nextConstructionCost,
      currentToll: tollsByStage.LAND,
      tollsByStage,
      insurancePlanName: null,
    };
  }, [
    game.activeCityHallTerm,
    game.activeMayorPolicy,
    game.getActiveFestivalTollMultiplier,
    game.disasterState,
    game.economicNewsState,
    game.economicNewsTollMultiplier,
    game.pendingPurchasePrice,
    game.propertyMarket,
    game.turnNumber,
    pendingProperty,
    pendingPurchasePlayer,
  ]);

  const pendingDevelopmentProperty =
    game.pendingPropertyDevelopment?.property ?? null;
  const pendingDevelopmentDistrictName = pendingDevelopmentProperty
    ? getPropertyDistrictDisplayName(pendingDevelopmentProperty)
    : null;
  const pendingDevelopmentCurrentStage =
    game.pendingDevelopmentOwnership?.stage ?? null;
  const pendingDevelopmentCurrentToll =
    pendingDevelopmentProperty && pendingDevelopmentCurrentStage
      ? getPropertyTollAmount(
          pendingDevelopmentProperty,
          pendingDevelopmentCurrentStage,
          getPropertyPriceIndex(
            game.propertyMarket,
            pendingDevelopmentProperty.id,
          ),
          getPolicyTollMultiplier(game.activeMayorPolicy) *
            getCityHallTollMultiplier(
              game.activeCityHallTerm,
              pendingDevelopmentCurrentStage,
            ) *
            game.economicNewsTollMultiplier *
            getDisasterTollMultiplier(
              game.disasterState,
              pendingDevelopmentProperty.id,
              game.turnNumber,
            ) *
              game.getActiveFestivalTollMultiplier(
                pendingDevelopmentProperty,
              ),
        )
      : null;
  const pendingDevelopmentNextToll =
    pendingDevelopmentProperty && game.pendingDevelopmentNextStage
      ? getPropertyTollAmount(
          pendingDevelopmentProperty,
          game.pendingDevelopmentNextStage,
          getPropertyPriceIndex(
            game.propertyMarket,
            pendingDevelopmentProperty.id,
          ),
          getPolicyTollMultiplier(game.activeMayorPolicy) *
            getCityHallTollMultiplier(
              game.activeCityHallTerm,
              game.pendingDevelopmentNextStage,
            ) *
            game.economicNewsTollMultiplier *
            getDisasterTollMultiplier(
              game.disasterState,
              pendingDevelopmentProperty.id,
              game.turnNumber,
            ) *
              game.getActiveFestivalTollMultiplier(
                pendingDevelopmentProperty,
              ),
        )
      : null;


  const pendingDevelopmentCards = useMemo<{
    current: PropertyCardData | null;
    next: PropertyCardData | null;
  }>(() => {
    const property = pendingDevelopmentProperty;
    const owner = game.pendingDevelopmentPlayer;
    const currentStage = pendingDevelopmentCurrentStage;
    const nextStage = game.pendingDevelopmentNextStage;

    if (
      !property ||
      !owner ||
      !currentStage ||
      !nextStage ||
      pendingDevelopmentCurrentToll === null ||
      pendingDevelopmentNextToll === null
    ) {
      return {
        current: null,
        next: null,
      };
    }

    const currentLandPrice = getCurrentPropertyPrice(
      property,
      game.propertyMarket,
    );
    const propertyPriceIndex = getPropertyPriceIndex(
      game.propertyMarket,
      property.id,
    );
    const sharedTollMultiplier =
      getPolicyTollMultiplier(game.activeMayorPolicy) *
      game.economicNewsTollMultiplier *
      getDisasterTollMultiplier(
        game.disasterState,
        property.id,
        game.turnNumber,
      ) *
      game.getActiveFestivalTollMultiplier(property);

    const getStageToll = (
      stage: PropertyDevelopmentStage,
    ): number =>
      getPropertyTollAmount(
        property,
        stage,
        propertyPriceIndex,
        sharedTollMultiplier *
          getCityHallTollMultiplier(
            game.activeCityHallTerm,
            stage,
          ),
      );

    const tollsByStage: PropertyCardData["tollsByStage"] = {
      LAND: getStageToll("LAND"),
      DEVELOPED: getStageToll("DEVELOPED"),
      BUILDING: getStageToll("BUILDING"),
      LANDMARK: getStageToll("LANDMARK"),
    };

    const activeEconomicNews = getActiveEconomicNews(
      game.economicNewsState,
      game.turnNumber,
    );

    const getAdjustedNextCost = (
      stage: PropertyDevelopmentStage,
    ): number | null => {
      const baseCost = getNextConstructionCost(property, stage);

      if (baseCost === null) {
        return null;
      }

      return Math.max(
        1,
        Math.round(
          getPolicyConstructionCost(
            baseCost,
            game.activeMayorPolicy,
          ) *
            getCityHallConstructionCostMultiplier(
              game.activeCityHallTerm,
            ) *
            getEconomicNewsConstructionCostMultiplier(
              activeEconomicNews,
            ),
        ),
      );
    };

    const contract = game.insuranceContracts[property.id];
    const activeContract =
      contract?.playerId === owner.id &&
      isInsuranceContractActive(contract, game.turnNumber)
        ? contract
        : null;

    const commonCardData = {
      propertyId: property.id,
      boardTileId: property.boardTileId,
      name: property.name,
      districtId: property.district,
      districtName: getPropertyDistrictDisplayName(property),
      isLandmark: property.isLandmark,
      ownerName: owner.name,
      ownerShortName: owner.shortName,
      ownerColor: owner.color,
      currentLandPrice,
      tollsByStage,
      insurancePlanName: activeContract
        ? INSURANCE_PLANS[activeContract.planType].name
        : null,
    };

    return {
      current: {
        ...commonCardData,
        stage: currentStage,
        nextConstructionCost: game.pendingDevelopmentCost,
        currentToll: pendingDevelopmentCurrentToll,
      },
      next: {
        ...commonCardData,
        stage: nextStage,
        nextConstructionCost: getAdjustedNextCost(nextStage),
        currentToll: pendingDevelopmentNextToll,
      },
    };
  }, [
    game.activeCityHallTerm,
    game.activeMayorPolicy,
    game.getActiveFestivalTollMultiplier,
    game.disasterState,
    game.economicNewsState,
    game.economicNewsTollMultiplier,
    game.insuranceContracts,
    game.pendingDevelopmentCost,
    game.pendingDevelopmentNextStage,
    game.pendingDevelopmentPlayer,
    game.propertyMarket,
    game.turnNumber,
    pendingDevelopmentCurrentStage,
    pendingDevelopmentCurrentToll,
    pendingDevelopmentNextToll,
    pendingDevelopmentProperty,
  ]);

  const pendingTollProperty = game.pendingTollPayment?.property ?? null;
  const pendingTollDistrictName = pendingTollProperty
    ? getPropertyDistrictDisplayName(pendingTollProperty): null;

  const pendingDisasterEvent =
    game.pendingDisasterResolution?.stage === "EVENT"
      ? game.pendingDisasterResolution.event : null;

  const visibleAirportTravel =
    !isNetworkGame
      ? game.pendingAirportTravel
      : game.pendingAirportTravel
          ?.playerId === localPlayerId
        ? game.pendingAirportTravel  : null;

  const visibleBankShop =
    !isNetworkGame
      ? game.pendingBankShop
      : game.pendingBankShop
            ?.playerId ===
          localPlayerId
        ? game.pendingBankShop
        : null;

  const visibleLotteryShop =
    (
      !isNetworkGame ||
      game.pendingLotteryShop?.playerId ===
        game.localPlayer?.id
    )
      ? game.pendingLotteryShop
      : null;        

  const disasterEffectEvent =
    pendingDisasterEvent &&
    completedDisasterEffectId !== pendingDisasterEvent.id
      ? pendingDisasterEvent
      : null;

  const visiblePortShop =
    !isNetworkGame
      ? game.pendingPortShop
      : game.pendingPortShop
            ?.playerId ===
          localPlayerId
        ? game.pendingPortShop
        : null;      

  const visibleInsuranceShop =
    !isNetworkGame
      ? game.pendingInsuranceShop
      : game.pendingInsuranceShop?.playerId ===
          localPlayerId
        ? game.pendingInsuranceShop
        : null;

  const visibleStockMarketResolution =
    game.pendingStockMarketResolution &&
    game.pendingStockMarketResolution.resolutionId !==
      dismissedStockMarketResolutionId
      ? game.pendingStockMarketResolution
      : null;

  const isVisibleStockDividendTurn =
    Boolean(
      visibleStockMarketResolution &&
        visibleStockMarketResolution.mode ===
          "SCHEDULED" &&
        visibleStockMarketResolution
          .turnNumber > 0 &&
        visibleStockMarketResolution
          .turnNumber %
          5 ===
          0,
    );

  const isShowingStockDividend =
    Boolean(
      visibleStockMarketResolution &&
        isVisibleStockDividendTurn &&
        stockDividendViewResolutionId ===
          visibleStockMarketResolution
            .resolutionId,
    );      

  const handleStockMarketResolutionConfirm = () => {
    const resolution =
      game.pendingStockMarketResolution;

    if (!resolution) return;

    if (
      game.canConfirmPendingStockMarketResolution
    ) {
      game.completePendingStockMarketResolution();
      return;
    }

    setDismissedStockMarketResolutionId(
      resolution.resolutionId,
    );
  };      

  const handleStockMarketChangeNext =
    () => {
      const resolution =
        visibleStockMarketResolution;

      if (!resolution) {
        return;
      }

      if (
        isVisibleStockDividendTurn
      ) {
        setStockDividendViewResolutionId(
          resolution.resolutionId,
        );

        return;
      }

      handleStockMarketResolutionConfirm();
    };

    return (
    <main className="map-prototype">
      <div className="game-screen">
        <div
          className="board-viewport"
          ref={camera.viewportRef}
        >
          <div
            className="board-camera-position"
            style={camera.cameraPositionStyle}
          >
            <div className="board-camera-scale" style={camera.cameraScaleStyle}>
              <div className="ulsan-board" ref={camera.boardRef}>
                {board.tiles.map((tile) => {
                  const ownership = tile.propertyId
                    ? game.propertyOwnerships[tile.propertyId]
                    : undefined;
                  const owner = ownership
                    ? playerMap.get(ownership.ownerPlayerId)
                    : undefined;
                  const restriction = tile.propertyId
                    ? game.visibleDevelopmentRestrictions[tile.propertyId]
                    : undefined;
                  const restrictionLabel = restriction
                    ? game.turnNumber < restriction.activeFromTurn
                      ? "개발 제한 예정"
                      : `개발 제한 ${
                          restriction.expiresAfterTurn -
                          game.turnNumber +
                          1
                        }턴`
                    : undefined;

                  return (
                    <BoardTile
                      key={tile.id}
                      tile={tile}
                      property={
                        tile.propertyId
                          ? propertyMap.get(tile.propertyId)
                          : undefined
                      }
                      districts={propertyData.districts}
                      owner={owner}
                      developmentStage={ownership?.stage}
                      developmentRestrictionLabel={restrictionLabel}
                    />
                  );
                })}

                <section
                  className="ulsan-board__center"
                  aria-label="중앙 게임 연출 영역"
                >
                  <div className="center-watermark" aria-hidden="true">
                    <span>ULSAN</span>
                    <strong>울산마블</strong>
                  </div>
                </section>

                {game.players.map((player) => {
                  if (game.airportFlight?.playerId === player.id) {
                    return null;
                  }

                  const playersOnTile =
                    playersByPosition.get(player.position) ?? [player];

                  const slotIndex = playersOnTile.findIndex(
                    (sameTilePlayer) => sameTilePlayer.id === player.id,
                  );

                  return (
                    <PlayerToken
                      key={player.id}
                      player={player}
                      tile={board.tiles[player.position]}
                      slotIndex={slotIndex}
                      slotCount={playersOnTile.length}
                      active={player.id === game.activePlayerId}
                      moving={
                        game.isTokenMoving &&
                        player.id === game.activePlayerId
                      }
                    />
                  );
                })}

                <AirportFlight
                  flight={game.airportFlight}
                  player={
                    game.airportFlight
                      ? game.players.find(
                          (player) =>
                            player.id === game.airportFlight?.playerId,
                        ) ?? null
                      : null
                  }
                  onComplete={game.completeAirportFlight}
                />

                {game.touristNpc && (
                  <TouristNpcToken
                    npc={game.touristNpc}
                    tile={board.tiles[game.touristNpc.position]}
                    festival={game.activeFestival}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="game-ui-layer">
          {import.meta.env.DEV && (
            <DevTestPanel
            players={game.players}
              activePlayerId={game.activePlayerId}
              tiles={board.tiles}
              properties={propertyData.properties}
              propertyOwnerships={game.propertyOwnerships}
              propertyMarket={game.propertyMarket}
              stockCompanies={stockData.companies}
              stockMarket={game.stockMarket}
              stockPortfolios={game.stockPortfolios}
              lottoState={game.lottoState}
              currentMayorTerm={game.currentMayorTerm}
              activeMayorPolicy={game.activeMayorPolicy}
              cityHallState={game.cityHallState}
              activeCityHallTerm={game.activeCityHallTerm}
              disasterState={game.disasterState}
              activeDisasterPenalties={game.activeDisasterPenalties}
              insuranceContracts={game.insuranceContracts}
              bankState={game.bankState}
              economicNewsState={game.economicNewsState}
              activeFestival={game.activeFestival}
              touristNpc={game.touristNpc}
              festivalBusy={game.isFestivalSettlementBusy}
              turnNumber={game.turnNumber}
              canUseActions={game.dev.canUseActions && !gameLocked &&(!isNetworkGame || game.activePlayerId === localPlayerId)}
              canReset={game.dev.canReset}
              onSelectPlayer={game.dev.selectActivePlayer}
              onSetTurnNumber={game.dev.setTurnNumber}
              onMovePlayer={game.dev.moveActivePlayer}
              onSetPlayerMoney={game.dev.setActivePlayerMoney}
              onRunPropertyMarketCycle={game.dev.runPropertyMarketCycle}
              onRunStockMarketCycle={game.dev.runStockMarketCycle}
              onRunLottoDraw={game.dev.runLottoDraw}
              onRunMayorElection={game.dev.runMayorElection}
              onRunCityHall={game.dev.runCityHall}
              onRunRandomEconomicNews={game.dev.runRandomEconomicNews}
              onResetRandomEconomicNewsCooldown={
                game.dev.resetRandomEconomicNewsCooldown
              }
              onRunDisaster={game.dev.runDisaster}
              onResetDisasterCooldown={game.dev.resetDisasterCooldown}
              onRunFestival={game.dev.runFestival}
              onEndFestival={game.dev.endFestival}
              onSetInsuranceContract={game.dev.setInsuranceContract}
              onExpireInsuranceContract={game.dev.expireInsuranceContract}
              onTeleportPlayer={game.dev.teleportActivePlayer}
              onRollDice={(firstDice, secondDice) => {
              if (!network) {
                void game.dev.rollDice(
                  firstDice,
                  secondDice,
                );
                return;
              }

              const state = network.state;

              if (
                !state ||
                state.activePlayerId !==
                  localPlayerId ||
                state.phase !==
                  "WAITING_FOR_ROLL" ||
                game.turnPhase !==
                  "WAITING_FOR_ROLL"
              ) {
                return;
              }

              network.sendCommand({
                type: "DEV_ROLL_DICE",
                values: [
                  firstDice,
                  secondDice,
                ],
              });
            }}
              canEndTurn={
                !gameLocked &&
                (
                  network
                    ? (
                        network.state?.phase ===
                          "WAITING_FOR_ROLL" &&
                        network.state.activePlayerId ===
                          localPlayerId
                      )
                    : game.dev.canEndTurn
                )
              }

              onEndTurn={
                network
                  ? () => {
                      const state =
                        network.state;

                      if (
                        !state ||
                        state.phase !==
                          "WAITING_FOR_ROLL" ||
                        state.activePlayerId !==
                          localPlayerId
                      ) {
                        return;
                      }

                      console.log(
                        "[DEV END TURN CLICK]",
                        {
                          serverPhase:
                            state.phase,
                          serverActivePlayerId:
                            state.activePlayerId,
                          localPlayerId,
                          localPhase:
                            game.turnPhase,
                          localActivePlayerId:
                            game.activePlayerId,
                        },
                      );

                      network.sendCommand({
                        type: "DEV_END_TURN",
                      });
                    }
                  : game.dev.endTurn
              }
              onResetGame={game.dev.resetGame}
              
        
            />
          )}

          <DiceOverlay
            visible={game.isDiceVisible}
            animating={game.isDiceAnimating}
            values={game.diceValues}
          />

          <FestivalAnnouncementModal
            announcement={
              game.pendingFestivalAnnouncement
            }
            canConfirm={
              game.canConfirmFestivalAnnouncement
            }
            onConfirm={
              game.completeFestivalAnnouncement
            }
          />

          <TouristTurnModal
            result={
              game.pendingTouristTurnResult
            }
            canConfirm={
              game.canConfirmTouristTurn
            }
            onConfirm={
              game.completePendingTouristTurn
            }
/>

          <SalaryNotice notice={game.salaryNotice} />
          <DoubleDiceNotice notice={game.doubleDiceNotice} />
          <BankActivityNotice notice={game.currentBankNotice} />

          <div className="local-finance-dock">
            <MoneyPanel
              player={game.localPlayer}
              latestTransaction={
                game.latestLocalTransaction
              }
              generalDepositBalance={
                game.localGeneralDepositBalance
              }
              savingsContract={
                game.localSavingsContract
              }
            />

            {gameStarted && !gameResult && (
              <button
                type="button"
                className="local-finance-dock__asset-button"
                onClick={() =>
                  setAssetOverviewOpen(true)
                }
                aria-haspopup="dialog"
              >
                <span>보유 현황</span>
                <strong>내 자산</strong>
                <small>전체 보기 →</small>
              </button>
            )}

            {(
              !isNetworkGame ||
              game.activePlayerId ===
                game.localPlayer.id
            ) && (
              <AuctionItemActionPanel
                items={game.activePlayerAuctionItems}
                targetEffects={
                  game.auctionState.targetEffects
                }
                playerId={game.localPlayer.id}
                enabled={
                  game.canRoll &&
                  !game.activePlayerIsJailed &&
                  !gameLocked
                }
                onUseTargetedItem={
                  game.beginAuctionTargetItem
                }
              />
            )}
          </div>

          <PlayerDock
            side="left"
            players={game.players}
            activePlayerId={game.activePlayerId}
            itemNamesByPlayer={itemNamesByPlayer}
          />

          <PlayerDock
            side="right"
            players={game.players}
            activePlayerId={game.activePlayerId}
            itemNamesByPlayer={itemNamesByPlayer}
          />

          <TurnIndicator
            turnNumber={
              roundLimit === null
                ? game.turnNumber
                : Math.min(game.turnNumber, roundLimit)
            }
            roundLimit={roundLimit ?? undefined}
            phase={game.turnPhase}
            player={game.activePlayer}
            tile={activeTile}
            lastMove={game.lastMove}
          />

          <MayorPolicyIndicator
            mayorTerm={game.currentMayorTerm}
            turnNumber={game.turnNumber}
          />

          <EconomicNewsIndicator
            news={game.visibleEconomicNews}
            cityHallTerm={game.activeCityHallTerm}
            disasterPenalties={game.activeDisasterPenalties}
            industries={stockData.industries}
            interestRateLevel={game.macroEconomyState.interestRateLevel}
            macroReports={game.macroEconomyState.reportHistory}
            turnNumber={game.turnNumber}
          />

          {!game.activePlayerIsJailed && (
            <DiceAction
              phase={game.turnPhase}
              onRoll={() => void game.rollDice()}
              disabled={
                gameLocked ||
                !canRequestNetworkRoll
              }
          />
          )}

            <StockTurnActions
              visible={
                !gameLocked &&
                !game.isFestivalSettlementBusy &&
                !game.activePlayerIsJailed &&
                game.turnPhase === "STOCK_TRADING" &&
                (
                  !isNetworkGame ||
                  (
                    network?.state?.phase ===
                      "STOCK_TRADING" &&
                    network.state.activePlayerId ===
                      localPlayerId
                  )
                )
              }
              onOpenMarket={game.openStockMarket}
              onEndTurn={
                network
                  ? () => {
                      if (
                        network.state?.phase !==
                          "STOCK_TRADING" ||
                        network.state.activePlayerId !==
                          localPlayerId
                      ) {
                        return;
                      }

                      network.sendCommand({
                        type: "END_TURN",
                      });
                    }
                  : game.completeStockTrading
              }
/>

          <LotteryShopModal
            shop={visibleLotteryShop}
            player={game.pendingLotteryPlayer}
            lottoState={game.lottoState}
            playerTickets={game.pendingLotteryPlayerTickets}
            error={game.lotteryShopError}
            onBuyScratch={ game.buyScratchTicket}
            onBuyLotto={game.buyLottoTickets}
            onClose={game.closeLotteryShop}
          />

          <InsuranceShopModal
            shop={visibleInsuranceShop}
            player={visibleInsuranceShop? game.pendingInsurancePlayer:null}
            assets={visibleInsuranceShop? game.pendingInsuranceAssets: []}
            turnNumber={game.turnNumber}
            error={game.insuranceShopError}
            canInteract={Boolean(visibleInsuranceShop,)}
            onBuy={game.buyInsurance}
            onClose={game.closeInsuranceShop}
          />

          <GoldenKeyModal
            resolution={game.pendingGoldenKey}
            player={game.pendingGoldenKeyPlayer}
            remainingCardCount={
              game.goldenKeyDeck.drawPile.length
            }
            cycle={game.goldenKeyDeck.cycle}
            canInteract={
              game.pendingGoldenKey?.playerId ===
              game.localPlayer.id
            }
            onApply={game.applyPendingGoldenKey}
            onClose={() =>
              void game.closePendingGoldenKey()
            }
          />

          <CityHallProjectModal
            selection={game.pendingCityHallSelection}
            player={game.pendingCityHallPlayer}
            industries={stockData.industries}
            properties={game.pendingCityHallPropertyOptions}
            canInteract={game.canInteractWithCityHall}
            onSubmit={game.submitPendingCityHallApplication}
            onClose={game.closePendingCityHallApplication}
          />
          <EconomicNewsModal
            resolution={game.pendingEconomicNews}
            player={game.pendingEconomicNewsPlayer}
            remainingArticleCount={game.economicNewsState.drawPile.length}
            cycle={game.economicNewsState.cycle}
            canInteract={game.canInteractWithEconomicNews}
            onApply={game.applyPendingEconomicNews}
            onClose={game.closePendingEconomicNews}
          />

          <AirportTravelModal
            travel={visibleAirportTravel}
            player={game.pendingAirportPlayer}
            destinations={game.airportDestinationTiles}
            error={game.airportTravelError}
            onTravel={game.travelFromAirport}
            onClose={game.closeAirportTravel}
          />

          <PortContractModal
            shop={visiblePortShop}
            player={game.pendingPortPlayer}
            activeContract={game.pendingPortActiveContract}
            error={game.portShopError}
            onBuy={game.buyPortContract}
            onClose={game.closePortShop}
          />

          <PortSettlementModal
            settlement={game.pendingPortSettlement}
            players={game.players}
            canConfirm={!isNetworkGame || network?.state?.controllerPlayerId === game.localPlayer.id }
            onConfirm={game.completePendingPortSettlement}
          />

          <BankModal
            shop={visibleBankShop}
            player={game.pendingBankPlayer}
            generalDepositBalance={game.pendingBankDepositBalance}
            savingsContract={game.pendingBankSavingsContract}
            error={game.bankShopError}
            onDeposit={game.depositPendingBank}
            onWithdraw={game.withdrawPendingBank}
            onStartSavings={game.startPendingSavings}
            onClose={game.closeBankShop}
          />

          <AuctionModal
            auction={game.pendingAuction}
            players={game.players}
            inventories={game.auctionState.inventories}
            error={game.auctionError}
            localPlayerId={isNetworkGame? game.localPlayer.id: undefined}
            onBid={game.placeAuctionBid}
            onPass={game.passAuctionBid}onDiscard={game.discardAuctionItemForWinner}
            onClose={game.closePendingAuction}
          />

          <AuctionItemTargetModal
            selection={game.pendingAuctionTarget}
            player={game.pendingAuctionTargetPlayer}
            onSelect={game.confirmAuctionItemTarget}
            onCancel={game.cancelAuctionItemTarget}
          />

          <MiniGameModal
            game={game.pendingMiniGame}
            players={game.players}
            error={game.miniGameError}
            localPlayerId={isNetworkGame? game.localPlayer.id : undefined}
            onTimingStop={game.submitTimingStop}
            onRollTargetDice={game.rollTargetMiniGameDice}
            onBetOddEven={game.submitOddEvenBet}
            onBetHighLow={game.submitHighLowBet}
            onPassBet={game.passMiniGameBet}
            onClose={game.completePendingMiniGame}
          />

          <DiceRerollModal
            pending={game.pendingDiceReroll}
            player={game.pendingDiceRerollPlayer}
            onKeep={() => void game.keepPendingDiceResult()}
            onReroll={() => void game.rerollPendingDiceResult()}
          />

          <JailEntryModal
            player={game.pendingJailEntryPlayer}
            canConfirm={!isNetworkGame || game.pendingJailEntry?.playerId === localPlayerId}
            onConfirm={ game.closeJailEntry}
          />

          <JailTurnModal
            player={
              !gameLocked &&
              game.turnPhase === "WAITING_FOR_ROLL" &&
              game.activePlayerIsJailed &&
              !game.pendingJailFine
                ? game.activePlayer
                : null  }
            error={game.jailActionError}
            busy={ game.isDiceAnimating || game.isJailTurnActionPending}
            canInteract={ !isNetworkGame || ( network?.state?.activePlayerId === localPlayerId && game.activePlayerId === localPlayerId)}
            onPayBail={() => void game.payJailBail()}
            onTryDouble={() => void game.attemptJailDouble()}
            onUseEscapeCard={() => void game.useJailEscapeCard()}
          />
          
          {(
            !isNetworkGame || game.pendingJailFinePlayer?.id === game.localPlayer.id ) && (
            <JailFineSettlementModal
              player={ game.pendingJailFinePlayer}
              amountDue={ game.pendingJailFine?.amount ?? 0}
              shortfall={ game.pendingJailShortfall}
              liquidationValue={ game.pendingJailLiquidationValue}
              propertyAssets={ game.pendingJailLiquidationAssets }
              stockAssets={ game.pendingJailStockLiquidationAssets}
              canPay={ game.canPayPendingJailFine}
              canInteract={ game.canInteractWithPendingJailFine }
              canCoverAfterLiquidation={ game.canCoverPendingJailFineAfterLiquidation}
              canDeclareBankruptcy={ game.canDeclarePendingJailBankruptcy}
              error={ game.jailLiquidationError }
              onPay={ game.payPendingJailFine}
              onSellProperty={ game.sellPropertyForPendingJailFine }
              onSellStock={ game.sellStockForPendingJailFine}
              onDeclareBankruptcy={ game.declarePendingJailBankruptcy}
            />
          )}

          <PropertyPurchaseModal
            property={pendingProperty}
            propertyCard={pendingPurchaseCardData}
            districtName={pendingDistrictName}
            player={pendingPurchasePlayer}
            purchasePrice={game.pendingPurchasePrice}
            showBalance={
              pendingPurchasePlayer.id ===
              game.localPlayer.id
            }
            canAfford={
              game.canPurchasePendingProperty
            }
            canRespond={
              canRespondToPropertyPurchase
            }
            landmarkRequirement={
              game.pendingLandmarkPurchaseRequirement
            }
            error={game.propertyPurchaseError}
            purchaseSignal={
              network?.state?.propertyDecision ?? null
            }
            onPurchase={
              game.buyPendingProperty
            }
            onDecline={
              game.declinePendingProperty
            }
          />


          <PropertyDevelopmentModal
            property={pendingDevelopmentProperty}
            districtName={pendingDevelopmentDistrictName}
            player={game.pendingDevelopmentPlayer}
            currentStage={pendingDevelopmentCurrentStage}
            nextStage={game.pendingDevelopmentNextStage}
            constructionCost={game.pendingDevelopmentCost}
            currentToll={pendingDevelopmentCurrentToll}
            nextToll={pendingDevelopmentNextToll}
            currentCard={pendingDevelopmentCards.current}
            nextCard={pendingDevelopmentCards.next}
            showBalance={
              game.pendingDevelopmentPlayer?.id === game.localPlayer.id
            }
            canAfford={game.canDevelopPendingProperty}
            error={game.propertyDevelopmentError}
            onBuild={game.buildPendingProperty}
            onDecline={game.declinePendingDevelopment}
          />

          {game.pendingTollPayment && !game.canPayPendingToll ? (
            <AssetLiquidationModal
              debtProperty={pendingTollProperty}
              districtName={pendingTollDistrictName}
              payer={game.pendingTollPayer}
              owner={game.pendingTollOwner}
              amountDue={game.pendingTollPayment.amount}
              shortfall={game.pendingTollShortfall}
              liquidationValue={game.pendingLiquidationValue}
              propertyAssets={game.pendingLiquidationAssets}
              stockAssets={game.pendingStockLiquidationAssets}
              canCoverAfterLiquidation={
                game.canCoverPendingTollAfterLiquidation
              }
              canDeclareBankruptcy={game.canDeclarePendingTollBankruptcy}
              error={game.assetLiquidationError}
              canUseExemptionItem={game.canUsePendingTollExemption}
              onUseExemptionItem={game.usePendingTollExemption}
              onSellProperty={game.sellPropertyForPendingToll}
              onSellStock={game.sellStockForPendingToll}
              onDeclareBankruptcy={game.declarePendingTollBankruptcy}
            />
          ) : (
            <TollPaymentModal
              property={pendingTollProperty}
              districtName={pendingTollDistrictName}
              payer={game.pendingTollPayer}
              owner={game.pendingTollOwner}
              amount={game.pendingTollPayment?.amount ?? 0}
              ownerIncomeAmount={game.pendingTollOwnerIncome}
              stage={game.pendingTollPayment?.stage ?? null}
              showPayerBalance={ game.pendingTollPayer?.id === game.localPlayer.id }
              canPay={game.canPayPendingToll && game.pendingTollPayer?.id === game.localPlayer.id}
              canInteract={!isNetworkGame || game.pendingTollPayer?.id === game.localPlayer.id}
              error={game.tollPaymentError}
              canUseExemptionItem={game.canUsePendingTollExemption}
              onUseExemptionItem={game.usePendingTollExemption}
              onPay={game.payPendingToll}
            />
          )}

          {game.pendingTaxAssessment && game.canInteractWithPendingTax && !game.canPayPendingTax ? (
            <TaxAssetLiquidationModal
              assessment={game.pendingTaxAssessment}
              player={game.pendingTaxPlayer}
              currentNumber={ (game.pendingTaxSettlement?.currentIndex ?? 0) + 1}
              totalCount={ game.pendingTaxSettlement?.assessments.length ?? 0}
              shortfall={game.pendingTaxShortfall}
              liquidationValue={game.pendingTaxLiquidationValue}
              propertyAssets={game.pendingTaxLiquidationAssets}
              stockAssets={game.pendingTaxStockLiquidationAssets}
              canCoverAfterLiquidation={game.canCoverPendingTaxAfterLiquidation}
              canDeclareBankruptcy={ game.canDeclarePendingTaxBankruptcy}
              error={game.taxLiquidationError}
              canInteract={game.canInteractWithPendingTax}
              onSellProperty={game.sellPropertyForPendingTax}
              onSellStock={game.sellStockForPendingTax}
              onDeclareBankruptcy={ game.declarePendingTaxBankruptcy}
            />
          ) : (
            <TaxPaymentModal
              assessment={game.pendingTaxAssessment}
              player={game.pendingTaxPlayer}
              currentNumber={ (game.pendingTaxSettlement?.currentIndex ?? 0) + 1}
              totalCount={game.pendingTaxSettlement?.assessments.length ?? 0}
              showBalance={game.pendingTaxPlayer?.id === game.localPlayer.id}
              canPay={game.canPayPendingTax}
              canInteract={game.canInteractWithPendingTax}
              error={game.taxPaymentError}
              onPay={game.payPendingTax}
            />
          )}

          <StockMarketModal
            open={game.isStockMarketOpen}
            player={game.activePlayer}
            industries={stockData.industries}
            companies={stockData.companies}
            market={game.stockMarket}
            portfolios={game.stockPortfolios}
            dividendModifiers={game.companyDividendModifiers}
            error={game.stockTradeError}
            onBuy={game.buyStock}
            onSell={game.sellStock}
            onClose={game.closeStockMarket}
          />

          <MarketChangeModal
            cycle={game.pendingMarketResolution?.cycle ?? null}
            districts={propertyData.districts}
            devMode={game.pendingMarketResolution?.mode === "DEV"}
            canConfirm={game.canConfirmPendingMarketResolution}
            onConfirm={game.completePendingMarketResolution}
          />

          <CompanyDividendEventModal
            event={game.pendingCompanyDividendEvent}
            onConfirm={game.dismissCompanyDividendEvent}
          />

          <StockMarketChangeModal
            cycle={!isShowingStockDividend ? visibleStockMarketResolution ?.cycle ?? null : null}
            industries={stockData.industries}
            devMode={visibleStockMarketResolution ?.mode === "DEV"}
            canConfirm={ Boolean(visibleStockMarketResolution,)}
            actionLabel={isVisibleStockDividendTurn ? "다음" : "확인"}
            onConfirm={handleStockMarketChangeNext}
          />

          <StockDividendSummary
            open={isShowingStockDividend}
            turnNumber={visibleStockMarketResolution ?.turnNumber ?? 0}
            credits={visibleStockMarketResolution ?.dividendCredits ?? []}
            playerId={game.localPlayer.id}
            playerName={game.localPlayer.name}
            onConfirm={handleStockMarketResolutionConfirm}
          />

          <LottoDrawModal
            result={game.pendingLottoDrawResolution?.result ?? null}
            players={game.players}
            devMode={game.pendingLottoDrawResolution?.mode === "DEV"}
            canConfirm={game.canConfirmLottoDraw}
            onConfirm={game.completePendingLottoDrawResolution}
          />

          <MayorElectionModal
            election={game.pendingMayorElection}
            players={game.players}
            canVote={game.canVoteInMayorElection}
            canConfirmResult={game.canConfirmMayorElectionResult}
            onVote={game.castMayorElectionVote}
            onConfirmResult={game.completePendingMayorElection}
          />

          <DisasterEventModal
            event={ disasterEffectEvent ? null : pendingDisasterEvent}
            players={game.players}
            districts={propertyData.districts}
            canConfirm={game.canConfirmPendingDisasterEvent}
            onConfirm={game.acknowledgePendingDisasterEvent}
          />
    
          <DisasterDamageModal
            disasterName={game.pendingDisasterResolution?.event.name ?? null}
            assessment={game.pendingDisasterAssessment}
            player={game.pendingDisasterPlayer}
            currentNumber={
              (game.pendingDisasterResolution?.currentAssessmentIndex ?? 0) + 1
            }
            totalCount={
              game.pendingDisasterResolution?.event.playerAssessments.length ??
              0
            }
            shortfall={game.pendingDisasterShortfall}
            liquidationValue={game.pendingDisasterLiquidationValue}
            propertyAssets={game.pendingDisasterLiquidationAssets}
            stockAssets={game.pendingDisasterStockLiquidationAssets}
            canPay={game.canPayPendingDisaster}
            canCoverAfterLiquidation={
              game.canCoverPendingDisasterAfterLiquidation
            }
            canDeclareBankruptcy={game.canDeclarePendingDisasterBankruptcy}
            canInteract={game.canInteractWithPendingDisaster}
            paymentError={game.disasterPaymentError}
            liquidationError={game.disasterLiquidationError}
            onPay={game.payPendingDisasterRepair}
            onSellProperty={game.sellPropertyForPendingDisaster}
            onSellStock={game.sellStockForPendingDisaster}
            onDeclareBankruptcy={game.declarePendingDisasterBankruptcy}
          />

          <AssetOverviewModal
            open={assetOverviewOpen}
            player={game.localPlayer}
            properties={localPropertyAssets}
            generalDepositBalance={game.localGeneralDepositBalance}
            savings={localSavingsSummary}
            insurances={localInsuranceSummaries}
            stocks={localStockAssets}
            auctionItems={localAuctionItemSummaries}
            lottoTickets={localLottoTickets}
            lottoDrawNumber={game.lottoState.drawNumber}
            canSellStocks={canSellLocalStocks}
            stockTradeError={game.stockTradeError}
            onSellStock={game.sellStock}
            onClose={() => setAssetOverviewOpen(false)}
          />

          <GameSetupModal
            open={
              !isNetworkGame &&
              !gameStarted
            }
            selectedRoundLimit={
              standaloneRoundLimit
            }
            onSelectRoundLimit={
              setStandaloneRoundLimit
            }
            onStart={startGame}
          />

          <GameResultModal
            result={gameResult}
            onRestart={restartGame}
            onReturnToSetup={returnToSetup}
          />
        </div>

        <DisasterEffectLayer
          event={disasterEffectEvent}
          onComplete={completeDisasterEffect}
        />
      </div>
    </main>
  );
}
