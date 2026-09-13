import {useCallback,useEffect,useMemo,useRef,useState,} from "react";
import type { PlayerTokenData } from "../components/PlayerToken";
import type { SalaryNoticeData } from "../components/SalaryNotice";
import type { DoubleDiceNoticeData } from "../components/DoubleDiceNotice";
import type { BoardTile, PropertyData } from "../types";
import {
  addGeneralDeposit,
  applyGeneralDepositInterest,
  completeRecurringSavings,
  createInitialBankState,
  getGeneralDepositBalance,
  getRecurringSavingsContract,
  getRecurringSavingsProduct,
  isScheduledBankInterestTurn,
  recordRecurringSavingsFailure,
  recordRecurringSavingsPayment,
  removePlayerBankAssets,
  subtractGeneralDeposit,
} from "./bank/bankRules";
import type {
  BankNoticeData,
  BankShopError,
  BankState,
  PendingBankShop,
} from "./bank/bankTypes";
import {
  createInitialCityHallState,
  getActiveCityHallTerm,
  getCityHallBankInterestMultiplier,
  getCityHallConstructionCostMultiplier,
  getCityHallDevelopmentSupportMultiplier,
  getCityHallDisasterRepairCostMultiplier,
  getCityHallTollMultiplier,
} from "./cityHall/cityHallRules";
import { useCityHallResolution } from "./cityHall/useCityHallResolution";
import type {
  CityHallApplicationType,
  CityHallPropertyOption,
  CityHallState,
  PendingCityHallSelection,
} from "./cityHall/cityHallTypes";
import {getAirportDestinationTiles,} from "./airport/airportRules";
import {
  armTargetedAuctionItem,
  consumeAuctionItem,
  consumeTollBoostForProperty,
  createInitialAuctionState,
  getPlayerAuctionItems,
  hasAuctionItem,
  removePlayerAuctionAssets,
} from "./auction/auctionRules";
import type {
  AuctionError,
  AuctionItemId,
  AuctionState,
  AuctionTargetItemId,
  PendingAuction,
  PendingAuctionTargetSelection,
  PendingDiceReroll,
} from "./auction/auctionTypes";
import type {
  AirportFlightState,
  AirportTravelError,
  PendingAirportTravel,
} from "./airport/airportTypes";
import { createDiceValue, type DiceValue } from "./dice";
import {EMPTY_DOUBLE_STREAK,evaluateDoubleRoll,type DoubleStreakState,} from "./doubleDice";
import type {
  MoneyOperationResult,
  MoneyTransaction,
  TransactionReason,
} from "./economy/economyTypes";
import {
  canAfford,
  createStartingCashTransactions,
  depositMoney,
  getBalance,
  transferMoney,
  withdrawMoney,
} from "./economy/money";
import {
  canCoverDebtAfterLiquidation,
  getCombinedLiquidationValue,
  getDebtShortfall,
} from "./economy/insolvency";
import {getDisasterTollMultiplier,} from "./disaster/disasterRules";
import {useDisasterResolution,} from "./disaster/useDisasterResolution";
import {didPassStart,getNextBoardPosition,START_SALARY,} from "./economy/salary";
import { isScheduledTaxTurn,} from "./economy/tax";
import { createEconomicNewsPool } from "./economicNews/economicNewsPool";
import {
  createInitialEconomicNewsState,
  getActiveEconomicNews,
  getEconomicNewsBankInterestMultiplier,
  getEconomicNewsConstructionCostMultiplier,
  getEconomicNewsPortSuccessChanceDelta,
  getEconomicNewsPropertyDistrictBiases,
  getEconomicNewsTollMultiplier,
  getVisibleEconomicNews,
  resetRandomEconomicNewsCooldown,
} from "./economicNews/economicNewsRules";
import { useEconomicNewsResolution } from "./economicNews/useEconomicNewsResolution";
import type {
  EconomicNewsState,
  PendingEconomicNewsResolution,
} from "./economicNews/economicNewsTypes";
import type {
  PendingTaxSettlement,
  TaxLiquidationError,
  TaxPaymentError,
} from "./economy/taxTypes";
import {isScheduledMayorElectionTurn,} from "./election/electionRules";
import {
  getActiveMayorPolicy,
  getPolicyConstructionCost,
  getPolicyPropertySaleRate,
  getPolicySalary,
  getPolicyTollMultiplier,
} from "./election/policyEffects";
import type {MayorTerm,PendingMayorElection,} from "./election/electionTypes";
import {
  createInitialInsuranceContracts,
  createOrRenewInsuranceContract,
  getInsurablePropertyAssets,
  removeInsuranceContract,
  removePlayerInsuranceContracts,
} from "./insurance/insuranceRules";
import type {
  InsuranceContractMap,
  InsurancePlanType,
  InsuranceShopError,
  PendingInsuranceShop,
} from "./insurance/insuranceTypes";
import {getJailTollOwnerIncome,releasePlayerFromJail,} from "./jail/jailRules";
import type {
  JailActionError,
  JailLiquidationError,
  PendingJailEntry,
  PendingJailFine,
} from "./jail/jailTypes";
import {createInitialGoldenKeyDeck,drawGoldenKeyCard,} from "./goldenKey/goldenKeyRules";
import type {GoldenKeyDeckState,PendingGoldenKeyResolution,} from "./goldenKey/goldenKeyTypes";
import type {
  PendingMarketResolution,
  PropertyMarketMap,
} from "./market/marketTypes";
import { createInitialPropertyMarket, getPropertyPriceIndex,} from "./market/propertyMarket";
import { usePropertyMarketResolution,} from "./market/usePropertyMarketResolution";
import {
  ARRIVAL_FOCUS_DELAY_MS,
  DICE_RESULT_DELAY_MS,
  DICE_TO_MOVEMENT_DELAY_MS,
  MOVE_STEP_DELAY_MS,
  delay,
} from "./movement";
import {createInitialLottoState,isScheduledLottoTurn,} from "./lottery/lotteryRules";
import type {
  LottoState,
  LotteryShopError,
  PendingLottoDrawResolution,
  PendingLotteryShop,
} from "./lottery/lotteryTypes";
import {createInitialMiniGameState,} from "./minigame/minigameRules";
import type {MiniGameError,MiniGameState,PendingMiniGame,} from "./minigame/minigameTypes";
import {useMiniGameResolution,} from "./minigame/useMiniGameResolution";
import {
  createInitialFestivalDeckState,
  getFestivalTollMultiplier,
} from "./festival/festivalRules";
import {
  useFestivalResolution,
} from "./festival/useFestivalResolution";
import type {
  ActiveFestival,
  FestivalDeckState,
  PendingFestivalAnnouncement,
  PendingTouristTurnResult,
  TouristNpcState,
} from "./festival/festivalTypes";
import {createInitialPortState,getPlayerActivePortContract,removePlayerPortContracts,} from "./port/portRules";
import type {
  PendingPortSettlement,
  PendingPortShop,
  PortShopError,
  PortState,
} from "./port/portTypes";
import {INITIAL_PLAYERS,PROTOTYPE_LOCAL_PLAYER_ID,} from "./prototypePlayers";
import {
  getDevelopmentStageLabel,
  getNextConstructionCost,
  getNextDevelopmentStage,
  isMaxDevelopmentStage,
} from "./property/propertyDevelopment";
import {
  applyDevelopmentRestriction,
  createDevelopmentRestriction,
  getActiveDevelopmentRestrictions,
  getVisibleDevelopmentRestrictions,
  isDevelopmentRestricted,
  pruneExpiredDevelopmentRestrictions,
  removeDevelopmentRestriction,
} from "./property/developmentRestrictionRules";
import type {DevelopmentRestrictionMap,} from "./property/developmentRestrictionTypes";
import {
  createPropertyOwnership,
  getLandmarkPurchaseRequirement,
  getPropertyOwnership,
  getPropertyPurchasePrice,
  isPropertyTile,
} from "./property/propertyRules";
import { getPropertyTollAmount } from "./property/propertyToll";
import {getSellablePropertyAssets,sellPropertyOwnership,} from "./property/propertySale";
import type {
  AssetLiquidationError,PendingPropertyDevelopment, PendingPropertyPurchase,
  PendingTollPayment,PropertyDevelopmentError,PropertyOwnershipMap,
  PropertyPurchaseError,TollPaymentError,
} from "./property/propertyTypes";
import { useTurnSystem } from "./turn/useTurnSystem";
import {
  createInitialStockMarket,
  createInitialStockPortfolios,
  getAvailableShareCount,
  getPortfolioMarketValue,
  getStockPrice,
} from "./stock/stockMarket";
import {
  buyStockHolding,
  getStockBuyTotalCost,
  getStockHolding,
  getStockSellNetProceeds,
  getStockTradeFee,
  sellStockHolding,
} from "./stock/stockTrading";
import {getSellableStockAssets,} from "./stock/stockLiquidation";
import type {
  StockCompanyData,
  StockIndustryData,
  StockMarketMap,
  StockPortfolioMap,
  StockTradeError,
} from "./stock/stockTypes";
import { createInitialCompanyDividendModifiers,} from "./stock/companyDividendRules";
import type {CompanyDividendModifierMap,} from "./stock/companyDividendTypes";
import type { UlsanMarbleArrivalContext,UlsanMarbleTollPaidPayload,} from "../../../shared/ulsanMarbleProtocol";
import type {UsePrototypeGameNetworkOptions,UlsanMarbleNetworkDiceRoll,} from "./network/networkTypes";
import {useNetworkDiceRoll,} from "./network/useNetworkDiceRoll";
import {useNetworkPropertyDecision,} from "./network/useNetworkPropertyDecision";
import {useNetworkTurnSync,} from "./network/useNetworkTurnSync";
import {useNetworkStockTrades,} from "./network/useNetworkStockTrades";
import {useNetworkGameEvents,type NetworkGameEventApplyResult,} from "./network/useNetworkGameEvents";
import {useNetworkGoldenKey,} from "./network/useNetworkGoldenKey";
import {useGoldenKeyResolution } from "./goldenKey/useGoldenKeyResolution";
import {useAirportResolution,} from "./airport/useAirportResolution";
import {usePropertyDevelopmentResolution,} from "./property/usePropertyDevelopmentResolution";
import {useBankShopResolution,} from "./bank/useBankShopResolution";
import {useLotteryShopResolution,} from "./lottery/useLotteryShopResolution";
import {useLottoDrawResolution,} from "./lottery/useLottoDrawResolution";
import {usePortShopResolution,} from "./port/usePortShopResolution";
import {usePortSettlementResolution,} from "./port/usePortSettlementResolution";
import {useJailEntryResolution,} from "./jail/useJailEntryResolution";
import {useJailTurnResolution,} from "./jail/useJailTurnResolution";
import {useStockMarketResolution,} from "./stock/useStockMarketResolution";
import {useCompanyDividendEventResolution,} from "./stock/useCompanyDividendEventResolution";
import type {PendingStockMarketResolution} from "./stock/stockResolutionTypes";
import {useAuctionResolution,} from "./auction/useAuctionResolution";
import {useInsuranceShopResolution,} from "./insurance/useInsuranceShopResolution";
import {useTaxSettlementResolution,} from "./economy/useTaxSettlementResolution";
import {useJailFineResolution,} from "./jail/useJailFineResolution";
import {useMayorElectionResolution } from "./election/useMayorElectionResolution";
import {createInitialMacroEconomyState,getMacroBankInterestMultiplier,} from "./economy/macroEconomyRules";
import type {MacroEconomyState,} from "./economy/macroEconomyTypes";
import {useMacroEconomyResolution,} from "./economy/useMacroEconomyResolution";

export type {
  UlsanMarbleNetworkDiceRoll,
  UlsanMarbleNetworkPropertyDecision,
  UlsanMarbleNetworkPropertyDecisionRequest,
  UlsanMarbleNetworkStockTrade,
  UlsanMarbleNetworkStockTradeRequest,
} from "./network/networkTypes";

interface UsePrototypeGameOptions
  extends UsePrototypeGameNetworkOptions {
  tiles: BoardTile[];
  properties: PropertyData[];
  stockIndustries: StockIndustryData[];
  stockCompanies: StockCompanyData[];

  initialPlayers?: PlayerTokenData[];
  localPlayerId?: string;
  salary?: number;

}


const SALARY_NOTICE_DURATION_MS = 1600;
const BANK_NOTICE_DURATION_MS = 2200;
const DOUBLE_NOTICE_DURATION_MS = 2200;
const JAIL_NOTICE_DURATION_MS = 4000;
const DICE_ANIMATION_DURATION_MS = 2350;
const MAX_TRANSACTION_HISTORY = 100;

function formatBankMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

export function usePrototypeGame({
  tiles,
  properties,
  stockIndustries,
  stockCompanies,
  initialPlayers,
  localPlayerId,
  salary,

  networkDiceRoll,
  onNetworkRollRequest,

  networkPropertyDecision,
  onNetworkPropertyDecisionRequest,

  networkStockTrades,
  onNetworkStockTradeRequest,

  networkGameEvents,
  onNetworkGameEventRequest,
  onNetworkGameEventAck,
  onNetworkTurnReady,

  networkTurnNumber,
  networkTurnSequence,
  networkActivePlayerId,
  onNetworkEndTurnRequest,
  networkControllerPlayerId,
  onNetworkDevEndTurnRequest,
  
    
}: UsePrototypeGameOptions) {
  const tileCount = tiles.length;
  const initialGamePlayers = useMemo<PlayerTokenData[]>(
    () =>
      (
        initialPlayers && initialPlayers.length > 0
          ? initialPlayers
          : INITIAL_PLAYERS
      ).map((player) => ({ ...player })),
    [initialPlayers],
  );

  const playerIds = useMemo(
    () => initialGamePlayers.map((player) => player.id),
    [initialGamePlayers],
  );

  const resolvedLocalPlayerId = useMemo(() => {
    if (
      localPlayerId &&
      playerIds.includes(localPlayerId)
    ) {
      return localPlayerId;
    }

    if (playerIds.includes(PROTOTYPE_LOCAL_PLAYER_ID)) {
      return PROTOTYPE_LOCAL_PLAYER_ID;
    }

    return playerIds[0] ?? "";
  }, [
    localPlayerId,
    playerIds,
  ]);

  const baseSalary = Math.max( 0, Math.round(salary ?? START_SALARY),);  
  const economicNewsPool = useMemo( () => createEconomicNewsPool(stockIndustries), [stockIndustries],);
  const [players, setPlayers] = useState<PlayerTokenData[]>(() => initialGamePlayers.map((player) => ({ ...player })),);
  const playersRef = useRef<PlayerTokenData[]>(players);
  const [transactions, setTransactions] = useState<MoneyTransaction[]>(() => createStartingCashTransactions(initialGamePlayers),);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [diceValues, setDiceValues] = useState<[DiceValue, DiceValue]>([1, 1]);
  const [isDiceAnimating, setIsDiceAnimating] = useState(false);
  const [isDiceVisible, setIsDiceVisible] = useState(false);
  const [salaryNotice, setSalaryNotice] = useState<SalaryNoticeData | null>(null);
  const [doubleDiceNotice, setDoubleDiceNotice] = useState<DoubleDiceNoticeData | null>(null);
  const doubleStreakRef = useRef<DoubleStreakState>(EMPTY_DOUBLE_STREAK);
  const pendingExtraRollRef = useRef(false);
  const pendingJailTurnAdvanceRef =  useRef<string[] | null>(null);
  const completeTileResolutionRef = useRef<(disabledPlayerIds?: string[]) => void>(() => {});
  const completeTileResolutionBridge = useCallback((disabledPlayerIds: string[] = []) => {completeTileResolutionRef.current(disabledPlayerIds);}, []);
  const [propertyOwnerships, setPropertyOwnerships] = useState<PropertyOwnershipMap>({});
  const propertyOwnershipsRef = useRef<PropertyOwnershipMap>({});
  const [developmentRestrictions, setDevelopmentRestrictions] = useState<DevelopmentRestrictionMap>({});
  const developmentRestrictionsRef = useRef<DevelopmentRestrictionMap>({});
  const [propertyMarket, setPropertyMarket] = useState<PropertyMarketMap>( () => createInitialPropertyMarket(properties),);
  const propertyMarketRef = useRef<PropertyMarketMap>( createInitialPropertyMarket(properties),);
  const [pendingMarketResolution, setPendingMarketResolution] = useState<PendingMarketResolution | null>(null);
  const [stockMarket, setStockMarket] = useState<StockMarketMap>(() => createInitialStockMarket(stockCompanies),);
  const stockMarketRef = useRef<StockMarketMap>(createInitialStockMarket(stockCompanies),);
  const [stockPortfolios, setStockPortfolios] = useState<StockPortfolioMap>(() => createInitialStockPortfolios(playerIds),);
  const stockPortfoliosRef = useRef<StockPortfolioMap>(createInitialStockPortfolios(playerIds),);
  const [pendingStockMarketResolution, setPendingStockMarketResolution] = useState<PendingStockMarketResolution | null>(null);
  const companyDividendModifiersRef = useRef<CompanyDividendModifierMap>(createInitialCompanyDividendModifiers(stockCompanies,),);
  const [isStockMarketOpen, setIsStockMarketOpen] = useState(false);
  const [lottoState, setLottoState] = useState<LottoState>(() => createInitialLottoState(),);
  const lottoStateRef = useRef<LottoState>(createInitialLottoState());
  const [pendingLotteryShop, setPendingLotteryShop] = useState<PendingLotteryShop | null>(null);
  const [lotteryShopError, setLotteryShopError] = useState<LotteryShopError | null>(null);
  const [pendingLottoDrawResolution, setPendingLottoDrawResolution] = useState<PendingLottoDrawResolution | null>(null);
  const [currentMayorTerm, setCurrentMayorTerm] = useState<MayorTerm | null>(null);
  const currentMayorTermRef = useRef<MayorTerm | null>(null);
  const [pendingMayorElection, setPendingMayorElection] = useState<PendingMayorElection | null>(null);
  const [cityHallState, setCityHallState] = useState<CityHallState>(() => createInitialCityHallState(),);
  const cityHallStateRef = useRef<CityHallState>(createInitialCityHallState());
  const [pendingCityHallSelection, setPendingCityHallSelection] = useState<PendingCityHallSelection | null>(null);
  const [insuranceContracts, setInsuranceContracts] = useState<InsuranceContractMap>(() => createInitialInsuranceContracts());
  const insuranceContractsRef = useRef<InsuranceContractMap>(createInitialInsuranceContracts(),);
  const [pendingInsuranceShop, setPendingInsuranceShop] = useState<PendingInsuranceShop | null>(null);
  const [insuranceShopError, setInsuranceShopError] = useState<InsuranceShopError | null>(null);
  const [goldenKeyDeck, setGoldenKeyDeck] = useState<GoldenKeyDeckState>(() => createInitialGoldenKeyDeck());
  const goldenKeyDeckRef = useRef<GoldenKeyDeckState>(goldenKeyDeck);
  const [pendingGoldenKey, setPendingGoldenKey] = useState<PendingGoldenKeyResolution | null>(null);
  const [economicNewsState, setEconomicNewsState] = useState<EconomicNewsState>(() => createInitialEconomicNewsState(economicNewsPool),);
  const economicNewsStateRef = useRef<EconomicNewsState>(economicNewsState);
  const [macroEconomyState,setMacroEconomyState,] = useState<MacroEconomyState>(() =>createInitialMacroEconomyState(),);
  const macroEconomyStateRef = useRef<MacroEconomyState>(macroEconomyState,);
  const [pendingEconomicNews, setPendingEconomicNews] = useState<PendingEconomicNewsResolution | null>(null);
  const [pendingJailEntry, setPendingJailEntry] = useState<PendingJailEntry | null>(null);
  const [pendingJailFine, setPendingJailFine] = useState<PendingJailFine | null>(null);
  const [jailActionError, setJailActionError] = useState<JailActionError | null>(null);
  const [jailLiquidationError, setJailLiquidationError] = useState<JailLiquidationError | null>(null);
  const [pendingAirportTravel, setPendingAirportTravel] = useState<PendingAirportTravel | null>(null);
  const [airportTravelError, setAirportTravelError] = useState<AirportTravelError | null>(null);
  const [airportFlight, setAirportFlight] = useState<AirportFlightState | null>(null);
  const [portState, setPortState] = useState<PortState>(() => createInitialPortState(),);
  const portStateRef = useRef<PortState>(createInitialPortState());
  const [pendingPortShop, setPendingPortShop] = useState<PendingPortShop | null>(null);
  const [portShopError, setPortShopError] = useState<PortShopError | null>(null);
  const [pendingPortSettlement, setPendingPortSettlement] = useState<PendingPortSettlement | null>(null);
  const [bankState, setBankState] = useState<BankState>(() => createInitialBankState(playerIds),);
  const bankStateRef = useRef<BankState>(createInitialBankState(playerIds),);
  const [pendingBankShop, setPendingBankShop] = useState<PendingBankShop | null>(null);
  const [bankShopError, setBankShopError] = useState<BankShopError | null>(null);
  const [bankNoticeQueue, setBankNoticeQueue] = useState<BankNoticeData[]>([]);
  const bankNoticeSequenceRef = useRef(0);
  const [auctionState, setAuctionState] = useState<AuctionState>(() => createInitialAuctionState(playerIds),);
  const auctionStateRef = useRef<AuctionState>(auctionState);
  const [pendingAuction, setPendingAuction] = useState<PendingAuction | null>(null);
  const [auctionError, setAuctionError] = useState<AuctionError | null>(null);
  const [pendingAuctionTarget, setPendingAuctionTarget] = useState<PendingAuctionTargetSelection | null>(null);
  const [pendingDiceReroll, setPendingDiceReroll] = useState<PendingDiceReroll | null>(null);
  const [miniGameState, setMiniGameState] = useState<MiniGameState>(() => createInitialMiniGameState(),);
  const miniGameStateRef = useRef<MiniGameState>(miniGameState);
  const [pendingMiniGame, setPendingMiniGame] = useState<PendingMiniGame | null>(null);
  const [miniGameError, setMiniGameError] = useState<MiniGameError | null>(null);
  const [festivalDeckState, setFestivalDeckState] = useState<FestivalDeckState>(() => createInitialFestivalDeckState(),);
  const festivalDeckStateRef = useRef<FestivalDeckState>(festivalDeckState,);
  const [activeFestival, setActiveFestival] = useState<ActiveFestival | null>(null);
  const activeFestivalRef = useRef<ActiveFestival | null>(null);
  const [touristNpc, setTouristNpc] = useState<TouristNpcState | null>(null);
  const touristNpcRef = useRef<TouristNpcState | null>(null);
  const [pendingFestivalAnnouncement, setPendingFestivalAnnouncement] = useState<PendingFestivalAnnouncement | null>(null);
  const [pendingTouristTurnResult, setPendingTouristTurnResult] = useState<PendingTouristTurnResult | null>(null);
  const [isFestivalSettlementBusy, setIsFestivalSettlementBusy] = useState(false);
  const festivalSettlementBusyRef = useRef(false);
  const [stockTradeError, setStockTradeError] = useState<StockTradeError | null>(null);
  const [pendingPropertyPurchase, setPendingPropertyPurchase] = useState<PendingPropertyPurchase | null>(null);
  const [propertyPurchaseError, setPropertyPurchaseError] = useState<PropertyPurchaseError | null>(null);
  const [pendingPropertyDevelopment, setPendingPropertyDevelopment] = useState<PendingPropertyDevelopment | null>(null);
  const [propertyDevelopmentError, setPropertyDevelopmentError] = useState<PropertyDevelopmentError | null>(null);
  const [pendingTollPayment, setPendingTollPayment] = useState<PendingTollPayment | null>(null);
  const [tollPaymentError, setTollPaymentError] = useState<TollPaymentError | null>(null);
  const [assetLiquidationError, setAssetLiquidationError] = useState<AssetLiquidationError | null>(null);
  const [pendingTaxSettlement, setPendingTaxSettlement] = useState<PendingTaxSettlement | null>(null);
  const [taxPaymentError, setTaxPaymentError] = useState<TaxPaymentError | null>(null);
  const [taxLiquidationError, setTaxLiquidationError] = useState<TaxLiquidationError | null>(null);
  const sentTurnReadySequenceRef =useRef<number | null>(null);


  const bankruptPlayerIds = useMemo(
    () =>
      players
        .filter((player) => player.isBankrupt)
        .map((player) => player.id),
    [players],
  );

  const turn = useTurnSystem({
    playerIds: playerIds,
    disabledPlayerIds: bankruptPlayerIds,
  });

  const activeMayorPolicy = useMemo(
    () => getActiveMayorPolicy(currentMayorTerm, turn.turnNumber),
    [currentMayorTerm, turn.turnNumber],
  );
  const activeCityHallTerm = useMemo(
    () => getActiveCityHallTerm(cityHallState, turn.turnNumber),
    [cityHallState, turn.turnNumber],
  );
  const cityHallConstructionCostMultiplier = useMemo(
    () => getCityHallConstructionCostMultiplier(activeCityHallTerm),
    [activeCityHallTerm],
  );
  const visibleEconomicNews = useMemo(
    () => getVisibleEconomicNews(economicNewsState, turn.turnNumber),
    [economicNewsState, turn.turnNumber],
  );
  const activeEconomicNews = useMemo(
    () => getActiveEconomicNews(economicNewsState, turn.turnNumber),
    [economicNewsState, turn.turnNumber],
  );
  const visibleDevelopmentRestrictions = useMemo(
    () =>
      getVisibleDevelopmentRestrictions(
        developmentRestrictions,
        turn.turnNumber,
      ),
    [developmentRestrictions, turn.turnNumber],
  );
  const activeDevelopmentRestrictions = useMemo(
    () =>
      getActiveDevelopmentRestrictions(
        developmentRestrictions,
        turn.turnNumber,
      ),
    [developmentRestrictions, turn.turnNumber],
  );
  const economicNewsConstructionCostMultiplier = useMemo(
    () => getEconomicNewsConstructionCostMultiplier(activeEconomicNews),
    [activeEconomicNews],
  );
  const economicNewsTollMultiplier = useMemo(
    () => getEconomicNewsTollMultiplier(activeEconomicNews),
    [activeEconomicNews],
  );

  const propertyMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const stockCompanyMap = useMemo(
    () => new Map(stockCompanies.map((company) => [company.id, company])),
    [stockCompanies],
  );

  const commitPlayers = useCallback((nextPlayers: PlayerTokenData[]) => {
    playersRef.current = nextPlayers;
    setPlayers(nextPlayers);
  }, []);

  const commitPropertyOwnerships = useCallback(
    (nextOwnerships: PropertyOwnershipMap) => {
      propertyOwnershipsRef.current = nextOwnerships;
      setPropertyOwnerships(nextOwnerships);
    },
    [],
  );
  const commitDevelopmentRestrictions = useCallback(
    (nextRestrictions: DevelopmentRestrictionMap) => {
      developmentRestrictionsRef.current = nextRestrictions;
      setDevelopmentRestrictions(nextRestrictions);
    },
    [],
  );

  const commitPropertyMarket = useCallback(
    (nextMarket: PropertyMarketMap) => {
      propertyMarketRef.current = nextMarket;
      setPropertyMarket(nextMarket);
    },
    [],
  );

  const commitStockMarket = useCallback((nextMarket: StockMarketMap) => {
    stockMarketRef.current = nextMarket;
    setStockMarket(nextMarket);
  }, []);

  const commitStockPortfolios = useCallback(
    (nextPortfolios: StockPortfolioMap) => {
      stockPortfoliosRef.current = nextPortfolios;
      setStockPortfolios(nextPortfolios);
    },
    [],
  );

  const commitLottoState = useCallback((nextState: LottoState) => {
    lottoStateRef.current = nextState;
    setLottoState(nextState);
  }, []);

  const commitMayorTerm = useCallback((nextTerm: MayorTerm | null) => {
    currentMayorTermRef.current = nextTerm;
    setCurrentMayorTerm(nextTerm);
  }, []);
  const commitCityHallState = useCallback((nextState: CityHallState) => {
    cityHallStateRef.current = nextState;
    setCityHallState(nextState);
  }, []);
  const commitInsuranceContracts = useCallback(
    (nextContracts: InsuranceContractMap) => {
      insuranceContractsRef.current = nextContracts;
      setInsuranceContracts(nextContracts);
    },
    [],
  );
  const commitGoldenKeyDeck = useCallback(
    (nextDeck: GoldenKeyDeckState) => {
      goldenKeyDeckRef.current = nextDeck;
      setGoldenKeyDeck(nextDeck);
    },
    [],
  );

  const commitEconomicNewsState = useCallback(
    (nextState: EconomicNewsState) => {
      economicNewsStateRef.current = nextState;
      setEconomicNewsState(nextState);
    },
    [],
  );
  useEffect(() => {
    const nextRestrictions = pruneExpiredDevelopmentRestrictions(
      developmentRestrictionsRef.current,
      turn.turnNumber,
    );

    if (nextRestrictions !== developmentRestrictionsRef.current) {
      commitDevelopmentRestrictions(nextRestrictions);
    }
  }, [
    commitDevelopmentRestrictions,
    turn.turnNumber,
  ]);

  const commitMacroEconomyState =
  useCallback(
    (nextState:MacroEconomyState,) => {macroEconomyStateRef.current =nextState; setMacroEconomyState(nextState,);},[],);
  const commitPortState = useCallback((nextState: PortState) => {
    portStateRef.current = nextState;
    setPortState(nextState);
  }, []);
  const commitBankState = useCallback((nextState: BankState) => {
    bankStateRef.current = nextState;
    setBankState(nextState);
  }, []);
  const commitAuctionState = useCallback((nextState: AuctionState) => {
    auctionStateRef.current = nextState;
    setAuctionState(nextState);
  }, []);
  const commitMiniGameState = useCallback((nextState: MiniGameState) => {
    miniGameStateRef.current = nextState;
    setMiniGameState(nextState);
  }, []);
  const commitFestivalDeckState = useCallback(
    (nextState: FestivalDeckState) => {
      festivalDeckStateRef.current = nextState;
      setFestivalDeckState(nextState);
    },
    [],
  );
  const commitActiveFestival = useCallback(
    (nextFestival: ActiveFestival | null) => {
      activeFestivalRef.current = nextFestival;
      setActiveFestival(nextFestival);
    },
    [],
  );
  const commitTouristNpc = useCallback(
    (nextNpc: TouristNpcState | null) => {
      touristNpcRef.current = nextNpc;
      setTouristNpc(nextNpc);
    },
    [],
  );
  const commitFestivalSettlementBusy = useCallback(
    (busy: boolean) => {
      festivalSettlementBusyRef.current = busy;
      setIsFestivalSettlementBusy(busy);
    },
    [],
  );

  const resetDoubleChain = useCallback(() => {
    doubleStreakRef.current = EMPTY_DOUBLE_STREAK;
    pendingExtraRollRef.current = false;
  }, []);

  const showDoubleDiceNotice = useCallback(
    (notice: Omit<DoubleDiceNoticeData, "id">) => {
      setDoubleDiceNotice({
        ...notice,
        id: Date.now(),
      });
    },
    [],
  );

  useEffect(() => {
    if (!doubleDiceNotice) return;

    const noticeDuration =
      doubleDiceNotice.tone === "JAIL"
        ? JAIL_NOTICE_DURATION_MS
        : DOUBLE_NOTICE_DURATION_MS;

    const timerId = window.setTimeout(() => {
      setDoubleDiceNotice((currentNotice) =>
        currentNotice?.id === doubleDiceNotice.id
          ? null
          : currentNotice,
      );
    }, noticeDuration);

    return () =>
      window.clearTimeout(timerId);
  }, [doubleDiceNotice]);

  useEffect(() => {
    const bankruptPlayerIdSet = new Set(
      players.filter((player) => player.isBankrupt).map((player) => player.id),
    );
    if (bankruptPlayerIdSet.size === 0) return;

    const nextContracts = portStateRef.current.activeContracts.filter(
      (contract) => !bankruptPlayerIdSet.has(contract.playerId),
    );
    if (nextContracts.length === portStateRef.current.activeContracts.length) {
      return;
    }

    commitPortState({
      ...portStateRef.current,
      activeContracts: nextContracts,
    });
  }, [commitPortState, players]);

  useEffect(() => {
    const bankruptPlayerIds = players
      .filter((player) => player.isBankrupt)
      .map((player) => player.id);
    if (bankruptPlayerIds.length === 0) return;

    let nextState = auctionStateRef.current;
    let changed = false;
    for (const playerId of bankruptPlayerIds) {
      if (
        getPlayerAuctionItems(nextState, playerId).length > 0 ||
        nextState.targetEffects.tollBoostPropertyByPlayer[playerId] ||
        nextState.targetEffects.propertyDefenseByPlayer[playerId] ||
        nextState.targetEffects.stockLossIndustryByPlayer[playerId]
      ) {
        nextState = removePlayerAuctionAssets(nextState, playerId);
        changed = true;
      }
    }
    if (changed) commitAuctionState(nextState);
  }, [commitAuctionState, players]);

  useEffect(() => {
    const bankruptPlayerIds = players
      .filter((player) => player.isBankrupt)
      .map((player) => player.id);

    const hasBankAssets = bankruptPlayerIds.some(
      (playerId) =>
        getGeneralDepositBalance(bankStateRef.current, playerId) > 0 ||
        Boolean(getRecurringSavingsContract(bankStateRef.current, playerId)),
    );
    if (!hasBankAssets) return;

    let nextState = bankStateRef.current;
    for (const playerId of bankruptPlayerIds) {
      nextState = removePlayerBankAssets(nextState, playerId);
    }
    commitBankState(nextState);
  }, [commitBankState, players]);

  const applyMoneyResult = useCallback(
    (result: MoneyOperationResult): MoneyOperationResult => {
      if (!result.ok) return result;

      commitPlayers(result.players);
      setTransactions((currentTransactions) =>
        [...result.transactions, ...currentTransactions].slice(
          0,
          MAX_TRANSACTION_HISTORY,
        ),
      );

      return result;
    },
    [commitPlayers],
  );

  const deposit = useCallback(
    (
      playerId: string,
      amount: number,
      reason: TransactionReason,
      memo?: string,
    ): MoneyOperationResult =>
      applyMoneyResult(
        depositMoney(playersRef.current, playerId, amount, {
          reason,
          turnNumber: turn.turnNumber,
          memo,
        }),
      ),
    [applyMoneyResult, turn.turnNumber],
  );

  const withdraw = useCallback(
    (
      playerId: string,
      amount: number,
      reason: TransactionReason,
      memo?: string,
    ): MoneyOperationResult =>
      applyMoneyResult(
        withdrawMoney(playersRef.current, playerId, amount, {
          reason,
          turnNumber: turn.turnNumber,
          memo,
        }),
      ),
    [applyMoneyResult, turn.turnNumber],
  );

  const transfer = useCallback(
    (
      fromPlayerId: string,
      toPlayerId: string,
      amount: number,
      reason: TransactionReason,
      memo?: string,
    ): MoneyOperationResult =>
      applyMoneyResult(
        transferMoney(
          playersRef.current,
          fromPlayerId,
          toPlayerId,
          amount,
          {
            reason,
            turnNumber: turn.turnNumber,
            memo,
          },
        ),
      ),
    [applyMoneyResult, turn.turnNumber],
  );

  const getPlayerBalance = useCallback(
    (playerId: string): number | null =>
      getBalance(playersRef.current, playerId),
    [],
  );

  const canPlayerAfford = useCallback(
    (playerId: string, amount: number): boolean =>
      canAfford(playersRef.current, playerId, amount),
    [],
  );

  const getPlayerLiquidBalance = useCallback((playerId: string): number => {
    const cash = getBalance(playersRef.current, playerId) ?? 0;
    return cash + getGeneralDepositBalance(bankStateRef.current, playerId);
  }, []);

  const moveGeneralDepositToCash = useCallback(
    (playerId: string, amount: number, memo: string): boolean => {
      if (amount <= 0) return true;

      const nextState = subtractGeneralDeposit(
        bankStateRef.current,
        playerId,
        amount,
      );
      if (!nextState) return false;

      commitBankState(nextState);
      const cashResult = deposit(
        playerId,
        amount,
        "BANK_WITHDRAWAL",
        memo,
      );

      if (!cashResult.ok) {
        commitBankState(
          addGeneralDeposit(bankStateRef.current, playerId, amount),
        );
        return false;
      }

      return true;
    },
    [commitBankState, deposit],
  );

  const prepareMandatoryPayment = useCallback(
    (playerId: string, amount: number, memo: string): boolean => {
      const cash = getBalance(playersRef.current, playerId);
      if (cash === null || amount <= 0) return false;
      if (cash >= amount) return true;

      const shortfall = amount - cash;
      return moveGeneralDepositToCash(playerId, shortfall, memo);
    },
    [moveGeneralDepositToCash],
  );

  const settleBankAssetsForBankruptcy = useCallback(
    (playerId: string, memo: string): boolean => {
      const depositBalance = getGeneralDepositBalance(
        bankStateRef.current,
        playerId,
      );

      if (
        depositBalance > 0 &&
        !moveGeneralDepositToCash(playerId, depositBalance, memo)
      ) {
        return false;
      }

      commitBankState(removePlayerBankAssets(bankStateRef.current, playerId));
      return true;
    },
    [commitBankState, moveGeneralDepositToCash],
  );

  const enqueueBankNotice = useCallback(
    (title: string, message: string, tone: BankNoticeData["tone"]) => {
      bankNoticeSequenceRef.current += 1;
      const notice: BankNoticeData = {
        id: `bank-notice-${Date.now()}-${bankNoticeSequenceRef.current}`,
        title,
        message,
        tone,
      };
      setBankNoticeQueue((current) => [...current, notice].slice(-8));
    },
    [],
  );

  const activePlayer = useMemo(
    () =>
      players.find((player) => player.id === turn.activePlayerId) ??
      players[0],
    [players, turn.activePlayerId],
  );

  const localPlayer = useMemo(
    () =>
      players.find(
        (player) =>
          player.id === resolvedLocalPlayerId,
      ) ?? players[0],
    [
      players,
      resolvedLocalPlayerId,
    ],
  );

  const latestLocalTransaction = useMemo(
    () =>
      transactions.find(
        (transaction) => transaction.playerId === localPlayer.id,
      ) ?? null,
    [localPlayer.id, transactions],
  );
  const localAuctionItems = useMemo(
    () => getPlayerAuctionItems(auctionState, localPlayer.id),
    [auctionState, localPlayer.id],
  );
  const activePlayerAuctionItems = useMemo(
    () => getPlayerAuctionItems(auctionState, turn.activePlayerId),
    [auctionState, turn.activePlayerId],
  );
  const pendingAuctionTargetPlayer = useMemo(() => {
    if (!pendingAuctionTarget) return null;
    return players.find((player) => player.id === pendingAuctionTarget.playerId) ?? null;
  }, [pendingAuctionTarget, players]);
  const pendingDiceRerollPlayer = useMemo(() => {
    if (!pendingDiceReroll) return null;
    return players.find((player) => player.id === pendingDiceReroll.playerId) ?? null;
  }, [pendingDiceReroll, players]);

  const pendingLotteryPlayer = useMemo(() => {
    if (!pendingLotteryShop) return null;

    return (
      players.find((player) => player.id === pendingLotteryShop.playerId) ??
      null
    );
  }, [pendingLotteryShop, players]);

  const pendingLotteryPlayerTickets = useMemo(() => {
    if (!pendingLotteryShop) return [];

    return lottoState.tickets.filter(
      (ticket) =>
        ticket.playerId === pendingLotteryShop.playerId &&
        ticket.drawNumber === lottoState.drawNumber,
    );
  }, [lottoState, pendingLotteryShop]);

  const pendingInsurancePlayer = useMemo(() => {
    if (!pendingInsuranceShop) return null;

    return (
      players.find((player) => player.id === pendingInsuranceShop.playerId) ??
      null
    );
  }, [pendingInsuranceShop, players]);

  const pendingGoldenKeyPlayer = useMemo(() => {
    if (!pendingGoldenKey) return null;

    return (
      players.find((player) => player.id === pendingGoldenKey.playerId) ?? null
    );
  }, [pendingGoldenKey, players]);

  const pendingEconomicNewsPlayer = useMemo(() => {
    if (!pendingEconomicNews) return null;
    return (
      players.find((player) => player.id === pendingEconomicNews.playerId) ??
      null
    );
  }, [pendingEconomicNews, players]);

  const pendingCityHallPlayer = useMemo(() => {
    if (!pendingCityHallSelection) return null;
    return (
      players.find(
        (player) => player.id === pendingCityHallSelection.playerId,
      ) ?? null
    );
  }, [pendingCityHallSelection, players]);

  const pendingCityHallPropertyOptions = useMemo<
    CityHallPropertyOption[]
  >(() => {
    if (!pendingCityHallSelection) return [];

    return Object.values(propertyOwnerships)
      .filter(
        (ownership) =>
          ownership.ownerPlayerId === pendingCityHallSelection.playerId,
      )
      .flatMap((ownership) => {
        const property = propertyMap.get(ownership.propertyId);
        if (!property) return [];

        return [
          {
            propertyId: property.id,
            propertyName: property.name,
            stage: ownership.stage,
            isRestricted: Boolean(
              developmentRestrictions[property.id],
            ),
            canDevelop: !isMaxDevelopmentStage(ownership.stage),
          },
        ];
      })
      .sort((first, second) =>
        first.propertyName.localeCompare(second.propertyName, "ko"),
      );
  }, [
    developmentRestrictions,
    pendingCityHallSelection,
    propertyMap,
    propertyOwnerships,
  ]);

  const pendingJailEntryPlayer = useMemo(() => {
    if (!pendingJailEntry) return null;
    return players.find((player) => player.id === pendingJailEntry.playerId) ?? null;
  }, [pendingJailEntry, players]);

  const pendingJailFinePlayer = useMemo(() => {
    if (!pendingJailFine) return null;
    return players.find((player) => player.id === pendingJailFine.playerId) ?? null;
  }, [pendingJailFine, players]);

  const pendingAirportPlayer = useMemo(() => {
    if (!pendingAirportTravel) return null;
    return (
      players.find((player) => player.id === pendingAirportTravel.playerId) ??
      null
    );
  }, [pendingAirportTravel, players]);

  const airportDestinationTiles = useMemo(
    () =>
      pendingAirportTravel
        ? getAirportDestinationTiles(tiles, pendingAirportTravel.airportPosition)
        : [],
    [pendingAirportTravel, tiles],
  );

  const pendingPortPlayer = useMemo(() => {
    if (!pendingPortShop) return null;
    return (
      players.find((player) => player.id === pendingPortShop.playerId) ?? null
    );
  }, [pendingPortShop, players]);

  const pendingPortActiveContract = useMemo(
    () =>
      pendingPortShop
        ? getPlayerActivePortContract(portState, pendingPortShop.playerId)
        : null,
    [pendingPortShop, portState],
  );

  const pendingBankPlayer = useMemo(() => {
    if (!pendingBankShop) return null;
    return (
      players.find((player) => player.id === pendingBankShop.playerId) ?? null
    );
  }, [pendingBankShop, players]);

  const pendingBankDepositBalance = pendingBankShop
    ? getGeneralDepositBalance(bankState, pendingBankShop.playerId)
    : 0;

  const pendingBankSavingsContract = pendingBankShop
    ? getRecurringSavingsContract(bankState, pendingBankShop.playerId)
    : null;

  const localGeneralDepositBalance = getGeneralDepositBalance(
    bankState,
    localPlayer.id,
  );
  const localSavingsContract = getRecurringSavingsContract(
    bankState,
    localPlayer.id,
  );
  const currentBankNotice = bankNoticeQueue[0] ?? null;

  const activePlayerIsJailed = Boolean(activePlayer?.isJailed);

  const pendingInsuranceAssets = useMemo(() => {
    if (!pendingInsuranceShop) return [];

    return getInsurablePropertyAssets(
      properties,
      propertyOwnerships,
      propertyMarket,
      insuranceContracts,
      pendingInsuranceShop.playerId,
      turn.turnNumber,
    );
  }, [
    insuranceContracts,
    pendingInsuranceShop,
    properties,
    propertyMarket,
    propertyOwnerships,
    turn.turnNumber,
  ]);

  const pendingPurchasePlayer = useMemo(() => {
    if (!pendingPropertyPurchase) return null;

    return (
      players.find(
        (player) => player.id === pendingPropertyPurchase.playerId,
      ) ?? null
    );
  }, [pendingPropertyPurchase, players]);

  const pendingPurchasePrice = useMemo(() => {
    if (!pendingPropertyPurchase) return null;

    return getPropertyPurchasePrice(
      pendingPropertyPurchase.property,
      getPropertyPriceIndex(
        propertyMarket,
        pendingPropertyPurchase.property.id,
      ),
    );
  }, [pendingPropertyPurchase, propertyMarket]);

  const pendingLandmarkPurchaseRequirement = useMemo(() => {
    if (!pendingPropertyPurchase || !pendingPurchasePlayer) {
      return null;
    }

    return getLandmarkPurchaseRequirement(
      properties,
      propertyOwnerships,
      pendingPurchasePlayer.id,
      pendingPropertyPurchase.property,
    );
  }, [
    pendingPropertyPurchase,
    pendingPurchasePlayer,
    properties,
    propertyOwnerships,
  ]);

  const canPurchasePendingProperty = useMemo(() => {
    if (
      pendingPurchasePrice === null ||
      !pendingPurchasePlayer
    ) {
      return false;
    }

    if (
      pendingLandmarkPurchaseRequirement &&
      !pendingLandmarkPurchaseRequirement.eligible
    ) {
      return false;
    }

    return canAfford(
      players,
      pendingPurchasePlayer.id,
      pendingPurchasePrice,
    );
  }, [
    pendingLandmarkPurchaseRequirement,
    pendingPurchasePlayer,
    pendingPurchasePrice,
    players,
  ]);


  const pendingDevelopmentPlayer = useMemo(() => {
    if (!pendingPropertyDevelopment) return null;

    return (
      players.find(
        (player) => player.id === pendingPropertyDevelopment.playerId,
      ) ?? null
    );
  }, [pendingPropertyDevelopment, players]);

  const pendingDevelopmentOwnership = useMemo(() => {
    if (!pendingPropertyDevelopment) return null;

    return (
      propertyOwnerships[
        pendingPropertyDevelopment.propertyId
      ] ?? null
    );
  }, [pendingPropertyDevelopment, propertyOwnerships]);

  const pendingDevelopmentNextStage = useMemo(() => {
    if (!pendingDevelopmentOwnership) return null;

    return getNextDevelopmentStage(pendingDevelopmentOwnership.stage);
  }, [pendingDevelopmentOwnership]);

  const pendingDevelopmentCost = useMemo(() => {
    if (
      !pendingPropertyDevelopment ||
      !pendingDevelopmentOwnership
    ) {
      return null;
    }

    const baseConstructionCost = getNextConstructionCost(
      pendingPropertyDevelopment.property,
      pendingDevelopmentOwnership.stage,
    );

    return baseConstructionCost === null
      ? null
      : Math.max(
          1,
          Math.round(
            getPolicyConstructionCost(baseConstructionCost, activeMayorPolicy) *
              cityHallConstructionCostMultiplier *
              getCityHallDevelopmentSupportMultiplier(
                cityHallState,
                pendingPropertyDevelopment.playerId,
                pendingPropertyDevelopment.propertyId,
              ) *
              economicNewsConstructionCostMultiplier *
              (hasAuctionItem(
                auctionState,
                pendingPropertyDevelopment.playerId,
                "CONSTRUCTION_SUPPORT",
              )
                ? 0.7
                : 1),
          ),
        );
  }, [
    activeMayorPolicy,
    auctionState,
    cityHallConstructionCostMultiplier,
    cityHallState,
    economicNewsConstructionCostMultiplier,
    pendingPropertyDevelopment,
    pendingDevelopmentOwnership,
  ]);

  const canDevelopPendingProperty = useMemo(() => {
    if (
      !pendingDevelopmentPlayer ||
      pendingDevelopmentCost === null
    ) {
      return false;
    }

    if (
      pendingPropertyDevelopment &&
      isDevelopmentRestricted(
        developmentRestrictions,
        pendingPropertyDevelopment.propertyId,
        turn.turnNumber,
      )
    ) {
      return false;
    }

    return canAfford(
      players,
      pendingDevelopmentPlayer.id,
      pendingDevelopmentCost,
    );
  }, [
    developmentRestrictions,
    pendingDevelopmentCost,
    pendingDevelopmentPlayer,
    pendingPropertyDevelopment,
    players,
    turn.turnNumber,
  ]);

  const pendingTollPayer = useMemo(() => {
    if (!pendingTollPayment) return null;

    return (
      players.find(
        (player) => player.id === pendingTollPayment.payerPlayerId,
      ) ?? null
    );
  }, [pendingTollPayment, players]);

  const pendingTollOwner = useMemo(() => {
    if (!pendingTollPayment) return null;

    return (
      players.find(
        (player) => player.id === pendingTollPayment.ownerPlayerId,
      ) ?? null
    );
  }, [pendingTollPayment, players]);

  const canPayPendingToll = useMemo(() => {
    if (!pendingTollPayment || !pendingTollPayer) return false;

    return (
      pendingTollPayer.money +
        getGeneralDepositBalance(bankState, pendingTollPayer.id) >=
      pendingTollPayment.amount
    );
  }, [bankState, pendingTollPayment, pendingTollPayer]);

  const canUsePendingTollExemption = useMemo(
    () =>
      Boolean(pendingTollPayment) &&
      hasAuctionItem(
        auctionState,
        pendingTollPayment?.payerPlayerId ?? "",
        "TOLL_EXEMPTION",
      ),
    [auctionState, pendingTollPayment],
  );

  const pendingLiquidationAssets = useMemo(() => {
    if (!pendingTollPayment) return [];

    return getSellablePropertyAssets(
      propertyOwnerships,
      properties,
      pendingTollPayment.payerPlayerId,
      propertyMarket,
      getPolicyPropertySaleRate(activeMayorPolicy),
    );
  }, [
    activeMayorPolicy,
    pendingTollPayment,
    properties,
    propertyMarket,
    propertyOwnerships,
  ]);

  const pendingStockLiquidationAssets = useMemo(() => {
    if (!pendingTollPayment) return [];

    return getSellableStockAssets(
      stockPortfolios,
      stockCompanies,
      stockMarket,
      pendingTollPayment.payerPlayerId,
    );
  }, [
    pendingTollPayment,
    stockCompanies,
    stockMarket,
    stockPortfolios,
  ]);

  const pendingLiquidationValue = useMemo(
    () =>
      getCombinedLiquidationValue(
        pendingLiquidationAssets,
        pendingStockLiquidationAssets,
      ),
    [pendingLiquidationAssets, pendingStockLiquidationAssets],
  );

  const pendingTollShortfall = useMemo(() => {
    if (!pendingTollPayment || !pendingTollPayer) return 0;

    return getDebtShortfall(
      pendingTollPayer.money +
        getGeneralDepositBalance(bankState, pendingTollPayer.id),
      pendingTollPayment.amount,
    );
  }, [bankState, pendingTollPayment, pendingTollPayer]);

  const canCoverPendingTollAfterLiquidation = useMemo(() => {
    if (!pendingTollPayment || !pendingTollPayer) return false;

    return canCoverDebtAfterLiquidation(
      pendingTollPayer.money +
        getGeneralDepositBalance(bankState, pendingTollPayer.id),
      pendingTollPayment.amount,
      pendingLiquidationAssets,
      pendingStockLiquidationAssets,
    );
  }, [
    bankState,
    pendingLiquidationAssets,
    pendingStockLiquidationAssets,
    pendingTollPayment,
    pendingTollPayer,
  ]);

  const canDeclarePendingTollBankruptcy =
    Boolean(pendingTollPayment) &&
    !canPayPendingToll &&
    pendingLiquidationAssets.length === 0 &&
    pendingStockLiquidationAssets.length === 0;

  const pendingTollOwnerIncome = useMemo(() => {
    if (!pendingTollPayment) return 0;
    return getJailTollOwnerIncome(
      pendingTollPayment.amount,
      pendingTollOwner,
    );
  }, [pendingTollOwner, pendingTollPayment]);

  const pendingJailLiquidationAssets = useMemo(() => {
    if (!pendingJailFine) return [];
    return getSellablePropertyAssets(
      propertyOwnerships,
      properties,
      pendingJailFine.playerId,
      propertyMarket,
      getPolicyPropertySaleRate(activeMayorPolicy),
    );
  }, [
    activeMayorPolicy,
    pendingJailFine,
    properties,
    propertyMarket,
    propertyOwnerships,
  ]);

  const pendingJailStockLiquidationAssets = useMemo(() => {
    if (!pendingJailFine) return [];
    return getSellableStockAssets(
      stockPortfolios,
      stockCompanies,
      stockMarket,
      pendingJailFine.playerId,
    );
  }, [pendingJailFine, stockCompanies, stockMarket, stockPortfolios]);

  const pendingJailLiquidationValue = useMemo(
    () =>
      getCombinedLiquidationValue(
        pendingJailLiquidationAssets,
        pendingJailStockLiquidationAssets,
      ),
    [pendingJailLiquidationAssets, pendingJailStockLiquidationAssets],
  );

  const pendingJailShortfall = useMemo(() => {
    if (!pendingJailFine || !pendingJailFinePlayer) return 0;
    return getDebtShortfall(
      pendingJailFinePlayer.money +
        getGeneralDepositBalance(bankState, pendingJailFinePlayer.id),
      pendingJailFine.amount,
    );
  }, [bankState, pendingJailFine, pendingJailFinePlayer]);

  const canPayPendingJailFine = useMemo(() => {
    if (!pendingJailFine || !pendingJailFinePlayer) return false;
    return (
      pendingJailFinePlayer.money +
        getGeneralDepositBalance(bankState, pendingJailFinePlayer.id) >=
      pendingJailFine.amount
    );
  }, [bankState, pendingJailFine, pendingJailFinePlayer]);

  const canCoverPendingJailFineAfterLiquidation = useMemo(() => {
    if (!pendingJailFine || !pendingJailFinePlayer) return false;
    return canCoverDebtAfterLiquidation(
      pendingJailFinePlayer.money +
        getGeneralDepositBalance(bankState, pendingJailFinePlayer.id),
      pendingJailFine.amount,
      pendingJailLiquidationAssets,
      pendingJailStockLiquidationAssets,
    );
  }, [
    bankState,
    pendingJailFine,
    pendingJailFinePlayer,
    pendingJailLiquidationAssets,
    pendingJailStockLiquidationAssets,
  ]);

  const canDeclarePendingJailBankruptcy =
    Boolean(pendingJailFine) &&
    !canPayPendingJailFine &&
    pendingJailLiquidationAssets.length === 0 &&
    pendingJailStockLiquidationAssets.length === 0;

  const pendingTaxAssessment = useMemo(() => {
    if (!pendingTaxSettlement) return null;

    return (
      pendingTaxSettlement.assessments[
        pendingTaxSettlement.currentIndex
      ] ?? null
    );
  }, [pendingTaxSettlement]);

  const pendingTaxPlayer = useMemo(() => {
    if (!pendingTaxAssessment) return null;

    return (
      players.find(
        (player) => player.id === pendingTaxAssessment.playerId,
      ) ?? null
    );
  }, [pendingTaxAssessment, players]);

  const canPayPendingTax = useMemo(() => {
    if (!pendingTaxAssessment || !pendingTaxPlayer) return false;

    return (
      pendingTaxPlayer.money +
        getGeneralDepositBalance(bankState, pendingTaxPlayer.id) >=
      pendingTaxAssessment.totalAmount
    );
  }, [bankState, pendingTaxAssessment, pendingTaxPlayer]);

  const pendingTaxLiquidationAssets = useMemo(() => {
    if (!pendingTaxAssessment) return [];

    return getSellablePropertyAssets(
      propertyOwnerships,
      properties,
      pendingTaxAssessment.playerId,
      propertyMarket,
      getPolicyPropertySaleRate(activeMayorPolicy),
    );
  }, [
    activeMayorPolicy,
    pendingTaxAssessment,
    properties,
    propertyMarket,
    propertyOwnerships,
  ]);

  const pendingTaxStockLiquidationAssets = useMemo(() => {
    if (!pendingTaxAssessment) return [];

    return getSellableStockAssets(
      stockPortfolios,
      stockCompanies,
      stockMarket,
      pendingTaxAssessment.playerId,
    );
  }, [
    pendingTaxAssessment,
    stockCompanies,
    stockMarket,
    stockPortfolios,
  ]);

  const pendingTaxLiquidationValue = useMemo(
    () =>
      getCombinedLiquidationValue(
        pendingTaxLiquidationAssets,
        pendingTaxStockLiquidationAssets,
      ),
    [pendingTaxLiquidationAssets, pendingTaxStockLiquidationAssets],
  );

  const pendingTaxShortfall = useMemo(() => {
    if (!pendingTaxAssessment || !pendingTaxPlayer) return 0;

    return getDebtShortfall(
      pendingTaxPlayer.money +
        getGeneralDepositBalance(bankState, pendingTaxPlayer.id),
      pendingTaxAssessment.totalAmount,
    );
  }, [bankState, pendingTaxAssessment, pendingTaxPlayer]);

  const canCoverPendingTaxAfterLiquidation = useMemo(() => {
    if (!pendingTaxAssessment || !pendingTaxPlayer) return false;

    return canCoverDebtAfterLiquidation(
      pendingTaxPlayer.money +
        getGeneralDepositBalance(bankState, pendingTaxPlayer.id),
      pendingTaxAssessment.totalAmount,
      pendingTaxLiquidationAssets,
      pendingTaxStockLiquidationAssets,
    );
  }, [
    bankState,
    pendingTaxAssessment,
    pendingTaxLiquidationAssets,
    pendingTaxPlayer,
    pendingTaxStockLiquidationAssets,
  ]);

  const canDeclarePendingTaxBankruptcy =
    Boolean(pendingTaxAssessment) &&
    !canPayPendingTax &&
    pendingTaxLiquidationAssets.length === 0 &&
    pendingTaxStockLiquidationAssets.length === 0;

  const isRollingDice = turn.phase === "ROLLING_DICE";
  const isMoving = turn.phase === "MOVING" || turn.phase === "ARRIVED";
  const isTokenMoving = turn.phase === "MOVING";

  useEffect(() => {
    if (!salaryNotice) return;

    const timeoutId = window.setTimeout(() => {
      setSalaryNotice((currentNotice) =>
        currentNotice?.id === salaryNotice.id ? null : currentNotice,
      );
    }, SALARY_NOTICE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [salaryNotice]);

  useEffect(() => {
    const currentNotice = bankNoticeQueue[0];
    if (!currentNotice) return;

    const timeoutId = window.setTimeout(() => {
      setBankNoticeQueue((queue) =>
        queue[0]?.id === currentNotice.id ? queue.slice(1) : queue,
      );
    }, BANK_NOTICE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [bankNoticeQueue]);

  useEffect(() => {
    const settlementTurn = turn.turnNumber - 1;
    if (!isScheduledBankInterestTurn(settlementTurn)) return;
    if (bankStateRef.current.lastInterestTurn === settlementTurn) return;

    const eligiblePlayerIds = playersRef.current
      .filter((player) => !player.isBankrupt)
      .map((player) => player.id);
    const settlementEconomicNews = getActiveEconomicNews(
      economicNewsStateRef.current,
      settlementTurn,
    );
    const depositBonusMultipliers = Object.fromEntries(
      eligiblePlayerIds
        .filter((playerId) =>
          hasAuctionItem(auctionStateRef.current, playerId, "DEPOSIT_BONUS"),
        )
        .map((playerId) => [playerId, 2]),
    );
    const result = applyGeneralDepositInterest(
      bankStateRef.current,
      eligiblePlayerIds,
      settlementTurn,
      getEconomicNewsBankInterestMultiplier(settlementEconomicNews,) *
        getCityHallBankInterestMultiplier(getActiveCityHallTerm(cityHallStateRef.current,settlementTurn,),) *
        getMacroBankInterestMultiplier(macroEconomyStateRef.current.interestRateLevel,),
        depositBonusMultipliers, );
      commitBankState(result.state);

    let nextAuctionState = auctionStateRef.current;
    let usedDepositBonus = false;
    for (const credit of result.credits) {
      if (!depositBonusMultipliers[credit.playerId]) continue;
      const consumed = consumeAuctionItem(
        nextAuctionState,
        credit.playerId,
        "DEPOSIT_BONUS",
      );
      if (!consumed) continue;
      nextAuctionState = consumed.state;
      usedDepositBonus = true;
    }
    if (usedDepositBonus) commitAuctionState(nextAuctionState);

    if (result.credits.length > 0) {
      const totalInterest = result.credits.reduce(
        (total, credit) => total + credit.interestAmount,
        0,
      );
      enqueueBankNotice(
        "일반예금 이자 지급",
        `${settlementTurn}턴 정산 · ${result.credits.length}명에게 총 ${totalInterest.toLocaleString("ko-KR")}만원 지급`,
        "POSITIVE",
      );
    }
  }, [
    commitAuctionState,
    commitBankState,
    enqueueBankNotice,
    turn.turnNumber,
  ]);

  useEffect(() => {
    if (turn.turnSequence <= 0 || turn.phase !== "WAITING_FOR_ROLL") return;

    const playerId = turn.activePlayerId;
    const player = playersRef.current.find((item) => item.id === playerId);
    if (!player || player.isBankrupt) return;

    const contract = getRecurringSavingsContract(
      bankStateRef.current,
      playerId,
    );
    if (!contract || turn.turnNumber < contract.nextPaymentTurn) return;

    const product = getRecurringSavingsProduct(contract.productId);
    if (!product) return;

    if (getPlayerLiquidBalance(playerId) < contract.installmentAmount) {
      const savingsGrace = consumeAuctionItem(
        auctionStateRef.current,
        playerId,
        "SAVINGS_GRACE",
      );
      if (savingsGrace) {
        commitAuctionState(savingsGrace.state);
        commitBankState({
          ...bankStateRef.current,
          recurringSavings: {
            ...bankStateRef.current.recurringSavings,
            [playerId]: {
              ...contract,
              nextPaymentTurn: turn.turnNumber + 1,
            },
          },
        });
        enqueueBankNotice(
          `${player.name} 적금 납입 유예권 사용`,
          `${formatBankMoney(contract.installmentAmount)} 납입을 다음 자기 차례로 연장했습니다. 실패 횟수는 증가하지 않습니다.`,
          "NEUTRAL",
        );
        return;
      }

      const failure = recordRecurringSavingsFailure(
        bankStateRef.current,
        playerId,
        turn.turnNumber,
      );
      if (!failure) return;

      commitBankState(failure.state);
      if (failure.cancelled) {
        if (failure.refundAmount > 0) {
          deposit(
            playerId,
            failure.refundAmount,
            "SAVINGS_REFUND",
            `${product.name} 2회 납입 실패 · 원금 90% 환급`,
          );
        }
        enqueueBankNotice(
          `${player.name} 적금 강제 해지`,
          `두 번째 납입 실패로 ${failure.refundAmount.toLocaleString("ko-KR")}만원이 환급됐습니다.`,
          "NEGATIVE",
        );
      } else {
        enqueueBankNotice(
          `${player.name} 적금 납입 유예`,
          `${formatBankMoney(contract.installmentAmount)} 부족 · 다음 자기 차례에 다시 납입합니다.`,
          "NEGATIVE",
        );
      }
      return;
    }

    const prepared = prepareMandatoryPayment(
      playerId,
      contract.installmentAmount,
      `${product.name} 자동 납입 부족분`,
    );
    if (!prepared) return;

    const payment = withdraw(
      playerId,
      contract.installmentAmount,
      "SAVINGS_PAYMENT",
      `${product.name} ${contract.installmentsPaid + 1}회차`,
    );
    if (!payment.ok) return;

    const recorded = recordRecurringSavingsPayment(
      bankStateRef.current,
      playerId,
      turn.turnNumber,
    );
    if (!recorded) return;

    if (recorded.contract.installmentsPaid >= recorded.contract.installmentCount) {
      commitBankState(completeRecurringSavings(recorded.state, playerId));
      deposit(
        playerId,
        product.maturityPayout,
        "SAVINGS_MATURITY",
        `${product.name} 만기`,
      );
      enqueueBankNotice(
        `${player.name} 적금 만기`,
        `${product.maturityPayout.toLocaleString("ko-KR")}만원이 현금으로 지급됐습니다.`,
        "POSITIVE",
      );
      return;
    }

    commitBankState(recorded.state);
    enqueueBankNotice(
      `${player.name} 적금 자동 납입`,
      `${recorded.contract.installmentsPaid}/${recorded.contract.installmentCount}회 · ${contract.installmentAmount.toLocaleString("ko-KR")}만원 납입`,
      "NEUTRAL",
    );
  }, [
    commitAuctionState,
    commitBankState,
    deposit,
    enqueueBankNotice,
    getPlayerLiquidBalance,
    prepareMandatoryPayment,
    turn.activePlayerId,
    turn.phase,
    turn.turnNumber,
    turn.turnSequence,
    withdraw,
  ]);
 
const {
  disasterState,
  disasterStateRef,
  activeDisasterPenalties,

  pendingDisasterResolution,
  pendingDisasterAssessment,
  pendingDisasterPlayer,

  canConfirmPendingDisasterEvent,
  canInteractWithPendingDisaster,
  canPayPendingDisaster,

  pendingDisasterLiquidationAssets,
  pendingDisasterStockLiquidationAssets,
  pendingDisasterLiquidationValue,
  pendingDisasterShortfall,
  canCoverPendingDisasterAfterLiquidation,
  canDeclarePendingDisasterBankruptcy,

  disasterPaymentError,
  disasterLiquidationError,

  startDisasterResolution,

  acknowledgePendingDisasterEvent,
  completePendingDisasterResolution,

  payPendingDisasterRepair,
  sellPropertyForPendingDisaster,
  sellStockForPendingDisaster,
  declarePendingDisasterBankruptcy,

  applyDisasterResolved,
  applyDisasterActionDecided,

  devRunDisaster,
  devResetDisasterCooldown,

  clearPendingDisasterResolution,
  resetDisasterResolution,
} = useDisasterResolution({
  players,
  playersRef,

  propertyOwnerships,
  propertyOwnershipsRef,

  propertyMarket,
  propertyMarketRef,

  stockPortfolios,
  stockPortfoliosRef,

  stockMarket,
  stockMarketRef,

  insuranceContractsRef,
  lottoStateRef,

  cityHallStateRef,
  auctionStateRef,

  properties,
  stockCompanies,

  activeMayorPolicy,

  localPlayerId:
    resolvedLocalPlayerId,

  /*
   * 로컬/DEV에서만 사용.
   * 온라인 authoritative 진행자는
   * controllerPlayerId를 사용한다.
   */
  activePlayerId:
    turn.activePlayerId,

  controllerPlayerId:
    networkControllerPlayerId,

  turnNumber:
    turn.turnNumber,

  turnSequence:
    turn.turnSequence,

  networkTurnNumber,
  networkTurnSequence,

  canRunDev:
    turn.canRoll,

  commitPlayers,
  commitPropertyOwnerships,
  commitPropertyMarket,
  commitStockPortfolios,
  commitLottoState,
  commitInsuranceContracts,
  commitAuctionState,

  getPlayerLiquidBalance,
  deposit,
  withdraw,

  prepareMandatoryPayment,
  settleBankAssetsForBankruptcy,

  startDisasterPhase:
    turn.startDisaster,

  completeDisasterPhase:
    turn.completeDisaster,

  completeTurn:
    turn.completeTurn,

  cancelCurrentAction:
    turn.cancelCurrentAction,

  onNetworkGameEventRequest,
});
  
const {
  startNewspaperEconomicNews,
  startRandomEconomicNewsResolution,
  applyPendingEconomicNews,
  closePendingEconomicNews,
  applyEconomicNewsDrawDecided,
  applyEconomicNewsApplied,
  applyEconomicNewsConfirmed,
  canInteractWithEconomicNews,
  resetEconomicNewsResolution,
} = useEconomicNewsResolution({
  pendingEconomicNews,
  setPendingEconomicNews,

  economicNewsStateRef,
  economicNewsPool,

  propertyOwnershipsRef,
  developmentRestrictionsRef,
  properties,

  localPlayerId:
    resolvedLocalPlayerId,

  activePlayerId:
    networkActivePlayerId ??
    turn.activePlayerId,

  controllerPlayerId: networkControllerPlayerId,  

  turnNumber:
    turn.turnNumber,

  turnSequence:
    networkTurnSequence ??
    turn.turnSequence,

  commitEconomicNewsState,
  commitDevelopmentRestrictions,

  completeTileResolution:
    completeTileResolutionBridge,

  isTileResolutionReady:
    turn.phase === "ARRIVED" ||
    turn.phase === "RESOLVING_TILE",  

  startEconomicNewsPhase:
    turn.startEconomicNews,

  cancelCurrentAction:
    turn.cancelCurrentAction,

  startDisasterResolution,

  onNetworkGameEventRequest,
});

const {
  startMayorElectionResolution,
  castMayorElectionVote,
  completePendingMayorElection,

  applyMayorElectionStarted,
  applyMayorElectionVoteCast,
  applyMayorElectionResultResolved,
  applyMayorElectionResultConfirmed,

  resetMayorElectionResolution,

  currentMayorElectionVoterId,
  canVoteInMayorElection,
  canConfirmMayorElectionResult,
  } = useMayorElectionResolution({
  pendingMayorElection,
  setPendingMayorElection,

  playersRef,
  currentMayorTermRef,

  localPlayerId:
    resolvedLocalPlayerId,

  controllerPlayerId:
    networkControllerPlayerId,

  /*
   * apply WAIT/INVALID 판단은
   * 현재 로컬 lifecycle 기준.
   */
  turnNumber:
    turn.turnNumber,

  turnSequence:
    turn.turnSequence,

  /*
   * 이벤트 발행은
   * 서버 authoritative 값 기준.
   */
  networkTurnNumber,
  networkTurnSequence,

  canRunDev:
    turn.canRoll,

  commitMayorTerm,

  startMayorElectionPhase:
    turn.startMayorElection,

  completeMayorElectionPhase:
    turn.completeMayorElection,

  cancelCurrentAction:
    turn.cancelCurrentAction,

  startRandomEconomicNewsResolution,

  onNetworkGameEventRequest,
});

const continueAfterLottoDraw =
  useCallback(
    (
      mode:
        "SCHEDULED" | "DEV",

      additionallyDisabledPlayerIds:
        string[],
    ) => {
      if (mode === "DEV") {
        turn.cancelCurrentAction();
        return;
      }

      if (
        isScheduledMayorElectionTurn(
          turn.turnNumber,
        )
      ) {
        startMayorElectionResolution(
          "SCHEDULED",
          additionallyDisabledPlayerIds,
        );

        return;
      }

      startRandomEconomicNewsResolution(
        "SCHEDULED",
        additionallyDisabledPlayerIds,
      );
    },
    [
      startMayorElectionResolution,
      startRandomEconomicNewsResolution,
      turn,
    ],
  );

  const {
    startLottoDrawResolution,
    confirmLottoDraw,
    canConfirmLottoDraw,

    applyLottoDrawResolved,
    applyLottoDrawConfirmed,

    resetLottoDrawResolution,
  } = useLottoDrawResolution({
    pendingLottoDrawResolution,
    setPendingLottoDrawResolution,

    lottoStateRef,
    playersRef,

    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId: networkControllerPlayerId,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    turnNumber:
      turn.turnNumber,


    onNetworkGameEventRequest,

    commitLottoState,
    deposit,

    startLottoDrawPhase:
      turn.startLottoDraw,

    continueAfterLottoDraw,
  });

  const continueAfterPortSettlement = useCallback(
    (additionallyDisabledPlayerIds: string[] = []) => {
      if (isScheduledLottoTurn(turn.turnNumber)) {
        startLottoDrawResolution(
          "SCHEDULED",
          additionallyDisabledPlayerIds,
        );
        return;
      }

      if (isScheduledMayorElectionTurn(turn.turnNumber)) {
        startMayorElectionResolution(
          "SCHEDULED",
          additionallyDisabledPlayerIds,
        );
        return;
      }

      startRandomEconomicNewsResolution(
        "SCHEDULED",
        additionallyDisabledPlayerIds,
      );
    },
    [
      startLottoDrawResolution,
      startRandomEconomicNewsResolution,
      startMayorElectionResolution,
      turn.turnNumber,
    ],
  );

  const {
    startPortSettlementResolution,
    confirmPortSettlement,
    applyPortSettlementResolved,
    applyPortSettlementConfirmed,
    resetPortSettlementResolution,

  } = usePortSettlementResolution({
    pendingPortSettlement,
    setPendingPortSettlement,
    portStateRef,
    auctionStateRef,
    cityHallStateRef,
    disasterStateRef,
    economicNewsStateRef,
    stockMarketRef,
    playersRef,
    stockCompanies,
    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId: networkControllerPlayerId,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    turnNumber:
      turn.turnNumber,

    commitPortState,
    commitAuctionState,
    deposit,
    startPortSettlementPhase:
      turn.startPortSettlement,
    continueAfterPortSettlement,
    onNetworkGameEventRequest,
  });

  const {
    startStockMarketResolution,
    confirmStockMarketSettlement,
    applyStockMarketResolved,
    applyStockMarketSettlementConfirmed,
    resetStockMarketResolution,

  } = useStockMarketResolution({
    pendingStockMarketResolution,
    setPendingStockMarketResolution,
    stockMarketRef,
    stockPortfoliosRef,
    companyDividendModifiersRef,
    auctionStateRef,
    cityHallStateRef,
    economicNewsStateRef,
    currentMayorTermRef,
    stockIndustries,
    stockCompanies,
    localPlayerId:
    resolvedLocalPlayerId,

    controllerPlayerId: networkControllerPlayerId,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    turnNumber:
      turn.turnNumber,

    commitStockMarket,
    commitAuctionState,
    commitCityHallState,

    deposit,

    startStockMarketSettlementPhase:
      turn.startStockMarketSettlement,

    cancelCurrentAction:
      turn.cancelCurrentAction,

    startPortSettlementResolution,

    onNetworkGameEventRequest,
  });  

  const {
    pendingCompanyDividendEvent,

    startCompanyDividendEventResolution,
    applyCompanyDividendEventResolved,

    dismissCompanyDividendEvent,

    resetCompanyDividendEventResolution,
  } = useCompanyDividendEventResolution({
    companyDividendModifiersRef,

    macroEconomyStateRef,

    stockCompanies,

    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId:
      networkControllerPlayerId,

    turnNumber:
      turn.turnNumber,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    startStockMarketResolution,

    onNetworkGameEventRequest,
  });

  const {
    startMacroEconomyResolution,
    applyMacroEconomyResolved,
    resetMacroEconomyResolution,
  } = useMacroEconomyResolution({
    macroEconomyStateRef,

    commitMacroEconomyState,

    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId:
      networkControllerPlayerId,

    /*
    * 실제 경기 정산 대상은
    * 로컬 완료 턴 N.
    */
    turnNumber:
      turn.turnNumber,

    /*
    * 이벤트 sequence는
    * 서버 authoritative sequence.
    */
    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    startStockMarketResolution: startCompanyDividendEventResolution,

    onNetworkGameEventRequest,
  });

  const startPostFestivalMarketResolution =
    useCallback(
      (
        mode:
          | "SCHEDULED"
          | "DEV",

        additionallyDisabledPlayerIds:
          string[] = [],
      ): void => {
        /*
        * DEV 주식 정산은 기존처럼
        * 경기 국면을 거치지 않는다.
        */
        if (mode === "DEV") {
          startStockMarketResolution(
            "DEV",
            additionallyDisabledPlayerIds,
          );

          return;
        }

        startMacroEconomyResolution(
          additionallyDisabledPlayerIds,
        );
      },
      [
        startMacroEconomyResolution,
        startStockMarketResolution,
      ],
    );  

  const getActiveFestivalTollMultiplier = useCallback(
    (property: PropertyData): number =>
      getFestivalTollMultiplier(activeFestival, property),
    [activeFestival],
  );


  const {
    continueAfterPropertyMarket,
    continueGlobalTurnSettlement,

    completeFestivalAnnouncement,
    completePendingTouristTurn,

    applyFestivalTriggerResolved,
    applyFestivalAnnouncementConfirmed,
    applyTouristTurnResolved,
    applyTouristTurnConfirmed,
    applyFestivalDevEnded,

    devRunFestival,
    devEndFestival,

    resetFestivalResolution,

    canConfirmFestivalAnnouncement,
    canConfirmTouristTurn,
  } = useFestivalResolution({
    festivalDeckStateRef,

    activeFestivalRef,
    touristNpcRef,

    festivalSettlementBusyRef,

    pendingFestivalAnnouncement,
    setPendingFestivalAnnouncement,

    pendingTouristTurnResult,
    setPendingTouristTurnResult,

    playersRef,

    propertyOwnershipsRef,
    propertyMarketRef,

    cityHallStateRef,
    disasterStateRef,

    tiles,
    properties,

    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId:
      networkControllerPlayerId,

    /*
    * apply WAIT 판단은 로컬 lifecycle 기준.
    */
    turnNumber:
      turn.turnNumber,

    turnSequence:
      turn.turnSequence,

    /*
    * 이벤트 발행은 서버 authoritative 값.
    */
    networkTurnNumber,
    networkTurnSequence,

    canRunDev:
      turn.canRoll,

    policyTollMultiplier:
      getPolicyTollMultiplier(
        activeMayorPolicy,
      ),

    economicNewsTollMultiplier,

    commitFestivalDeckState,
    commitActiveFestival,
    commitTouristNpc,
    commitFestivalSettlementBusy,

    deposit,

    startStockMarketResolution:startPostFestivalMarketResolution,

    onNetworkGameEventRequest,
  });

  const {
    startPropertyMarketResolution,
    confirmPropertyMarketSettlement:
      completePendingMarketResolution,
    canConfirmPropertyMarketSettlement:
      canConfirmPendingMarketResolution,
    applyPropertyMarketResolved,
    applyPropertyMarketSettlementConfirmed,

    resetPropertyMarketResolution,

  } = usePropertyMarketResolution({
    pendingMarketResolution,
    setPendingMarketResolution,

    propertyMarketRef,
    auctionStateRef,
    cityHallStateRef,
    economicNewsStateRef,
    currentMayorTermRef,
    properties,
    localPlayerId:resolvedLocalPlayerId,

    controllerPlayerId: networkControllerPlayerId,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    turnNumber:
      turn.turnNumber,

    commitPropertyMarket,
    commitAuctionState,
    startMarketSettlementPhase:
      turn.startMarketSettlement,
    cancelCurrentAction:
      turn.cancelCurrentAction,
    continueAfterPropertyMarket,
    onNetworkGameEventRequest,
  });

  const {
    startTaxSettlementResolution,

    payPendingTax,
    sellPropertyForPendingTax,
    sellStockForPendingTax,
    declarePendingTaxBankruptcy,

    canInteractWithPendingTax,

    applyTaxSettlementStarted,
    applyTaxActionDecided,

    resetTaxSettlementResolution,
  } = useTaxSettlementResolution({
    pendingTaxSettlement,
    setPendingTaxSettlement,

    setTaxPaymentError,
    setTaxLiquidationError,

    playersRef,

    propertyOwnershipsRef,
    propertyMarketRef,

    stockPortfoliosRef,
    stockMarketRef,

    insuranceContractsRef,
    lottoStateRef,

    cityHallStateRef,
    auctionStateRef,

    properties,
    stockCompanies,

    activeMayorPolicy,

    localPlayerId:
      resolvedLocalPlayerId,

    controllerPlayerId: networkControllerPlayerId,

    turnSequence:
      networkTurnSequence ??
      turn.turnSequence,

    turnNumber:
      turn.turnNumber,

    commitPlayers,

    commitPropertyOwnerships,
    commitStockPortfolios,

    commitLottoState,

    commitInsuranceContracts,

    commitCityHallState,
    commitAuctionState,

    getPlayerLiquidBalance,

    deposit,
    withdraw,

    prepareMandatoryPayment,
    settleBankAssetsForBankruptcy,

    startTaxSettlementPhase:
      turn.startTaxSettlement,

    startPropertyMarketResolution,

    onNetworkGameEventRequest,
  });

  const finishTurnAfterStockTrading = useCallback(
    (
      additionallyDisabledPlayerIds:
        string[] = [],
    ) => {
      resetDoubleChain();
      setIsStockMarketOpen(false);
      setStockTradeError(null);
      setLastMove(null);

      const turnAdvance =
        turn.previewTurnAdvance(
          additionallyDisabledPlayerIds,
        );

      if (
        turnAdvance.completedGlobalTurn &&
        isScheduledTaxTurn(
          turn.turnNumber,
        )
      ) {
        startTaxSettlementResolution(
          additionallyDisabledPlayerIds,
        );

        return;
      }

      if (
        turnAdvance.completedGlobalTurn
      ) {
        continueGlobalTurnSettlement(
          additionallyDisabledPlayerIds,
        );

        return;
      }

      turn.completeTurn(
        additionallyDisabledPlayerIds,
      );
    },
    [
      continueGlobalTurnSettlement,
      resetDoubleChain,
      startTaxSettlementResolution,
      turn,
    ],
  );

  const sendNetworkTurnReady =
    useCallback(() => {
      if (
        !onNetworkTurnReady ||
        networkTurnSequence === undefined
      ) {
        return;
      }

      if (
        turn.turnSequence !==
        networkTurnSequence
      ) {
        console.log(
          "[TURN READY WAIT SYNC]",
          {
            networkTurnSequence,
            localTurnSequence:
              turn.turnSequence,
            phase: turn.phase,
          },
        );

        return;
      }

      if (
        sentTurnReadySequenceRef.current ===
        networkTurnSequence
      ) {
        return;
      }

      sentTurnReadySequenceRef.current =
        networkTurnSequence;

      console.log(
        "[TURN READY SEND]",
        "turnSeq =",
        networkTurnSequence,
        "phase =",
        turn.phase,
        "localSeq =",
        turn.turnSequence,
      );

      onNetworkTurnReady(
        networkTurnSequence,
      );
    }, [
      networkTurnSequence,
      onNetworkTurnReady,
      turn.phase,
      turn.turnSequence,
    ]);

  useEffect(() => {
    if (
      turn.phase !==
      "STOCK_TRADING"
    ) {
      return;
    }

    sendNetworkTurnReady();
  }, [
    sendNetworkTurnReady,
    turn.phase,
  ]);

  const prepareNetworkJailTurnAdvance =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        pendingJailTurnAdvanceRef.current = [
          ...new Set(
            additionallyDisabledPlayerIds,
          ),
        ];

        sendNetworkTurnReady();
      },
      [
        sendNetworkTurnReady,
      ],
    );

  const completeNetworkJailTurnAdvance =
    useCallback(() => {
      const additionallyDisabledPlayerIds =
        pendingJailTurnAdvanceRef.current;

      if (
        additionallyDisabledPlayerIds ===
        null
      ) {
        return;
      }

      pendingJailTurnAdvanceRef.current =
        null;

      finishTurnAfterStockTrading(
        additionallyDisabledPlayerIds,
      );
    }, [
      finishTurnAfterStockTrading,
    ]);

  const finishJailTurn =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        if (onNetworkEndTurnRequest) {
          /*
          * 먼저 로컬에서 구치소 턴 종료 대기 상태를 저장한다.
          * 서버 턴 시퀀스가 증가하면
          * useNetworkTurnSync가 실제 정산을 시작한다.
          */
          prepareNetworkJailTurnAdvance(
            additionallyDisabledPlayerIds,
          );

          onNetworkEndTurnRequest();

          return;
        }

        /*
        * 네트워크가 없는 로컬 테스트 모드.
        */
        finishTurnAfterStockTrading(
          additionallyDisabledPlayerIds,
        );
      },
      [
        finishTurnAfterStockTrading,
        onNetworkEndTurnRequest,
        prepareNetworkJailTurnAdvance,
      ],
    );

  const completeTileResolution =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        const canCompleteTileResolution =
          turn.phase === "ARRIVED" ||
          turn.phase === "RESOLVING_TILE";

        if (!canCompleteTileResolution) {
          console.warn(
            "[TILE COMPLETE BLOCKED]",
            {
              phase:
                turn.phase,
              activePlayerId:
                turn.activePlayerId,
              networkTurnSequence,
              localTurnSequence:
                turn.turnSequence,
            },
          );

          console.warn(
            "[TILE COMPLETE BLOCKED]",
            {
              phase: turn.phase,
              activePlayerId: turn.activePlayerId,
              networkTurnSequence,
              localTurnSequence: turn.turnSequence,
            },
          );

          console.trace(
            "[TILE COMPLETE BLOCKED TRACE]",
          );

          return;
        }

      setPendingPropertyPurchase(null);
      setPropertyPurchaseError(null);
      setPendingPropertyDevelopment(null);
      setPropertyDevelopmentError(null);
      setPendingTollPayment(null);
      setTollPaymentError(null);
      setAssetLiquidationError(null);
      setPendingLotteryShop(null);
      setLotteryShopError(null);
      setPendingInsuranceShop(null);
      setInsuranceShopError(null);
      setPendingGoldenKey(null);
      setPendingEconomicNews(null);
      setPendingAirportTravel(null);
      setAirportTravelError(null);
      setAirportFlight(null);
      setPendingPortShop(null);
      setPortShopError(null);
      setPendingBankShop(null);
      setBankShopError(null);
      setPendingAuction(null);
      setAuctionError(null);
      setPendingMiniGame(null);
      setMiniGameError(null);

      const resolvingPlayer = playersRef.current.find(
        (player) => player.id === turn.activePlayerId,);

      if (turn.phase === "ARRIVED") {
        turn.startTileResolution();
      }

      const canGrantExtraRoll =
        pendingExtraRollRef.current &&
        !additionallyDisabledPlayerIds.includes(turn.activePlayerId) &&
        Boolean(resolvingPlayer) &&
        !resolvingPlayer?.isBankrupt &&
        !resolvingPlayer?.isJailed;

        console.log(
          "[TILE COMPLETE]",
          "phase=",
          turn.phase,
          "active=",
          turn.activePlayerId,
          "extra=",
          pendingExtraRollRef.current,
          "networkSeq=",
          networkTurnSequence,
          "localSeq=",
          turn.turnSequence,
        );

      if (canGrantExtraRoll) {
        pendingExtraRollRef.current = false;
        setIsStockMarketOpen(false);
        setStockTradeError(null);
        setLastMove(null);
        showDoubleDiceNotice({
          tone: "EXTRA_ROLL",
          title: "더블!",
          message: "도착 칸 처리가 끝났습니다. 한 번 더 굴립니다.",
        });

        console.log(
          "[EXTRA ROLL GRANT]",
          {
            phase: turn.phase,
            activePlayerId:
              turn.activePlayerId,
          },
        );

        turn.grantExtraRoll();
        return;
      }

      if (
        additionallyDisabledPlayerIds.includes(turn.activePlayerId) ||
        playersRef.current.find(
          (player) => player.id === turn.activePlayerId,
        )?.isBankrupt
      ) {
        finishTurnAfterStockTrading(additionallyDisabledPlayerIds);
        return;
      }

      setIsStockMarketOpen(false);
      setStockTradeError(null);
      turn.startStockTrading();
    },
    [
      finishTurnAfterStockTrading,
      showDoubleDiceNotice,
      turn,
    ],
  );

    const {
      openInsuranceShop,
      buyInsurance,
      closeInsuranceShop,
      applyInsuranceActionDecided,
      resetInsuranceShopResolution,
    } = useInsuranceShopResolution({
      pendingInsuranceShop,
      setPendingInsuranceShop,
      setInsuranceShopError,
      insuranceContractsRef,
      propertyOwnershipsRef,
      propertyMarketRef,
      properties,

      turnNumber:
        turn.turnNumber,

      turnSequence: turn.turnSequence,

      localPlayerId: resolvedLocalPlayerId,

      commitInsuranceContracts,
      canPlayerAfford,
      withdraw,
      completeTileResolution,
      onNetworkGameEventRequest,
    });

  const {
    startAuctionResolution,

    placeAuctionBid,
    passAuctionBid,
    discardAuctionItemForWinner,
    closePendingAuction,

    applyAuctionActionDecided,
    resetAuctionResolution,
  } = useAuctionResolution({
    pendingAuction,
    setPendingAuction,

    setAuctionError,

    auctionStateRef,
    playersRef,

    localPlayerId:
      resolvedLocalPlayerId,

    turnNumber:
      turn.turnNumber,

    turnSequence: turn.turnSequence,

    commitAuctionState,

    withdraw,

    isTileResolutionReady:
      turn.phase === "ARRIVED" ||
      turn.phase === "RESOLVING_TILE",    

    completeTileResolution,

    onNetworkGameEventRequest,
  });

  const {
    startMiniGameResolution,

    submitTimingStop,
    rollTargetMiniGameDice,

    submitOddEvenBet,
    submitHighLowBet,
    passMiniGameBet,

    completePendingMiniGame,

    applyMiniGameActionDecided,

    resetMiniGameResolution,
  } = useMiniGameResolution({
    pendingMiniGame,
    setPendingMiniGame,

    setMiniGameError,

    miniGameStateRef,
    playersRef,

    localPlayerId:
      resolvedLocalPlayerId,

    turnNumber:
      turn.turnNumber,

    turnSequence: turn.turnSequence,

    commitMiniGameState,

    deposit,
    withdraw,

    completeTileResolution,

    onNetworkGameEventRequest,
  });

  const {
    startCityHallVisit,
    submitPendingCityHallApplication,
    closePendingCityHallApplication,
    canInteractWithCityHall,
    applyCityHallActionDecided,
    resetCityHallResolution,
  } = useCityHallResolution({
    pendingCityHallSelection,
    setPendingCityHallSelection,

    cityHallStateRef,
    developmentRestrictionsRef,
    propertyOwnershipsRef,

    properties,
    stockIndustryIds: stockIndustries.map((industry) => industry.id),

    localPlayerId: resolvedLocalPlayerId,

    turnNumber: turn.turnNumber,
    turnSequence: networkTurnSequence ?? turn.turnSequence,

    commitCityHallState,
    commitDevelopmentRestrictions,

    completeTileResolution,
    isTileResolutionReady:
      turn.phase === "ARRIVED" ||
      turn.phase === "RESOLVING_TILE",
      onNetworkGameEventRequest,
  });

  const {
    startJailEntryResolution,
    confirmJailEntry,
    applyJailEntryConfirmed,
    resetJailEntryResolution,
    } = useJailEntryResolution({
      pendingJailEntry,
      setPendingJailEntry,
      setJailActionError,
      setJailLiquidationError,
      playersRef,
      commitPlayers,

      jailPosition:
        Math.max(
          0,
          tiles.findIndex(
            (tile) =>
              tile.type === "JAIL",
          ),
        ),

      localPlayerId:
        resolvedLocalPlayerId,

      turnSequence:
        networkTurnSequence ??
        turn.turnSequence,

      prepareNetworkTurnAdvance:
        prepareNetworkJailTurnAdvance,

      onNetworkEndTurnRequest,
      resetDoubleChain,
      finishTurnAfterStockTrading,

      onNetworkGameEventRequest,
    });

  const resolveArrivalTile = useCallback(
    (
      position: number,
      playerId: string,
      arrival?: UlsanMarbleArrivalContext,
    ) => {
      if (
        arrival &&
        (
          arrival.playerId !== playerId ||
          arrival.position !== position
        )
      ) {
        console.error(
          "[UlsanMarble] 도착 컨텍스트가 실제 도착 정보와 일치하지 않습니다.",
          {
            position,
            playerId,
            arrival,
          },
        );

        completeTileResolution();
        return;
      }
      setAssetLiquidationError(null);
      setPendingBankShop(null);
      setBankShopError(null);
      setMiniGameError(null);

      const tile = tiles[position];

      if (
        tile?.type !== "CITY_HALL"
      ) {
        setPendingCityHallSelection(null);
      }

      if (!tile) {
        completeTileResolution();
        return;
      }

      if (tile.type === "BANK") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingAirportTravel(null);
        setAirportTravelError(null);
        setPendingPortShop(null);
        setPortShopError(null);
        const bankVisitId =
          arrival?.arrivalId ??
          ["BANK",turn.turnSequence,playerId,position,].join(":");
        setPendingBankShop({playerId,visitId: bankVisitId,});
        return;
      }

      if (tile.type === "AIRPORT") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);

        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);

        setPendingTollPayment(null);
        setTollPaymentError(null);

        setPendingLotteryShop(null);
        setLotteryShopError(null);

        setPendingInsuranceShop(null);
        setInsuranceShopError(null);

        setPendingGoldenKey(null);

        setPendingPortShop(null);
        setPortShopError(null);

        setAirportTravelError(null);

        const airportTurnSequence =
          arrival?.turnSequence ??
          turn.turnSequence;

        const airportVisitId =
          arrival?.arrivalId ??
          [
            "AIRPORT_VISIT",
            airportTurnSequence,
            playerId,
            position,
          ].join(":");

        setPendingAirportTravel({
          playerId,

          airportPosition:
            position,

          visitId:
            airportVisitId,

          turnSequence:
            airportTurnSequence,
        });

        return;
      }

      if (tile.type === "PORT") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingAirportTravel(null);
        setAirportTravelError(null);
        setPortShopError(null);

        const portTurnSequence =
          arrival?.turnSequence ??
          turn.turnSequence;

        const portVisitId =
          arrival?.arrivalId ??
          [
            "PORT",
            portTurnSequence,
            playerId,
            position,
          ].join(":");

        setPendingPortShop({
          playerId,
          visitId:
            portVisitId,
        });

        return;
      }

      if (tile.type === "JAIL") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        
        const jailTurnSequence =
          arrival?.turnSequence ??
          networkTurnSequence ??
          turn.turnSequence;

        const jailEntryId =
          arrival?.arrivalId ??
          [
            "JAIL",
            jailTurnSequence,
            playerId,
            position,
          ].join(":");
        startJailEntryResolution({
          playerId,
          entryId:
            jailEntryId,
          turnSequence:
            jailTurnSequence,
        });

        return;
      }

      if (tile.type === "NEWS") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingCityHallSelection(null);
        setPendingAirportTravel(null);
        setAirportTravelError(null);
        setPendingPortShop(null);
        setPortShopError(null);
        setPendingBankShop(null);
        setBankShopError(null);

        startNewspaperEconomicNews(playerId);
        return;
      }

      if (tile.type === "CITY_HALL") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingEconomicNews(null);
        setPendingAirportTravel(null);
        setAirportTravelError(null);
        setPendingPortShop(null);
        setPortShopError(null);
        setPendingBankShop(null);
        setBankShopError(null);

        const cityHallTurnSequence =
          arrival?.turnSequence ??
          networkTurnSequence ??
          turn.turnSequence;

        const cityHallVisitId =
          arrival?.arrivalId ??
          [
            "CITY_HALL",
            cityHallTurnSequence,
            playerId,
            position,
          ].join(":");

        startCityHallVisit({
          playerId,
          visitId: cityHallVisitId,
          turnSequence: cityHallTurnSequence,
        });

        return;
      }

      if (tile.type === "MINIGAME") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingEconomicNews(null);
        setPendingCityHallSelection(null);
        setPendingAuction(null);
        setAuctionError(null);
        setMiniGameError(null);
        startMiniGameResolution(
          playerId,
          arrival,
        );

        return;
      }

      if (tile.type === "GOLDEN_KEY") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);

        if (onNetworkGameEventRequest) {
          if (
            playerId !==
            resolvedLocalPlayerId
          ) {
            return;
          }

          const drawResult =
            drawGoldenKeyCard(
              goldenKeyDeckRef.current,
            );

          onNetworkGameEventRequest({
            kind: "GOLDEN_KEY_DRAWN",
            payload: {
              playerId,
              cardId:
                drawResult.card.id,
              deck: {
                selectedCardIds: [
                  ...drawResult.deck
                    .selectedCardIds,
                ],
                drawPile: [
                  ...drawResult.deck.drawPile,
                ],
                discardPile: [
                  ...drawResult.deck
                    .discardPile,
                ],
                cycle:
                  drawResult.deck.cycle,
                lastDrawnCardId:
                  drawResult.deck
                    .lastDrawnCardId,
              },
            },
          });

          return;
        }

        const drawResult =
          drawGoldenKeyCard(
            goldenKeyDeckRef.current,
          );

        commitGoldenKeyDeck(
          drawResult.deck,
        );

        setPendingGoldenKey({
          playerId,
          card: drawResult.card,
          stage: "DRAWN",
          resultText: null,
          followUpPosition: null,
        });

        return;
      }

      if (tile.type === "LOTTERY_SHOP") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setLotteryShopError(null);

        const lotteryTurnSequence =
          arrival?.turnSequence ??
          turn.turnSequence;

        const lotteryVisitId =
          arrival?.arrivalId ??
          [
            "LOTTERY",
            lotteryTurnSequence,
            playerId,
            position,
          ].join(":");

        setPendingLotteryShop({
          playerId,
          visitId:
            lotteryVisitId,
          scratchPurchaseCount: 0,
          lottoPurchaseCount: 0,
          latestScratchResult: null,
        });

        return;
      }

      if (tile.type === "INSURANCE") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setInsuranceShopError(null);
        openInsuranceShop(
          playerId,
          position,
          arrival,
        );

        return;
      }

      if (tile.type === "AUCTION") {
        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setPendingTollPayment(null);
        setTollPaymentError(null);
        setPendingLotteryShop(null);
        setLotteryShopError(null);
        setPendingInsuranceShop(null);
        setInsuranceShopError(null);
        setPendingGoldenKey(null);
        setPendingEconomicNews(null);
        setPendingCityHallSelection(null);
        setAuctionError(null);

        startAuctionResolution(
          playerId,
          arrival,
        );

        return;
      }

      const property = tile.propertyId
        ? propertyMap.get(tile.propertyId)
        : undefined;

      if (!isPropertyTile(tile, property)) {
        completeTileResolutionBridge();
        return;
      }

      const ownership = getPropertyOwnership(
        propertyOwnershipsRef.current,
        property.id,
      );

      if (ownership) {
        if (ownership.ownerPlayerId === playerId) {
          if (isMaxDevelopmentStage(ownership.stage)) {
            completeTileResolution();
            return;
          }

          setPendingPropertyPurchase(null);
          setPropertyPurchaseError(null);
          setPendingTollPayment(null);
          setTollPaymentError(null);
          setPropertyDevelopmentError(
            isDevelopmentRestricted(
              developmentRestrictionsRef.current,
              property.id,
              turn.turnNumber,
            )
              ? "DEVELOPMENT_RESTRICTED"
              : null,
          );
          setPendingPropertyDevelopment({
            property,
            playerId,
            propertyId: property.id,
          });
          return;
        }

        setPendingPropertyPurchase(null);
        setPropertyPurchaseError(null);
        setPendingPropertyDevelopment(null);
        setPropertyDevelopmentError(null);
        setTollPaymentError(null);
        setAssetLiquidationError(null);
        const tollBoost = consumeTollBoostForProperty(
          auctionStateRef.current,
          ownership.ownerPlayerId,
          property.id,
        );
        if (tollBoost.state !== auctionStateRef.current) {
          commitAuctionState(tollBoost.state);
        }
        setPendingTollPayment({
          property,
          payerPlayerId: playerId,
          ownerPlayerId: ownership.ownerPlayerId,
          amount: getPropertyTollAmount(
            property,
            ownership.stage,
            getPropertyPriceIndex(
              propertyMarketRef.current,
              property.id,
            ),
            getPolicyTollMultiplier(activeMayorPolicy) *
              getCityHallTollMultiplier(
                getActiveCityHallTerm(
                  cityHallStateRef.current,
                  turn.turnNumber,
                ),
                ownership.stage,
              ) *
              economicNewsTollMultiplier *
              tollBoost.multiplier *
              getDisasterTollMultiplier(
                disasterStateRef.current,
                property.id,
                turn.turnNumber,
              ) *
              getFestivalTollMultiplier(
                activeFestivalRef.current,
                property,
              ),
          ),
          stage: ownership.stage,
        });
        return;
      }

      setPendingPropertyDevelopment(null);
      setPropertyDevelopmentError(null);
      setTollPaymentError(null);
      setPendingTollPayment(null);
      setPropertyPurchaseError(null);
      setPendingPropertyPurchase({
        property,
        playerId,
        arrival,
      });
    },
    [
      activeMayorPolicy,
      commitAuctionState,
      startNewspaperEconomicNews,
      commitGoldenKeyDeck,
      commitMiniGameState,
      startMiniGameResolution,
      commitPlayers,
      onNetworkGameEventRequest,
      resolvedLocalPlayerId,
      economicNewsTollMultiplier,
      propertyMap,
      startCityHallVisit,
      startJailEntryResolution,
      startAuctionResolution,
      openInsuranceShop,
      networkTurnSequence,
      tiles,
      turn.turnNumber,
      turn.turnSequence,
    ],
  );

  const {
    applyPendingGoldenKey,
    applyNetworkGoldenKeyApplied,
    applyNetworkGoldenKeyConfirmed,
    closePendingGoldenKey,
  } = useGoldenKeyResolution({
    pendingGoldenKey,
    setPendingGoldenKey,

    localPlayerId:
      resolvedLocalPlayerId,

    onNetworkGameEventRequest,

    playersRef,
    propertyOwnershipsRef,
    propertyMarketRef,
    stockPortfoliosRef,
    stockMarketRef,

    properties,
    stockCompanies,
    tiles,

    baseSalary,
    activeMayorPolicy,

    turnNumber: turn.turnNumber,
    turnSequence: networkTurnSequence ?? turn.turnSequence,

    commitPlayers,
    commitPropertyMarket,
    commitStockMarket,

    deposit,
    withdraw,
    transfer,

    completeTileResolution,
    resolveArrivalTile,
  });

  const {
    travelFromAirport,
    completeAirportFlight,
    closeAirportTravel,
    applyAirportTravelDecided,
    resetAirportTravelResolution,
  } = useAirportResolution({
    pendingAirportTravel,
    setPendingAirportTravel,

    setAirportTravelError,

    airportFlight,
    setAirportFlight,

    playersRef,
    tiles,

    localPlayerId:
      resolvedLocalPlayerId,


    onNetworkGameEventRequest,

    canPlayerAfford,
    withdraw,
    commitPlayers,

    completeTileResolution,
    resolveArrivalTile,
  });

 
 
  const beginAuctionTargetItem = useCallback(
    (itemId: AuctionItemId) => {
      const playerId = turn.activePlayerId;
      const player = playersRef.current.find((candidate) => candidate.id === playerId);
      if (!turn.canRoll || !player || player.isJailed) return;
      if (!hasAuctionItem(auctionStateRef.current, playerId, itemId)) return;
      if (
        itemId !== "EMERGENCY_FLIGHT" &&
        itemId !== "TOLL_BOOST" &&
        itemId !== "PROPERTY_DEFENSE" &&
        itemId !== "STOCK_LOSS_PROTECTION"
      ) {
        return;
      }

      let options: PendingAuctionTargetSelection["options"] = [];
      if (itemId === "EMERGENCY_FLIGHT") {
        options = tiles
          .map((tile, position) => ({ tile, position }))
          .filter(({ tile }) => Boolean(tile.propertyId))
          .map(({ tile, position }) => ({
            id: String(position),
            label: tile.name,
            description: "특수 이동 · 출발지 통과 급여 없음",
          }));
      } else if (itemId === "TOLL_BOOST" || itemId === "PROPERTY_DEFENSE") {
        options = Object.values(propertyOwnershipsRef.current)
          .filter((ownership) => ownership.ownerPlayerId === playerId)
          .map((ownership) => {
            const property = propertyMap.get(ownership.propertyId);
            return property
              ? {
                  id: property.id,
                  label: property.name,
                  description: getDevelopmentStageLabel(ownership.stage),
                }
              : null;
          })
          .filter(
            (option): option is NonNullable<typeof option> => Boolean(option),
          );
      } else {
        const industryIds = new Set<string>();
        for (const holding of Object.values(
          stockPortfoliosRef.current[playerId] ?? {},
        )) {
          if (holding.quantity <= 0) continue;
          const company = stockCompanyMap.get(holding.companyId);
          if (company) industryIds.add(company.industry);
        }
        options = [...industryIds].map((industryId) => ({
          id: industryId,
          label:
            stockIndustries.find((industry) => industry.id === industryId)
              ?.name ?? industryId,
          description: "다음 주식시장 변동 손실액의 50% 보전",
        }));
      }

      setPendingAuctionTarget({
        playerId,
        itemId: itemId as AuctionTargetItemId,
        options,
      });
    },
    [
      propertyMap,
      stockCompanyMap,
      stockIndustries,
      tiles,
      turn.activePlayerId,
      turn.canRoll,
    ],
  );

  const confirmAuctionItemTarget = useCallback(
    (targetId: string) => {
      const selection = pendingAuctionTarget;
      if (!selection) return;
      if (!selection.options.some((option) => option.id === targetId)) return;

      if (selection.itemId === "EMERGENCY_FLIGHT") {
        const position = Number(targetId);
        if (!Number.isInteger(position) || !tiles[position]?.propertyId) return;
        const consumed = consumeAuctionItem(
          auctionStateRef.current,
          selection.playerId,
          "EMERGENCY_FLIGHT",
        );
        if (!consumed) return;

        commitAuctionState(consumed.state);
        setPendingAuctionTarget(null);
        setLastMove(null);
        commitPlayers(
          playersRef.current.map((player) =>
            player.id === selection.playerId
              ? { ...player, position }
              : player,
          ),
        );
        turn.startForcedTileResolution();
        resolveArrivalTile(position, selection.playerId);
        return;
      }

      const armedState = armTargetedAuctionItem(
        auctionStateRef.current,
        selection.playerId,
        selection.itemId,
        targetId,
      );
      if (!armedState) return;

      commitAuctionState(armedState);
      setPendingAuctionTarget(null);
    },
    [
      commitAuctionState,
      commitPlayers,
      pendingAuctionTarget,
      resolveArrivalTile,
      tiles,
      turn,
    ],
  );

  const cancelAuctionItemTarget = useCallback(() => {
    setPendingAuctionTarget(null);
  }, []);

  const {
    buyPortContract,
    closePortShop,
    applyPortActionDecided,
    resetPortShopResolution,
  } = usePortShopResolution({
    pendingPortShop,
    setPendingPortShop,
    setPortShopError,
    portStateRef,
    playersRef,
    localPlayerId:
      resolvedLocalPlayerId,

    turnNumber:
      turn.turnNumber,
    turnSequence: turn.turnSequence,

    canPlayerAfford,
    withdraw,
    commitPortState,
    completeTileResolution,
    onNetworkGameEventRequest,
  });

  const {
    depositPendingBank,
    withdrawPendingBank,
    startPendingSavings,
    closeBankShop,
    applyBankActionDecided,
    resetBankShopResolution,
  } = useBankShopResolution({
    pendingBankShop,
    setPendingBankShop,
    setBankShopError,
    bankStateRef,
    localPlayerId:
      resolvedLocalPlayerId,
    turnNumber:
      turn.turnNumber,
    turnSequence: turn.turnSequence,
    onNetworkGameEventRequest,
    canPlayerAfford,
    getPlayerLiquidBalance,
    prepareMandatoryPayment,
    withdraw,
    deposit,
    commitBankState,
    enqueueBankNotice,
    completeTileResolution,
  });

  const {
    applyLotteryActionDecided,
    buyScratchTicket,
    buyLottoTickets,
    closeLotteryShop,
  } = useLotteryShopResolution({
    pendingLotteryShop,
    setPendingLotteryShop,
    setLotteryShopError,
    lottoStateRef,
    commitLottoState,
    activeMayorPolicy,
    turnNumber:turn.turnNumber,
    turnSequence: turn.turnSequence,
    localPlayerId:
      resolvedLocalPlayerId,
    canPlayerAfford,
    withdraw,
    deposit,
    completeTileResolution,
    onNetworkGameEventRequest,
  });

  const performMovement = async (
    steps: number,
    forced: boolean,
  ) => {
    const safeSteps = Math.trunc(steps);
    if (safeSteps <= 0) return;

    const movingPlayerId = turn.activePlayerId;
    const movingPlayer =
      playersRef.current.find((player) => player.id === movingPlayerId) ??
      playersRef.current[0];

    if (!movingPlayer) return;

    if (forced) {
      turn.startForcedMovement();
    } else {
      turn.startMovement();
    }

    setLastMove(safeSteps);

    let currentPosition =
      movingPlayer.position;

    let completedLaps =
      Math.max(
        0,
        Math.trunc(
          movingPlayer.completedLaps ?? 0,
        ),
      );

    for (
      let step = 0;
      step < safeSteps;
      step += 1
    ) {
      await delay(
        MOVE_STEP_DELAY_MS,
      );

      const nextPosition =
        getNextBoardPosition(
          currentPosition,
          tileCount,
        );

      const passedStart =
        didPassStart(
          currentPosition,
          nextPosition,
        );

      if (passedStart) {
        completedLaps += 1;
      }

      const movedPlayers =
        playersRef.current.map(
          (player) =>
            player.id === movingPlayerId
              ? {
                  ...player,
                  position: nextPosition,
                  completedLaps,
                }
              : player,
        );

      commitPlayers(
        movedPlayers,
      );

      if (passedStart) {
        const salaryAmount =
          getPolicySalary(
            baseSalary,
            activeMayorPolicy,
            completedLaps,
          );

        const salaryResult =
          deposit(
            movingPlayerId,
            salaryAmount,
            "SALARY",
            `${completedLaps}바퀴 완주 · 출발지 통과`,
          );

        if (salaryResult.ok) {
          setSalaryNotice({
            id: Date.now(),
            playerName:
              movingPlayer.name,
            amount: salaryAmount,
          });
        }
      }

      currentPosition =
        nextPosition;
    }

    turn.markArrived();
    await delay(ARRIVAL_FOCUS_DELAY_MS);

    turn.startTileResolution();

    if (forced) {
      resolveArrivalTile(currentPosition, movingPlayerId);
      return;
    }

    const arrivalTurnSequence =
      networkTurnSequence ??
      turn.turnSequence;

    const arrival: UlsanMarbleArrivalContext = {
      arrivalId:
        networkDiceRoll
          ? `DICE:${arrivalTurnSequence}:${networkDiceRoll.rollId}`
          : `DICE:${arrivalTurnSequence}:LOCAL`,

      cause: "DICE",
      playerId: movingPlayerId,
      position: currentPosition,
      turnSequence:
        arrivalTurnSequence,
    };

    resolveArrivalTile(
      currentPosition,
      movingPlayerId,
      arrival,
    );
  };

    const moveActivePlayer = async (
      steps: number,
    ) => {
      await performMovement(
        steps,
        false,
      );
    };

    const applyPendingPropertyPurchase =
      useCallback(() => {
      if (!pendingPropertyPurchase) {
        setPropertyPurchaseError("NO_PENDING_PURCHASE");
        return;
      }

      const { property, playerId } = pendingPropertyPurchase;
      const existingOwnership = getPropertyOwnership(
        propertyOwnershipsRef.current,
        property.id,
      );

      if (existingOwnership) {
        setPropertyPurchaseError("ALREADY_OWNED");
        return;
      }

    const landmarkRequirement =
      getLandmarkPurchaseRequirement(
        properties,
        propertyOwnershipsRef.current,
        playerId,
        property,
      );

    if (!landmarkRequirement.eligible) {
      setPropertyPurchaseError(
        "LANDMARK_REQUIREMENT_NOT_MET",
      );
      return;
    }

    const purchasePrice = getPropertyPurchasePrice(
      property,
      getPropertyPriceIndex(propertyMarketRef.current, property.id),
    );
    const purchaseResult = withdraw(
      playerId,
      purchasePrice,
      "PROPERTY_PURCHASE",
      property.name,
    );

    if (!purchaseResult.ok) {
      setPropertyPurchaseError(
        purchaseResult.error === "INSUFFICIENT_FUNDS"
          ? "INSUFFICIENT_FUNDS"
          : "NO_PENDING_PURCHASE",
      );
      return;
    }

    const nextOwnerships: PropertyOwnershipMap = {
      ...propertyOwnershipsRef.current,
      [property.id]: createPropertyOwnership(
        property,
        playerId,
        turn.turnNumber,
        purchasePrice,
      ),
    };

    commitPropertyOwnerships(nextOwnerships);
    completeTileResolution();
  }, [
    commitPropertyOwnerships,
    completeTileResolution,
    pendingPropertyPurchase,
    turn.turnNumber,
    withdraw,
  ]);

  const applyPendingPropertyDecline =
    useCallback(() => {
      completeTileResolution();
    }, [completeTileResolution]);

  const buyPendingProperty =
    useCallback(() => {
      if (
        !onNetworkPropertyDecisionRequest
      ) {
        applyPendingPropertyPurchase();
        return;
      }

      const arrival =
        pendingPropertyPurchase?.arrival;

      if (
        !pendingPropertyPurchase ||
        !arrival
      ) {
        setPropertyPurchaseError(
          "NO_PENDING_PURCHASE",
        );
        return;
      }

      if (
        pendingPropertyPurchase.playerId !==
        resolvedLocalPlayerId
      ) {
        return;
      }

      onNetworkPropertyDecisionRequest({
        arrivalId:
          arrival.arrivalId,

        propertyId:
          pendingPropertyPurchase
            .property.id,

        action: "BUY",
      });
    }, [
      applyPendingPropertyPurchase,
      onNetworkPropertyDecisionRequest,
      pendingPropertyPurchase,
      resolvedLocalPlayerId,
    ]);

  const declinePendingProperty =
    useCallback(() => {
      if (
        !onNetworkPropertyDecisionRequest
      ) {
        applyPendingPropertyDecline();
        return;
      }

      const arrival =
        pendingPropertyPurchase?.arrival;

      if (
        !pendingPropertyPurchase ||
        !arrival
      ) {
        return;
      }

      if (
        pendingPropertyPurchase.playerId !==
        resolvedLocalPlayerId
      ) {
        return;
      }

      onNetworkPropertyDecisionRequest({
        arrivalId:
          arrival.arrivalId,

        propertyId:
          pendingPropertyPurchase
            .property.id,

        action: "DECLINE",
      });
    }, [
      applyPendingPropertyDecline,
      onNetworkPropertyDecisionRequest,
      pendingPropertyPurchase,
      resolvedLocalPlayerId,
    ]);

  const resetNetworkPropertyDecision =
    useNetworkPropertyDecision({
      decision:
        networkPropertyDecision,

      currentArrivalId:
        pendingPropertyPurchase
          ?.arrival
          ?.arrivalId ?? null,

      pendingPurchase:
        pendingPropertyPurchase,

      applyPurchase:
        applyPendingPropertyPurchase,

      applyDecline:
        applyPendingPropertyDecline,
    });



  const clearDevelopmentRestriction = useCallback(
    (propertyId: string) => {
      commitDevelopmentRestrictions(
        removeDevelopmentRestriction(
          developmentRestrictionsRef.current,
          propertyId,
        ),
      );
    },
    [commitDevelopmentRestrictions],
  );

  const {
    buildPendingProperty,
    declinePendingDevelopment,

    applyPropertyDevelopmentDecided,
    resetPropertyDevelopmentResolution,
  } = usePropertyDevelopmentResolution({
    pendingPropertyDevelopment,
    setPendingPropertyDevelopment,

    setPropertyDevelopmentError,

    pendingDevelopmentCost,

    playersRef,
    propertyOwnershipsRef,
    developmentRestrictionsRef,
    auctionStateRef,
    cityHallStateRef,

    localPlayerId:
      resolvedLocalPlayerId,

    turnNumber:
      turn.turnNumber,

    turnSequence: turn.turnSequence,

    onNetworkGameEventRequest,

    canPlayerAfford,
    withdraw,

    commitAuctionState,
    commitCityHallState,
    commitPropertyOwnerships,

    completeTileResolution,
  });

  const applyResolvedTollPayment =
    useCallback(
      (
        payload:
          UlsanMarbleTollPaidPayload,
      ): NetworkGameEventApplyResult => {
        /*
        * 네트워크 이벤트가 상대 클라이언트의
        * 이동/도착 처리보다 먼저 올 수 있다.
        *
        * pending이 아직 없다는 것은
        * 이벤트 자체가 잘못됐다는 뜻이 아니다.
        */
        if (!pendingTollPayment) {
          console.log(
            "[TOLL PAID WAIT]",
            "payer =",
            payload.payerPlayerId,
            "property =",
            payload.propertyId,
          );

          return "WAIT";
        }

        /*
        * 통행료 대상 자체가 다르면
        * 단순 타이밍 문제가 아니라 실제 상태 불일치다.
        */
        if (
          pendingTollPayment
            .payerPlayerId !==
            payload.payerPlayerId ||
          pendingTollPayment
            .ownerPlayerId !==
            payload.ownerPlayerId ||
          pendingTollPayment
            .property.id !==
            payload.propertyId
        ) {
          console.warn(
            "[TOLL PAID INVALID TARGET]",
            {
              pending: {
                payerPlayerId:
                  pendingTollPayment
                    .payerPlayerId,
                ownerPlayerId:
                  pendingTollPayment
                    .ownerPlayerId,
                propertyId:
                  pendingTollPayment
                    .property.id,
              },
              payload,
            },
          );

          return "INVALID";
        }

        /*
        * 금액은 서버에 기록된 GAME EVENT를
        * 최종 권위값으로 사용한다.
        *
        * 다른 클라이언트가 정책/이벤트 상태를
        * 조금 늦게 반영해서 로컬 계산액이 달라도
        * 이 이벤트 자체를 버리면 안 된다.
        */
        if (
          pendingTollPayment.amount !==
          payload.amount
        ) {
          console.warn(
            "[TOLL PAID AMOUNT SYNC]",
            "localAmount =",
            pendingTollPayment.amount,
            "serverAmount =",
            payload.amount,
          );
        }

        const payer =
          playersRef.current.find(
            (player) =>
              player.id ===
              payload.payerPlayerId,
          );

        const owner =
          playersRef.current.find(
            (player) =>
              player.id ===
              payload.ownerPlayerId,
          );

        if (!payer) {
          setTollPaymentError(
            "NO_PENDING_TOLL",
          );

          return "INVALID";
        }

        if (!owner) {
          setTollPaymentError(
            "OWNER_NOT_FOUND",
          );

          return "INVALID";
        }

        const payerCash =
          getBalance(
            playersRef.current,
            payload.payerPlayerId,
          ) ?? 0;

        const payerDeposit =
          getGeneralDepositBalance(
            bankStateRef.current,
            payload.payerPlayerId,
          );

        if (
          payerCash +
            payerDeposit <
          payload.amount
        ) {
          setTollPaymentError(
            "INSUFFICIENT_FUNDS",
          );

          console.warn(
            "[TOLL PAID INVALID FUNDS]",
            "cash =",
            payerCash,
            "deposit =",
            payerDeposit,
            "amount =",
            payload.amount,
          );

          return "INVALID";
        }

        if (
          payload.bankWithdrawalAmount >
          0
        ) {
          const moved =
            moveGeneralDepositToCash(
              payload.payerPlayerId,
              payload.bankWithdrawalAmount,
              `${pendingTollPayment.property.name} 통행료 자동 인출`,
            );

          if (!moved) {
            setTollPaymentError(
              "INSUFFICIENT_FUNDS",
            );

            return "INVALID";
          }
        }

        const payerPaymentResult =
          withdraw(
            payload.payerPlayerId,
            payload.amount,
            "TOLL",
            pendingTollPayment
              .property.name,
          );

        if (
          !payerPaymentResult.ok
        ) {
          setTollPaymentError(
            payerPaymentResult.error ===
              "INSUFFICIENT_FUNDS"
              ? "INSUFFICIENT_FUNDS"
              : "NO_PENDING_TOLL",
          );

          return "INVALID";
        }

        const ownerDepositResult =
          deposit(
            payload.ownerPlayerId,
            payload.ownerIncome,
            "TOLL",
            payload.ownerWasJailed
              ? `${pendingTollPayment.property.name} · 구치소 수감으로 70% 수령`
              : pendingTollPayment
                  .property.name,
          );

        if (
          !ownerDepositResult.ok
        ) {
          setTollPaymentError(
            "OWNER_NOT_FOUND",
          );

          return "INVALID";
        }

        setTollPaymentError(null);

        completeTileResolution();

        return "APPLIED";
      },
      [
        completeTileResolution,
        deposit,
        moveGeneralDepositToCash,
        pendingTollPayment,
        withdraw,
      ],
    );

  const payPendingToll =
    useCallback(() => {
      if (!pendingTollPayment) {
        setTollPaymentError(
          "NO_PENDING_TOLL",
        );
        return;
      }

      /*
      * 온라인에서는 실제 지급자만
      * 서버에 이벤트를 전송할 수 있다.
      */
      if (
        onNetworkGameEventRequest &&
        pendingTollPayment
          .payerPlayerId !==
          resolvedLocalPlayerId
      ) {
        return;
      }

      const payer =
        playersRef.current.find(
          (player) =>
            player.id ===
            pendingTollPayment
              .payerPlayerId,
        );

      const owner =
        playersRef.current.find(
          (player) =>
            player.id ===
            pendingTollPayment
              .ownerPlayerId,
        );

      if (!payer) {
        setTollPaymentError(
          "NO_PENDING_TOLL",
        );
        return;
      }

      if (!owner) {
        setTollPaymentError(
          "OWNER_NOT_FOUND",
        );
        return;
      }

      const payerCash =
        getBalance(
          playersRef.current,
          pendingTollPayment
            .payerPlayerId,
        ) ?? 0;

      const payerDeposit =
        getGeneralDepositBalance(
          bankStateRef.current,
          pendingTollPayment
            .payerPlayerId,
        );

      if (
        payerCash +
          payerDeposit <
        pendingTollPayment.amount
      ) {
        setTollPaymentError(
          "INSUFFICIENT_FUNDS",
        );
        return;
      }

      const bankWithdrawalAmount =
        Math.max(
          0,
          pendingTollPayment.amount -
            payerCash,
        );

      const ownerIncome =
        getJailTollOwnerIncome(
          pendingTollPayment.amount,
          owner,
        );

      const payload:
        UlsanMarbleTollPaidPayload = {
          payerPlayerId:
            pendingTollPayment
              .payerPlayerId,

          ownerPlayerId:
            pendingTollPayment
              .ownerPlayerId,

          propertyId:
            pendingTollPayment
              .property.id,

          amount:
            pendingTollPayment.amount,

          ownerIncome,

          bankWithdrawalAmount,

          ownerWasJailed:
            Boolean(owner.isJailed),
        };

      if (
        onNetworkGameEventRequest
      ) {
        setTollPaymentError(null);

        onNetworkGameEventRequest({
          kind: "TOLL_PAID",
          payload,
        });

        return;
      }

      applyResolvedTollPayment(
        payload,
      );
    }, [
      applyResolvedTollPayment,
      onNetworkGameEventRequest,
      pendingTollPayment,
      resolvedLocalPlayerId,
    ]);

    
  const usePendingTollExemption =
    useCallback(() => {
      if (!pendingTollPayment) {
        setTollPaymentError(
          "NO_PENDING_TOLL",
        );
        return;
      }

      const consumed =
        consumeAuctionItem(
          auctionStateRef.current,
          pendingTollPayment
            .payerPlayerId,
          "TOLL_EXEMPTION",
        );

      if (!consumed) {
        return;
      }

      commitAuctionState(
        consumed.state,
      );

      setTollPaymentError(null);
      completeTileResolution();
    }, [
      commitAuctionState,
      completeTileResolution,
      pendingTollPayment,
    ]);

  const sellPropertyForPendingToll = useCallback(
    (propertyId: string) => {
      if (!pendingTollPayment) {
        setAssetLiquidationError("NO_PENDING_TOLL");
        return;
      }

      const property = propertyMap.get(propertyId);
      if (!property) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }

      const saleResult = sellPropertyOwnership(
        propertyOwnershipsRef.current,
        propertyId,
        pendingTollPayment.payerPlayerId,
        property,
        propertyMarketRef.current,
        getPolicyPropertySaleRate(activeMayorPolicy),
      );

      if (!saleResult.ok) {
        setAssetLiquidationError(
          saleResult.error === "NOT_OWNER"
            ? "NOT_OWNER"
            : "PROPERTY_NOT_OWNED",
        );
        return;
      }

      const depositResult = deposit(
        pendingTollPayment.payerPlayerId,
        saleResult.salePrice,
        "SALE",
        `${property.name} 매각`,
      );

      if (!depositResult.ok) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }

      commitPropertyOwnerships(saleResult.ownerships);
      commitInsuranceContracts(
        removeInsuranceContract(insuranceContractsRef.current, propertyId),
      );
      setAssetLiquidationError(null);
      setTollPaymentError(null);
    },
    [
      activeMayorPolicy,
      commitPropertyOwnerships,
      deposit,
      pendingTollPayment,
      propertyMap,
    ],
  );

  const sellStockForPendingToll = useCallback(
    (companyId: string, quantity: number) => {
      if (!pendingTollPayment) {
        setAssetLiquidationError("NO_PENDING_TOLL");
        return;
      }

      const company = stockCompanyMap.get(companyId);
      if (!company) {
        setAssetLiquidationError("COMPANY_NOT_FOUND");
        return;
      }

      const safeQuantity = Math.trunc(quantity);
      if (safeQuantity <= 0) {
        setAssetLiquidationError("INVALID_STOCK_QUANTITY");
        return;
      }

      const holding = getStockHolding(
        stockPortfoliosRef.current,
        pendingTollPayment.payerPlayerId,
        companyId,
      );

      if (!holding || holding.quantity < safeQuantity) {
        setAssetLiquidationError("STOCK_NOT_OWNED");
        return;
      }

      const pricePerShare = getStockPrice(
        stockMarketRef.current,
        companyId,
      );
      if (pricePerShare <= 0) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }

      const depositResult = deposit(
        pendingTollPayment.payerPlayerId,
        pricePerShare * safeQuantity,
        "STOCK_SALE",
        `${company.name} ${safeQuantity}주 자산 정리`,
      );

      if (!depositResult.ok) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }

      commitStockPortfolios(
        sellStockHolding(
          stockPortfoliosRef.current,
          pendingTollPayment.payerPlayerId,
          companyId,
          safeQuantity,
        ),
      );
      setAssetLiquidationError(null);
      setTollPaymentError(null);
    },
    [
      commitStockPortfolios,
      deposit,
      pendingTollPayment,
      stockCompanyMap,
    ],
  );

  const declarePendingTollBankruptcy = useCallback(() => {
    if (!pendingTollPayment) {
      setAssetLiquidationError("NO_PENDING_TOLL");
      return;
    }

    const remainingPropertyAssets = getSellablePropertyAssets(
      propertyOwnershipsRef.current,
      properties,
      pendingTollPayment.payerPlayerId,
      propertyMarketRef.current,
      getPolicyPropertySaleRate(activeMayorPolicy),
    );
    const remainingStockAssets = getSellableStockAssets(
      stockPortfoliosRef.current,
      stockCompanies,
      stockMarketRef.current,
      pendingTollPayment.payerPlayerId,
    );

    if (
      remainingPropertyAssets.length > 0 ||
      remainingStockAssets.length > 0
    ) {
      setAssetLiquidationError("ASSETS_REMAIN");
      return;
    }

    const payer = playersRef.current.find(
      (player) => player.id === pendingTollPayment.payerPlayerId,
    );
    const owner = playersRef.current.find(
      (player) => player.id === pendingTollPayment.ownerPlayerId,
    );

    if (!payer) {
      setAssetLiquidationError("SALE_FAILED");
      return;
    }

    if (!owner) {
      setAssetLiquidationError("OWNER_NOT_FOUND");
      return;
    }

    if (
      !settleBankAssetsForBankruptcy(
        payer.id,
        `${pendingTollPayment.property.name} 미납 통행료 예금 정산`,
      )
    ) {
      setAssetLiquidationError("SALE_FAILED");
      return;
    }

    const settledPayer = playersRef.current.find(
      (player) => player.id === payer.id,
    );
    if (!settledPayer) {
      setAssetLiquidationError("SALE_FAILED");
      return;
    }

    if (settledPayer.money > 0) {
      const remainingCash = settledPayer.money;
      const withdrawalResult = withdraw(
        settledPayer.id,
        remainingCash,
        "BANKRUPTCY",
        `${pendingTollPayment.property.name} 미납 통행료 정산`,
      );

      if (!withdrawalResult.ok) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }

      const ownerIncome = getJailTollOwnerIncome(remainingCash, owner);
      const depositResult = deposit(
        owner.id,
        ownerIncome,
        "BANKRUPTCY",
        owner.isJailed
          ? `${pendingTollPayment.property.name} 미납 정산 · 구치소 70% 수령`
          : `${pendingTollPayment.property.name} 미납 통행료 정산`,
      );

      if (!depositResult.ok) {
        setAssetLiquidationError("SALE_FAILED");
        return;
      }
    }

    commitStockPortfolios({
      ...stockPortfoliosRef.current,
      [payer.id]: {},
    });
    commitLottoState({
      ...lottoStateRef.current,
      tickets: lottoStateRef.current.tickets.filter(
        (ticket) => ticket.playerId !== payer.id,
      ),
    });
    commitInsuranceContracts(
      removePlayerInsuranceContracts(insuranceContractsRef.current, payer.id),
    );
    commitPlayers(
      playersRef.current.map((player) =>
        player.id === payer.id
          ? {
              ...releasePlayerFromJail(player),
              money: 0,
              isBankrupt: true,
              jailEscapeCards: 0,
            }
          : player,
      ),
    );

    completeTileResolution([payer.id]);
  }, [
    activeMayorPolicy,
    commitLottoState,
    commitPlayers,
    commitStockPortfolios,
    completeTileResolution,
    pendingTollPayment,
    properties,
    stockCompanies,
    deposit,
    settleBankAssetsForBankruptcy,
    withdraw,
  ]);

  const openStockMarket = useCallback(() => {
    if (turn.phase !== "STOCK_TRADING") {
      setStockTradeError("NOT_TRADING_PHASE");
      return;
    }

    setStockTradeError(null);
    setIsStockMarketOpen(true);
  }, [turn.phase]);

  const closeStockMarket = useCallback(() => {
    setIsStockMarketOpen(false);
    setStockTradeError(null);
  }, []);

const applyBuyStock = useCallback(
  (
    playerId: string,
    companyId: string,
    quantity: number,
    pricePerShare: number,
  ) => {
    if (
      turn.phase !==
        "STOCK_TRADING" ||
      turn.activePlayerId !== playerId
    ) {
      setStockTradeError(
        "NOT_TRADING_PHASE",
      );
      return;
    }

    const company =
      stockCompanyMap.get(companyId);

    if (!company) {
      setStockTradeError(
        "COMPANY_NOT_FOUND",
      );
      return;
    }

    const safeQuantity =
      Math.trunc(quantity);

    if (
      safeQuantity <= 0 ||
      !Number.isInteger(
        pricePerShare,
      ) ||
      pricePerShare <= 0
    ) {
      setStockTradeError(
        "INVALID_QUANTITY",
      );
      return;
    }

    if (
      getAvailableShareCount(
        company,
        stockPortfoliosRef.current,
      ) < safeQuantity
    ) {
      setStockTradeError(
        "INSUFFICIENT_SHARES",
      );
      return;
    }

    const purchaseFee =
      getStockTradeFee(
        pricePerShare,
        safeQuantity,
      );

    const purchaseCost =
      getStockBuyTotalCost(
        pricePerShare,
        safeQuantity,
      );

    const purchaseResult = withdraw(
      playerId,
      purchaseCost,
      "STOCK_PURCHASE",
      `${company.name} ${safeQuantity}주 · 거래수수료 ${purchaseFee}만원`,
    );

    if (!purchaseResult.ok) {
      setStockTradeError(
        purchaseResult.error ===
          "INSUFFICIENT_FUNDS"
          ? "INSUFFICIENT_FUNDS"
          : "INVALID_QUANTITY",
      );
      return;
    }

    commitStockPortfolios(
      buyStockHolding(
        stockPortfoliosRef.current,
        playerId,
        company,
        safeQuantity,
        pricePerShare,
      ),
    );

    setStockTradeError(null);
  },
  [
    commitStockPortfolios,
    stockCompanyMap,
    turn.activePlayerId,
    turn.phase,
    withdraw,
  ],
);

const applySellStock = useCallback(
  (
    playerId: string,
    companyId: string,
    quantity: number,
    pricePerShare: number,
  ) => {
    if (
      turn.phase !==
        "STOCK_TRADING" ||
      turn.activePlayerId !== playerId
    ) {
      setStockTradeError(
        "NOT_TRADING_PHASE",
      );
      return;
    }

    const company =
      stockCompanyMap.get(companyId);

    if (!company) {
      setStockTradeError(
        "COMPANY_NOT_FOUND",
      );
      return;
    }

    const safeQuantity =
      Math.trunc(quantity);

    if (
      safeQuantity <= 0 ||
      !Number.isInteger(
        pricePerShare,
      ) ||
      pricePerShare <= 0
    ) {
      setStockTradeError(
        "INVALID_QUANTITY",
      );
      return;
    }

    const holding = getStockHolding(
      stockPortfoliosRef.current,
      playerId,
      companyId,
    );

    if (
      !holding ||
      holding.quantity < safeQuantity
    ) {
      setStockTradeError(
        "INSUFFICIENT_HOLDING",
      );
      return;
    }

    const saleFee =
      getStockTradeFee(
        pricePerShare,
        safeQuantity,
      );

    const saleProceeds =
      getStockSellNetProceeds(
        pricePerShare,
        safeQuantity,
      );

    const saleResult = deposit(
      playerId,
      saleProceeds,
      "STOCK_SALE",
      `${company.name} ${safeQuantity}주 · 거래수수료 ${saleFee}만원`,
);

    if (!saleResult.ok) {
      setStockTradeError(
        "INVALID_QUANTITY",
      );
      return;
    }

    commitStockPortfolios(
      sellStockHolding(
        stockPortfoliosRef.current,
        playerId,
        companyId,
        safeQuantity,
      ),
    );

    setStockTradeError(null);
  },
  [
    commitStockPortfolios,
    deposit,
    stockCompanyMap,
    turn.activePlayerId,
    turn.phase,
  ],
);

  const buyStock = useCallback(
    (
      companyId: string,
      quantity: number,
    ) => {
      if (
        turn.phase !==
        "STOCK_TRADING"
      ) {
        setStockTradeError(
          "NOT_TRADING_PHASE",
        );
        return;
      }

      const company =
        stockCompanyMap.get(companyId);

      if (!company) {
        setStockTradeError(
          "COMPANY_NOT_FOUND",
        );
        return;
      }

      const safeQuantity =
        Math.trunc(quantity);

      if (safeQuantity <= 0) {
        setStockTradeError(
          "INVALID_QUANTITY",
        );
        return;
      }

      const quote =
        stockMarketRef.current[
          companyId
        ];

      if (
        !quote ||
        quote.status !== "NORMAL"
      ) {
        setStockTradeError(
          "TRADING_UNAVAILABLE",
        );
        return;
      }

      if (
        getAvailableShareCount(
          company,
          stockPortfoliosRef.current,
        ) < safeQuantity
      ) {
        setStockTradeError(
          "INSUFFICIENT_SHARES",
        );
        return;
      }

      const pricePerShare =
        getStockPrice(
          stockMarketRef.current,
          companyId,
        );

      const purchaseCost = getStockBuyTotalCost( pricePerShare, safeQuantity,);

      const playerBalance =
        getBalance(
          playersRef.current,
          turn.activePlayerId,
        );

      if (
        playerBalance === null ||
        playerBalance < purchaseCost
      ) {
        setStockTradeError(
          "INSUFFICIENT_FUNDS",
        );
        return;
      }

      if (
        onNetworkStockTradeRequest
      ) {
        setStockTradeError(null);

        onNetworkStockTradeRequest({
          action: "BUY",
          companyId,
          quantity: safeQuantity,
          pricePerShare,
        });

        return;
      }

      applyBuyStock(
        turn.activePlayerId,
        companyId,
        safeQuantity,
        pricePerShare,
      );
    },
    [
      applyBuyStock,
      onNetworkStockTradeRequest,
      stockCompanyMap,
      turn.activePlayerId,
      turn.phase,
    ],
  );

  const sellStock = useCallback(
    (
      companyId: string,
      quantity: number,
    ) => {
      if (
        turn.phase !==
        "STOCK_TRADING"
      ) {
        setStockTradeError(
          "NOT_TRADING_PHASE",
        );
        return;
      }

      const company =
        stockCompanyMap.get(companyId);

      if (!company) {
        setStockTradeError(
          "COMPANY_NOT_FOUND",
        );
        return;
      }

      const safeQuantity =
        Math.trunc(quantity);

      if (safeQuantity <= 0) {
        setStockTradeError(
          "INVALID_QUANTITY",
        );
        return;
      }

      const holding = getStockHolding(
        stockPortfoliosRef.current,
        turn.activePlayerId,
        companyId,
      );

      if (
        !holding ||
        holding.quantity < safeQuantity
      ) {
        setStockTradeError(
          "INSUFFICIENT_HOLDING",
        );
        return;
      }

      const pricePerShare =
        getStockPrice(
          stockMarketRef.current,
          companyId,
        );

      if (
        onNetworkStockTradeRequest
      ) {
        setStockTradeError(null);

        onNetworkStockTradeRequest({
          action: "SELL",
          companyId,
          quantity: safeQuantity,
          pricePerShare,
        });

        return;
      }

      applySellStock(
        turn.activePlayerId,
        companyId,
        safeQuantity,
        pricePerShare,
      );
    },
    [
      applySellStock,
      onNetworkStockTradeRequest,
      stockCompanyMap,
      turn.activePlayerId,
      turn.phase,
    ],
  );

  const resetNetworkStockTrades =
    useNetworkStockTrades({
      trades:
        networkStockTrades,

      activePlayerId:
        turn.activePlayerId,

      turnPhase:
        turn.phase,

      applyBuyStock,
      applySellStock,
    });

  const completeStockTrading =
    useCallback((): boolean => {
      if (
        turn.phase !==
        "STOCK_TRADING"
      ) {
        console.log(
          "[TURN END WAIT] 아직 주식 거래 단계가 아님",
          {
            phase: turn.phase,
            networkTurnSequence,
            localTurnSequence:
              turn.turnSequence,
          },
        );

        return false;
      }

      if (isFestivalSettlementBusy) {
        console.log(
          "[TURN END WAIT] 축제 정산 처리 중",
          {
            phase: turn.phase,
            networkTurnSequence,
          },
        );

        return false;
      }

      console.log(
        "[TURN END APPLY]",
        {
          activePlayerId:
            turn.activePlayerId,

          networkActivePlayerId,

          localPlayerId:
            resolvedLocalPlayerId,

          turnNumber:
            turn.turnNumber,

          localTurnSequence:
            turn.turnSequence,

          networkTurnSequence,
        },
      );

      finishTurnAfterStockTrading();

      return true;
    }, [
      finishTurnAfterStockTrading,
      isFestivalSettlementBusy,
      networkActivePlayerId,
      networkTurnSequence,
      resolvedLocalPlayerId,
      turn.activePlayerId,
      turn.phase,
      turn.turnNumber,
      turn.turnSequence,
    ]);

  const devEndTurn = useCallback(() => {
    /*
    * 네트워크 DEV 턴 종료는
    * 서버의 DEV_END_TURN 규칙을 따른다.
    */
    if (onNetworkDevEndTurnRequest) {
      if (
        turn.phase !==
        "WAITING_FOR_ROLL"
      ) {
        return;
      }

      onNetworkDevEndTurnRequest();
      return;
    }

    /*
    * 로컬 테스트에서는 기존 방식 유지.
    */
    if (
      turn.phase !==
      "STOCK_TRADING"
    ) {
      return;
    }

    completeStockTrading();
  }, [
    completeStockTrading,
    onNetworkDevEndTurnRequest,
    turn.phase,
  ]);

  const resetNetworkTurnSync =
    useNetworkTurnSync({
      turnSequence:
        networkTurnSequence,

      turnPhase:
        turn.phase,

      completeStockTrading,

      shouldCompleteImmediately:
        () =>
          pendingJailTurnAdvanceRef.current !==
          null,

      completeImmediately:
        completeNetworkJailTurnAdvance,
    });

    const resolveFinalDiceResult = useCallback(
      async (
        firstDice: DiceValue,
        secondDice: DiceValue,
      ) => {
      const rollingPlayerId = turn.activePlayerId;
      const evaluation = evaluateDoubleRoll(
        doubleStreakRef.current,
        rollingPlayerId,
        [firstDice, secondDice],
      );

      doubleStreakRef.current = evaluation.nextStreak;
      pendingExtraRollRef.current = evaluation.grantsExtraRoll;

      if (evaluation.sendsToJail) {
        const jailPosition =
          tiles.findIndex(
            (tile) =>
              tile.type === "JAIL",
          );

        const safeJailPosition =
          jailPosition >= 0
            ? jailPosition
            : 0;

        const jailTurnSequence =
          networkTurnSequence ??
          turn.turnSequence;

        const jailEntryId = [
          "JAIL_TRIPLE_DOUBLE",
          jailTurnSequence,
          rollingPlayerId,
        ].join(":");

        setLastMove(null);

        showDoubleDiceNotice({
          tone: "JAIL",
          title: "3연속 더블!",
          message:
            "이동하지 않고 즉시 구치소로 이동합니다.",
        });

        const started =
          startJailEntryResolution({
            playerId:
              rollingPlayerId,

            entryId:
              jailEntryId,

            turnSequence:
              jailTurnSequence,

            forcedPosition:
              safeJailPosition,
          });

        if (!started) {
          turn.cancelCurrentAction();
          return;
        }

        turn.startForcedJailResolution();

        return;
      }

      await delay(DICE_TO_MOVEMENT_DELAY_MS);
      await moveActivePlayer(firstDice + secondDice,);
    },
    [
      moveActivePlayer,
      showDoubleDiceNotice,
      startJailEntryResolution,
      tiles,
      turn,
    ],
  );

  const runDiceRoll = async (
    forcedDice?: [DiceValue,DiceValue,],
    allowRerollPrompt = forcedDice === undefined,
  ) => {
    if (!turn.canRoll) return;
    const rollingPlayer = playersRef.current.find(
      (player) => player.id === turn.activePlayerId,
    );
    if (rollingPlayer?.isJailed) return;

    turn.startDiceRoll();
    setIsDiceAnimating(true);
    setIsDiceVisible(true);

    try {
      const firstDice = forcedDice?.[0] ?? createDiceValue();
      const secondDice = forcedDice?.[1] ?? createDiceValue();

      setDiceValues([firstDice, secondDice]);
      await delay(DICE_ANIMATION_DURATION_MS);
      setIsDiceAnimating(false);

            await delay(DICE_RESULT_DELAY_MS);
            setIsDiceVisible(false);

      if (
        allowRerollPrompt &&
        rollingPlayer &&
        hasAuctionItem(
          auctionStateRef.current,
          rollingPlayer.id,
          "DICE_REROLL",
        )
      ) {
        setPendingDiceReroll({
          playerId: rollingPlayer.id,
          diceValues: [firstDice, secondDice],
        });
        return;
      }

      await resolveFinalDiceResult(firstDice, secondDice,);
    } catch (error) {
      setPendingPropertyPurchase(null);
      setPropertyPurchaseError(null);
      setPendingPropertyDevelopment(null);
      setPropertyDevelopmentError(null);
      setPendingTollPayment(null);
      setTollPaymentError(null);
      setAssetLiquidationError(null);
      setPendingTaxSettlement(null);
      setTaxPaymentError(null);
      setTaxLiquidationError(null);
      setPendingMarketResolution(null);
      setPendingStockMarketResolution(null);
      setPendingLotteryShop(null);
      setLotteryShopError(null);
      resetMayorElectionResolution();
      clearPendingDisasterResolution();
      setPendingJailEntry(null);
      setPendingJailFine(null);
      setJailActionError(null);
      setJailLiquidationError(null);
      turn.cancelCurrentAction();
      throw error;
    } finally {
      setIsDiceAnimating(false);
      setIsDiceVisible(false);
    }
  };

  const rollDice = async () => {
    if (onNetworkRollRequest) {
      onNetworkRollRequest();
      return;
    }

    await runDiceRoll();
  };

  const resetNetworkDiceRoll =
    useNetworkDiceRoll({
      diceRoll:
        networkDiceRoll,

      activePlayerId:
        turn.activePlayerId,

      canRoll:
        turn.canRoll,

      runDiceRoll,
    });

  const keepPendingDiceResult = useCallback(async () => {
    const pending = pendingDiceReroll;
    if (!pending) return;
    setPendingDiceReroll(null);
    await resolveFinalDiceResult(
      pending.diceValues[0] as DiceValue,
      pending.diceValues[1] as DiceValue,
    );
  }, [pendingDiceReroll, resolveFinalDiceResult]);

  const rerollPendingDiceResult = useCallback(async () => {
    const pending = pendingDiceReroll;
    if (!pending) return;

    const consumed = consumeAuctionItem(
      auctionStateRef.current,
      pending.playerId,
      "DICE_REROLL",
    );
    if (!consumed) {
      await keepPendingDiceResult();
      return;
    }

    commitAuctionState(consumed.state);
    setPendingDiceReroll(null);
    setIsDiceAnimating(true);
    setIsDiceVisible(true);

    try {
      const firstDice = createDiceValue();
      const secondDice = createDiceValue();

      setDiceValues([firstDice, secondDice]);
      await delay(DICE_ANIMATION_DURATION_MS);
      setIsDiceAnimating(false);

      await delay(DICE_RESULT_DELAY_MS);
      setIsDiceVisible(false);
      await resolveFinalDiceResult(firstDice, secondDice);
    } catch (error) {
      turn.cancelCurrentAction();
      throw error;
    } finally {
      setIsDiceAnimating(false);
      setIsDiceVisible(false);
    }
  }, [
    commitAuctionState,
    keepPendingDiceResult,
    pendingDiceReroll,
    resolveFinalDiceResult,
    turn,
  ]);

  const {
    payJailBail,
    useJailEscapeCard,
    attemptJailDouble,

    applyJailTurnActionDecided,

    isJailTurnActionPending,

    resetJailTurnResolution,
  } = useJailTurnResolution({
    playersRef,
    commitPlayers,

    setPendingJailFine,
    setJailActionError,
    setJailLiquidationError,

    activePlayerId:
      turn.activePlayerId,

    localPlayerId:
      resolvedLocalPlayerId,

    turnSequence: networkTurnSequence ?? turn.turnSequence,

    canRoll:
      turn.canRoll,

    isDiceAnimating,
    setIsDiceAnimating,
    setIsDiceVisible,
    setDiceValues,

    canPlayerAfford,
    withdraw,

    startJailResolution:
      turn.startJailResolution,

    cancelCurrentAction:
      turn.cancelCurrentAction,

    prepareNetworkTurnAdvance:
      prepareNetworkJailTurnAdvance,

    onNetworkEndTurnRequest,

    moveActivePlayer,

    finishJailTurn,

    runLocalDiceRoll:
      runDiceRoll,

    onNetworkGameEventRequest,
  });

  const {
    canInteractWithPendingJailFine,

    payPendingJailFine,

    sellPropertyForPendingJailFine,
    sellStockForPendingJailFine,

    declarePendingJailBankruptcy,

    applyJailFineActionDecided,

    resetJailFineResolution,
  } = useJailFineResolution({
    pendingJailFine,
    setPendingJailFine,

    setJailActionError,
    setJailLiquidationError,

    playersRef,

    propertyOwnershipsRef,
    propertyMarketRef,

    stockPortfoliosRef,
    stockMarketRef,

    lottoStateRef,
    insuranceContractsRef,

    properties,
    stockCompanies,

    activeMayorPolicy,

    localPlayerId:
      resolvedLocalPlayerId,

    turnSequence: networkTurnSequence ?? turn.turnSequence,

    commitPlayers,
    commitPropertyOwnerships,
    commitStockPortfolios,
    commitLottoState,
    commitInsuranceContracts,

    deposit,
    withdraw,

    getPlayerLiquidBalance,
    prepareMandatoryPayment,
    settleBankAssetsForBankruptcy,

    finishJailTurn,

    onNetworkGameEventRequest,
  });
  
  const devSelectActivePlayer = useCallback(
    (playerId: string) => {
      if (!turn.canRoll) return;

      turn.overrideActivePlayer(playerId);
      setLastMove(null);
    },
    [turn],
  );

  const applyDevMoveActivePlayer = useCallback(
    async (steps: number) => {
      if (!turn.canRoll) return;

      await performMovement(steps, true);
    },
    [
      performMovement,
      turn.canRoll,
    ],
  );

  const applyDevFixedDice =
    useCallback(
      async (
        firstDice: DiceValue,
        secondDice: DiceValue,
      ) => {
        await runDiceRoll([
          firstDice,
          secondDice,
        ]);
      },
      [runDiceRoll],
    );    

  const devSetTurnNumber = useCallback(
    (turnNumber: number) => {
      if (!turn.canRoll) return;

      turn.overrideTurnNumber(turnNumber);
    },
    [turn],
  );

  const devSetActivePlayerMoney = useCallback(
    (amount: number) => {
      if (!turn.canRoll) return;

      const safeAmount = Math.max(0, Math.trunc(amount));
      const playerId = turn.activePlayerId;

      commitPlayers(
        playersRef.current.map((player) =>
          player.id === playerId
            ? { ...player, money: safeAmount }
            : player,
        ),
      );
    },
    [commitPlayers, turn],
  );

  const devRunPropertyMarketCycle = useCallback(() => {
    if (!turn.canRoll) return;

    startPropertyMarketResolution("DEV");
  }, [startPropertyMarketResolution, turn.canRoll]);

  const devRunStockMarketCycle = useCallback(() => {
    if (!turn.canRoll) return;

    startStockMarketResolution("DEV");
  }, [startStockMarketResolution, turn.canRoll]);

  const devRunLottoDraw = useCallback(() => {
    if (!turn.canRoll) return;

    startLottoDrawResolution("DEV");
  }, [startLottoDrawResolution, turn.canRoll]);

  const devRunMayorElection = useCallback(() => {
    if (!turn.canRoll) return;

    startMayorElectionResolution("DEV");
  }, [startMayorElectionResolution, turn.canRoll]);

  const devRunCityHall = useCallback(() => {
    if (!turn.canRoll) return;

    const cityHallTurnSequence = turn.turnSequence;

    startCityHallVisit({
      playerId: turn.activePlayerId,
      visitId: [
        "CITY_HALL_DEV",
        cityHallTurnSequence,
        turn.activePlayerId,
        turn.turnNumber,
      ].join(":"),
      turnSequence: cityHallTurnSequence,
    });

    turn.startForcedTileResolution();
  }, [startCityHallVisit, turn]);

  const devRunRandomEconomicNews = useCallback(() => {
    if (!turn.canRoll) return;

    startRandomEconomicNewsResolution("DEV");
  }, [startRandomEconomicNewsResolution, turn.canRoll]);

  const devResetRandomEconomicNewsCooldown = useCallback(() => {
    if (!turn.canRoll) return;

    commitEconomicNewsState(
      resetRandomEconomicNewsCooldown(economicNewsStateRef.current),
    );
  }, [commitEconomicNewsState, turn.canRoll]);

  const devSetInsuranceContract = useCallback(
    (propertyId: string, planType: InsurancePlanType) => {
      if (!turn.canRoll) return;

      const ownership = propertyOwnershipsRef.current[propertyId];
      if (
        !ownership ||
        ownership.ownerPlayerId !== turn.activePlayerId ||
        ownership.stage === "LAND"
      ) {
        return;
      }

      commitInsuranceContracts(
        createOrRenewInsuranceContract(
          insuranceContractsRef.current,
          propertyId,
          turn.activePlayerId,
          planType,
          0,
          turn.turnNumber,
        ),
      );
    },
    [commitInsuranceContracts, turn],
  );

  const devExpireInsuranceContract = useCallback(
    (propertyId: string) => {
      if (!turn.canRoll) return;

      const contract = insuranceContractsRef.current[propertyId];
      if (!contract) return;

      commitInsuranceContracts({
        ...insuranceContractsRef.current,
        [propertyId]: {
          ...contract,
          expiresAfterTurn: turn.turnNumber - 1,
        },
      });
    },
    [commitInsuranceContracts, turn],
  );

  const applyDevTeleportActivePlayer = useCallback(
    (position: number) => {
      if (!turn.canRoll || tileCount <= 0) return;

      const safePosition = Math.min(
        Math.max(Math.trunc(position), 0),
        tileCount - 1,
      );
      const movingPlayerId = turn.activePlayerId;

      const movedPlayers = playersRef.current.map((player) =>
        player.id === movingPlayerId
          ? { ...player, position: safePosition }
          : player,
      );

      setPendingPropertyPurchase(null);
      setPropertyPurchaseError(null);
      setPendingPropertyDevelopment(null);
      setPropertyDevelopmentError(null);
      setPendingTollPayment(null);
      setTollPaymentError(null);
      setAssetLiquidationError(null);
      setPendingLotteryShop(null);
      setLotteryShopError(null);
      setPendingInsuranceShop(null);
      setInsuranceShopError(null);
      setPendingGoldenKey(null);
      setPendingCityHallSelection(null);
      setPendingAirportTravel(null);
      setAirportTravelError(null);
      setPendingPortShop(null);
      setPortShopError(null);
      setPendingBankShop(null);
      setBankShopError(null);
      setPendingJailEntry(null);
      setPendingJailFine(null);
      setJailActionError(null);
      setJailLiquidationError(null);
      setLastMove(null);

      commitPlayers(movedPlayers);

      turn.startForcedTileResolution();

      resolveArrivalTile(
        safePosition,
        movingPlayerId,
      );
          },
          [
            commitPlayers,
            resolveArrivalTile,
            tileCount,
            turn,
          ],
        );
  
  const applyGoldenKeyDrawn = useNetworkGoldenKey({
    playersRef,
    tiles,
    commitGoldenKeyDeck,
    setPendingGoldenKey,
  });

  useEffect(() => {
    completeTileResolutionRef.current = completeTileResolution;
  }, [completeTileResolution]);

  const resetNetworkGameEvents =
    useNetworkGameEvents({
      events:
        networkGameEvents,

      turnSequence:
        networkTurnSequence,

      onEventApplied:
        onNetworkGameEventAck,

      handlers: {
      TOLL_PAID: applyResolvedTollPayment,
      GOLDEN_KEY_DRAWN: applyGoldenKeyDrawn,
      GOLDEN_KEY_APPLIED: applyNetworkGoldenKeyApplied,
      GOLDEN_KEY_CONFIRMED: applyNetworkGoldenKeyConfirmed,
      PROPERTY_DEVELOPMENT_DECIDED: applyPropertyDevelopmentDecided,
      AIRPORT_TRAVEL_DECIDED: applyAirportTravelDecided,
      BANK_ACTION_DECIDED: applyBankActionDecided,
      LOTTERY_ACTION_DECIDED: applyLotteryActionDecided,
      LOTTO_DRAW_RESOLVED: applyLottoDrawResolved,
      LOTTO_DRAW_CONFIRMED: applyLottoDrawConfirmed,
      PORT_ACTION_DECIDED: applyPortActionDecided,
      PORT_SETTLEMENT_RESOLVED: applyPortSettlementResolved,
      PORT_SETTLEMENT_CONFIRMED: applyPortSettlementConfirmed,
      TAX_SETTLEMENT_STARTED: applyTaxSettlementStarted,
      TAX_ACTION_DECIDED: applyTaxActionDecided,
      PROPERTY_MARKET_RESOLVED: applyPropertyMarketResolved,
      PROPERTY_MARKET_SETTLEMENT_CONFIRMED: applyPropertyMarketSettlementConfirmed,
      MACRO_ECONOMY_RESOLVED: applyMacroEconomyResolved,
      COMPANY_DIVIDEND_EVENT_RESOLVED: applyCompanyDividendEventResolved,
      STOCK_MARKET_RESOLVED: applyStockMarketResolved,
      STOCK_MARKET_SETTLEMENT_CONFIRMED: applyStockMarketSettlementConfirmed,
      JAIL_ENTRY_CONFIRMED: applyJailEntryConfirmed,
      JAIL_TURN_ACTION_DECIDED: applyJailTurnActionDecided,
      JAIL_FINE_ACTION_DECIDED: applyJailFineActionDecided,
      AUCTION_ACTION_DECIDED: applyAuctionActionDecided,
      MINI_GAME_ACTION_DECIDED: applyMiniGameActionDecided,
      INSURANCE_ACTION_DECIDED: applyInsuranceActionDecided,
      ECONOMIC_NEWS_DRAW_DECIDED: applyEconomicNewsDrawDecided,
      ECONOMIC_NEWS_APPLIED: applyEconomicNewsApplied,
      ECONOMIC_NEWS_CONFIRMED: applyEconomicNewsConfirmed,
      MAYOR_ELECTION_STARTED: applyMayorElectionStarted,
      MAYOR_ELECTION_VOTE_CAST: applyMayorElectionVoteCast,
      MAYOR_ELECTION_RESULT_RESOLVED: applyMayorElectionResultResolved,
      MAYOR_ELECTION_RESULT_CONFIRMED: applyMayorElectionResultConfirmed,
      CITY_HALL_ACTION_DECIDED: applyCityHallActionDecided,
      DISASTER_RESOLVED: applyDisasterResolved,
      DISASTER_ACTION_DECIDED: applyDisasterActionDecided,
      FESTIVAL_TRIGGER_RESOLVED: applyFestivalTriggerResolved,
      FESTIVAL_ANNOUNCEMENT_CONFIRMED: applyFestivalAnnouncementConfirmed,
      TOURIST_TURN_RESOLVED: applyTouristTurnResolved,
      TOURIST_TURN_CONFIRMED: applyTouristTurnConfirmed,
      FESTIVAL_DEV_ENDED: applyFestivalDevEnded,
    },
  });

  const devMoveActivePlayer = useCallback(
    async (steps: number) => {
      await applyDevMoveActivePlayer(steps);
    },
    [applyDevMoveActivePlayer],
  );

  const devTeleportActivePlayer = useCallback(
    (position: number) => {
      applyDevTeleportActivePlayer(position);
    },
    [applyDevTeleportActivePlayer],
  );

  const devRollDice = useCallback(
    async (firstDice: DiceValue, secondDice: DiceValue) => {
      await applyDevFixedDice(firstDice, secondDice);
    },
    [applyDevFixedDice],
  );

  const resetGame = useCallback(() => {
    const resetPlayers =
      initialGamePlayers.map((player) => ({
        ...player,
      }));

    commitPlayers(resetPlayers);
    setTransactions(createStartingCashTransactions(resetPlayers));
    setLastMove(null);
    setDiceValues([1, 1]);
    setIsDiceAnimating(false);
    setIsDiceVisible(false);
    setSalaryNotice(null);
    setDoubleDiceNotice(null);
    resetDoubleChain();
    resetNetworkDiceRoll();
    resetNetworkPropertyDecision();
    resetNetworkStockTrades();
    resetNetworkTurnSync();
    resetNetworkGameEvents();
    resetAirportTravelResolution();
    resetPropertyDevelopmentResolution();
    resetBankShopResolution();
    resetLottoDrawResolution();
    resetPortShopResolution();
    resetPortSettlementResolution();
    resetStockMarketResolution();
    resetCompanyDividendEventResolution();
    resetMacroEconomyResolution();
    resetJailEntryResolution();
    resetJailTurnResolution();
    resetJailFineResolution();
    resetEconomicNewsResolution();
    resetCityHallResolution();
    propertyOwnershipsRef.current = {};
    setPropertyOwnerships({});
    developmentRestrictionsRef.current = {};
    setDevelopmentRestrictions({});

    const resetMarket = createInitialPropertyMarket(properties);
    propertyMarketRef.current = resetMarket;
    setPropertyMarket(resetMarket);
    resetPropertyMarketResolution();
    pendingJailTurnAdvanceRef.current = null;

    const resetStockMarket = createInitialStockMarket(stockCompanies);
    stockMarketRef.current = resetStockMarket;
    setStockMarket(resetStockMarket);
    const resetStockPortfolios = createInitialStockPortfolios(
      playerIds,
    );
    stockPortfoliosRef.current = resetStockPortfolios;
    setStockPortfolios(resetStockPortfolios);
    companyDividendModifiersRef.current = createInitialCompanyDividendModifiers(stockCompanies,);
    setIsStockMarketOpen(false);
    setStockTradeError(null);

    const resetLottoState = createInitialLottoState();
    lottoStateRef.current = resetLottoState;
    setLottoState(resetLottoState);
    setPendingLotteryShop(null);
    setLotteryShopError(null);
    commitMayorTerm(null);
    resetMayorElectionResolution();

    const resetCityHallState = createInitialCityHallState();
    cityHallStateRef.current = resetCityHallState;
    setCityHallState(resetCityHallState);
    setPendingCityHallSelection(null);
    resetDisasterResolution();

    const resetInsuranceContracts = createInitialInsuranceContracts();
    insuranceContractsRef.current = resetInsuranceContracts;
    setInsuranceContracts(resetInsuranceContracts);
    resetInsuranceShopResolution();

    const resetGoldenKeyDeck = createInitialGoldenKeyDeck();
    goldenKeyDeckRef.current = resetGoldenKeyDeck;
    setGoldenKeyDeck(resetGoldenKeyDeck);
    setPendingGoldenKey(null);

    const resetMacroEconomyState = createInitialMacroEconomyState();
    macroEconomyStateRef.current = resetMacroEconomyState;
    setMacroEconomyState( resetMacroEconomyState,);

    const resetEconomicNewsState = createInitialEconomicNewsState(
      economicNewsPool,
    );
    economicNewsStateRef.current = resetEconomicNewsState;
    setEconomicNewsState(resetEconomicNewsState);
    setPendingEconomicNews(null);
    const resetPortState = createInitialPortState();
    portStateRef.current = resetPortState;
    setPortState(resetPortState);
    const resetBankState = createInitialBankState(playerIds);
    bankStateRef.current = resetBankState;
    setBankState(resetBankState);
    setBankNoticeQueue([]);
    const resetAuctionState = createInitialAuctionState(playerIds);
    auctionStateRef.current = resetAuctionState;
    setAuctionState(resetAuctionState);
    resetAuctionResolution();
    setPendingAuctionTarget(null);
    setPendingDiceReroll(null);
    const resetMiniGameState =createInitialMiniGameState();
    miniGameStateRef.current =resetMiniGameState;
    setMiniGameState(resetMiniGameState,);
    resetMiniGameResolution();
    setPendingJailFine(null);
    setJailActionError(null);
    setJailLiquidationError(null);
    setPendingPropertyPurchase(null);
    setPropertyPurchaseError(null);
    setPendingTollPayment(null);
    setTollPaymentError(null);
    setAssetLiquidationError(null);
    resetTaxSettlementResolution();
    setTaxPaymentError(null);
    setTaxLiquidationError(null);
    

    const resetFestivalDeckState =
      createInitialFestivalDeckState();

    festivalDeckStateRef.current =
      resetFestivalDeckState;

    setFestivalDeckState(
      resetFestivalDeckState,
    );

    resetFestivalResolution();
    

    turn.resetTurnSystem();
    
  }, [
    commitMayorTerm,
    resetMiniGameResolution,
    commitPlayers,
    economicNewsPool,
    initialGamePlayers,
    playerIds,
    properties,

    resetAirportTravelResolution,
    resetDoubleChain,
    resetLottoDrawResolution,
    resetNetworkDiceRoll,
    resetNetworkGameEvents,
    resetNetworkPropertyDecision,
    resetNetworkStockTrades,
    resetNetworkTurnSync,
    resetPropertyDevelopmentResolution,
    resetBankShopResolution,
    resetPortShopResolution,
    resetPortSettlementResolution,
    resetPropertyMarketResolution,
    resetStockMarketResolution,
    resetCompanyDividendEventResolution,
    resetAuctionResolution,
    resetInsuranceShopResolution,
    resetTaxSettlementResolution,
    resetJailEntryResolution,
    resetJailTurnResolution,
    resetJailFineResolution,
    resetEconomicNewsResolution,
    resetCityHallResolution,
    resetFestivalResolution,
    resetMayorElectionResolution,
    resetDisasterResolution,
    resetMacroEconomyResolution,

    stockCompanies,
    turn,
  ]);

  const canConfirmPendingStockMarketResolution =
    Boolean(
      pendingStockMarketResolution,
    ) &&
    (
      !onNetworkGameEventRequest ||
      networkControllerPlayerId ===
        resolvedLocalPlayerId
    );

    return {
    players,
    activePlayer,
    activePlayerId: turn.activePlayerId,
    localPlayer,
    latestLocalTransaction,
    transactions,
    turnNumber: turn.turnNumber,
    turnPhase: turn.phase,
    movementPhase: turn.movementPhase,
    isMoving,
    isTokenMoving,
    isBusy:
      turn.isBusy ||
      isFestivalSettlementBusy ||
      Boolean(airportFlight),
    canRoll: turn.canRoll && !airportFlight,
    lastMove,
    diceValues,
    isRollingDice,
    initialGamePlayers,
    playerIds,
    isDiceAnimating,
    isDiceVisible,
    salaryNotice,
    doubleDiceNotice,
    festivalDeckState,
    activeFestival,
    touristNpc,
    pendingFestivalAnnouncement,
    pendingTouristTurnResult,
    isFestivalSettlementBusy,
    getActiveFestivalTollMultiplier,
    canConfirmFestivalAnnouncement,
    canConfirmTouristTurn,
    completeFestivalAnnouncement,
    completePendingTouristTurn,
    propertyOwnerships,
    developmentRestrictions,
    visibleDevelopmentRestrictions,
    activeDevelopmentRestrictions,
    clearDevelopmentRestriction,
    propertyMarket,
    pendingMarketResolution,
    canConfirmPendingMarketResolution,
    completePendingMarketResolution,
    stockMarket,
    stockPortfolios,
    companyDividendModifiers:companyDividendModifiersRef.current,
    pendingCompanyDividendEvent,
    dismissCompanyDividendEvent,
    pendingStockMarketResolution,
    canConfirmPendingStockMarketResolution,
    completePendingStockMarketResolution:confirmStockMarketSettlement,
    lottoState,
    pendingLotteryShop,
    pendingLotteryPlayer,
    pendingLotteryPlayerTickets,
    lotteryShopError,
    buyScratchTicket,
    buyLottoTickets,
    closeLotteryShop,
    insuranceContracts,
    pendingInsuranceShop,
    pendingInsurancePlayer,
    pendingInsuranceAssets,
    insuranceShopError,
    buyInsurance,
    closeInsuranceShop,
    goldenKeyDeck,
    pendingGoldenKey,
    pendingGoldenKeyPlayer,
    applyPendingGoldenKey,
    closePendingGoldenKey,
    economicNewsState,
    visibleEconomicNews,
    activeEconomicNews,
    economicNewsTollMultiplier,
    macroEconomyState,
    pendingEconomicNews,
    pendingEconomicNewsPlayer,
    applyPendingEconomicNews,
    closePendingEconomicNews,
    pendingAirportTravel,
    pendingAirportPlayer,
    airportDestinationTiles,
    airportTravelError,
    airportFlight,
    travelFromAirport,
    completeAirportFlight,
    closeAirportTravel,
    portState,
    pendingPortShop,
    pendingPortPlayer,
    pendingPortActiveContract,
    portShopError,
    buyPortContract,
    closePortShop,
    pendingPortSettlement,
    completePendingPortSettlement:confirmPortSettlement,
    bankState,
    pendingBankShop,
    pendingBankPlayer,
    pendingBankDepositBalance,
    pendingBankSavingsContract,
    bankShopError,
    currentBankNotice,
    localGeneralDepositBalance,
    localSavingsContract,
    auctionState,
    localAuctionItems,
    activePlayerAuctionItems,
    pendingAuction,
    auctionError,
    placeAuctionBid,
    passAuctionBid,
    discardAuctionItemForWinner,
    closePendingAuction,
    pendingAuctionTarget,
    pendingAuctionTargetPlayer,
    beginAuctionTargetItem,
    confirmAuctionItemTarget,
    cancelAuctionItemTarget,
    pendingDiceReroll,
    pendingDiceRerollPlayer,
    keepPendingDiceResult,
    rerollPendingDiceResult,
    miniGameState,
    pendingMiniGame,
    miniGameError,
    submitTimingStop,
    rollTargetMiniGameDice,
    submitOddEvenBet,
    submitHighLowBet,
    passMiniGameBet,
    completePendingMiniGame,
    depositPendingBank,
    withdrawPendingBank,
    startPendingSavings,
    closeBankShop,
    pendingJailEntry,
    pendingJailEntryPlayer,
    pendingJailFine,
    pendingJailFinePlayer,
    activePlayerIsJailed,
    jailActionError,
    isJailTurnActionPending,
    jailLiquidationError,
    canInteractWithEconomicNews,
    canInteractWithPendingJailFine,
    pendingJailLiquidationAssets,
    pendingJailStockLiquidationAssets,
    pendingJailLiquidationValue,
    pendingJailShortfall,
    canPayPendingJailFine,
    canCoverPendingJailFineAfterLiquidation,
    canDeclarePendingJailBankruptcy,
    closeJailEntry: confirmJailEntry,
    payJailBail,
    attemptJailDouble,
    useJailEscapeCard,
    payPendingJailFine,
    sellPropertyForPendingJailFine,
    sellStockForPendingJailFine,
    declarePendingJailBankruptcy,
    pendingLottoDrawResolution,
    canConfirmLottoDraw,
    completePendingLottoDrawResolution:
    confirmLottoDraw,
    currentMayorTerm,
    activeMayorPolicy,

    pendingMayorElection,
    currentMayorElectionVoterId,
    canVoteInMayorElection,
    canConfirmMayorElectionResult,
    castMayorElectionVote,
    completePendingMayorElection,
    cityHallState,
    activeCityHallTerm,
    pendingCityHallSelection,
    pendingCityHallPlayer,
    pendingCityHallPropertyOptions,
    canInteractWithCityHall,
    submitPendingCityHallApplication,
    closePendingCityHallApplication,
    disasterState,
    activeDisasterPenalties,
    pendingDisasterResolution,
    canConfirmPendingDisasterEvent,
    acknowledgePendingDisasterEvent,
    completePendingDisasterResolution,
    pendingDisasterAssessment,
    pendingDisasterPlayer,
    canInteractWithPendingDisaster,
    canPayPendingDisaster,
    disasterPaymentError,
    pendingDisasterLiquidationAssets,
    pendingDisasterStockLiquidationAssets,
    pendingDisasterLiquidationValue,
    pendingDisasterShortfall,
    canCoverPendingDisasterAfterLiquidation,
    canDeclarePendingDisasterBankruptcy,
    disasterLiquidationError,
    isStockMarketOpen,
    stockTradeError,
    openStockMarket,
    closeStockMarket,
    buyStock,
    sellStock,
    completeStockTrading,
    pendingPropertyPurchase,
    pendingPurchasePlayer,
    pendingPurchasePrice,
    pendingLandmarkPurchaseRequirement,
    canPurchasePendingProperty,
    propertyPurchaseError,
    pendingPropertyDevelopment,
    pendingDevelopmentPlayer,
    pendingDevelopmentOwnership,
    pendingDevelopmentNextStage,
    pendingDevelopmentCost,
    canDevelopPendingProperty,
    propertyDevelopmentError,
    pendingTollPayment,
    pendingTollPayer,
    pendingTollOwner,
    pendingTollOwnerIncome,
    canPayPendingToll,
    canUsePendingTollExemption,
    tollPaymentError,
    pendingLiquidationAssets,
    pendingStockLiquidationAssets,
    pendingLiquidationValue,
    pendingTollShortfall,
    canCoverPendingTollAfterLiquidation,
    canDeclarePendingTollBankruptcy,
    assetLiquidationError,
    pendingTaxSettlement,
    pendingTaxAssessment,
    canInteractWithPendingTax,
    pendingTaxPlayer,
    canPayPendingTax,
    taxPaymentError,
    pendingTaxLiquidationAssets,
    pendingTaxStockLiquidationAssets,
    pendingTaxLiquidationValue,
    pendingTaxShortfall,
    canCoverPendingTaxAfterLiquidation,
    canDeclarePendingTaxBankruptcy,
    taxLiquidationError,
    money: {
      getBalance: getPlayerBalance,
      canAfford: canPlayerAfford,
      deposit,
      withdraw,
      transfer,
    },
    buyPendingProperty,
    declinePendingProperty,
    buildPendingProperty,
    declinePendingDevelopment,
    payPendingToll,
    usePendingTollExemption,
    sellPropertyForPendingToll,
    sellStockForPendingToll,
    declarePendingTollBankruptcy,
    payPendingTax,
    sellPropertyForPendingTax,
    sellStockForPendingTax,
    declarePendingTaxBankruptcy,
    payPendingDisasterRepair,
    sellPropertyForPendingDisaster,
    sellStockForPendingDisaster,
    declarePendingDisasterBankruptcy,
    rollDice,
    resetGame,
    dev: {
      canUseActions: turn.canRoll,

      canEndTurn:
        onNetworkDevEndTurnRequest
          ? turn.phase === "WAITING_FOR_ROLL"
          : turn.phase === "STOCK_TRADING",

      canReset:
        !isDiceAnimating &&
        !isMoving,

      endTurn: devEndTurn,

      selectActivePlayer: devSelectActivePlayer,
      setTurnNumber: devSetTurnNumber,

      moveActivePlayer: devMoveActivePlayer,

      setActivePlayerMoney: devSetActivePlayerMoney,
      runPropertyMarketCycle: devRunPropertyMarketCycle,
      runStockMarketCycle: devRunStockMarketCycle,
      runLottoDraw: devRunLottoDraw,
      runMayorElection: devRunMayorElection,
      runCityHall: devRunCityHall,
      runRandomEconomicNews: devRunRandomEconomicNews,
      resetRandomEconomicNewsCooldown: devResetRandomEconomicNewsCooldown,
      runDisaster: devRunDisaster,
      resetDisasterCooldown: devResetDisasterCooldown,
      runFestival: devRunFestival,
      endFestival: devEndFestival,
      setInsuranceContract: devSetInsuranceContract,
      expireInsuranceContract: devExpireInsuranceContract,

      teleportActivePlayer: devTeleportActivePlayer,
      rollDice: devRollDice,
      resetGame,
    },
  };
}
