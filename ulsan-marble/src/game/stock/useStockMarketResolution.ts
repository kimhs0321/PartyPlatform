import {
  useCallback,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleStockMarketResolvedPayload,
  UlsanMarbleStockMarketSettlementConfirmedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import {
  applyStockLossProtection,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  consumeCityHallOneTimeStockBoost,
  getActiveCityHallTerm,
  getCityHallStockMarketOptions,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import {
  getActiveEconomicNews,
  getEconomicNewsStockIndustryBiases,
} from "../economicNews/economicNewsRules";

import type {
  EconomicNewsState,
} from "../economicNews/economicNewsTypes";

import {
  getActiveMayorPolicy,
  getPolicyStockMarketVolatilityMultiplier,
} from "../election/policyEffects";

import type {
  MayorTerm,
} from "../election/electionTypes";

import {
  createStockMarketCycle,
} from "./stockMarket";

import type {
  StockCompanyData,
  StockIndustryData,
  StockMarketMap,
  StockPortfolioMap,
} from "./stockTypes";

import type {
  PendingStockMarketResolution,
  StockMarketResolutionMode,
} from "./stockResolutionTypes";

interface UseStockMarketResolutionOptions {
  pendingStockMarketResolution:
    PendingStockMarketResolution | null;

  setPendingStockMarketResolution:
    Dispatch<
      SetStateAction<
        PendingStockMarketResolution | null
      >
    >;

  stockMarketRef:
    MutableRefObject<StockMarketMap>;

  stockPortfoliosRef:
    MutableRefObject<StockPortfolioMap>;

  auctionStateRef:
    MutableRefObject<AuctionState>;

  cityHallStateRef:
    MutableRefObject<CityHallState>;

  economicNewsStateRef:
    MutableRefObject<EconomicNewsState>;

  currentMayorTermRef:
    MutableRefObject<MayorTerm | null>;

  stockIndustries:
    StockIndustryData[];

  stockCompanies:
    StockCompanyData[];

  localPlayerId: string;
  activePlayerId: string;

  turnNumber: number;
  turnSequence: number;

  commitStockMarket: (
    nextMarket: StockMarketMap,
  ) => void;

  commitAuctionState: (
    nextState: AuctionState,
  ) => void;

  commitCityHallState: (
    nextState: CityHallState,
  ) => void;

  deposit: (
    playerId: string,
    amount: number,
    reason: "ITEM_COMPENSATION",
    memo?: string,
  ) => unknown;

  startStockMarketSettlementPhase:
    () => void;

  cancelCurrentAction:
    () => void;

  startPortSettlementResolution: (
    additionallyDisabledPlayerIds?:
      string[],
  ) => void;

  onNetworkGameEventRequest?: (
    event: UlsanMarbleGameEventRequest,
  ) => void;
}

function mergeRateRecords(
  ...records:
    Array<Record<string, number>>
): Record<string, number> {
  const result:
    Record<string, number> = {};

  for (const record of records) {
    for (
      const [key, value]
      of Object.entries(record)
    ) {
      result[key] =
        (result[key] ?? 0) + value;
    }
  }

  return result;
}

function createResolutionId(
  turnSequence: number,
  turnNumber: number,
): string {
  return [
    "stock-market",
    turnSequence,
    turnNumber,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

export function useStockMarketResolution({
  pendingStockMarketResolution,
  setPendingStockMarketResolution,

  stockMarketRef,
  stockPortfoliosRef,
  auctionStateRef,
  cityHallStateRef,
  economicNewsStateRef,
  currentMayorTermRef,

  stockIndustries,
  stockCompanies,

  localPlayerId,
  activePlayerId,

  turnNumber,
  turnSequence,

  commitStockMarket,
  commitAuctionState,
  commitCityHallState,

  deposit,

  startStockMarketSettlementPhase,
  cancelCurrentAction,
  startPortSettlementResolution,

  onNetworkGameEventRequest,
}: UseStockMarketResolutionOptions) {
  const pendingResolutionRef =
    useRef<
      PendingStockMarketResolution | null
    >(
      pendingStockMarketResolution,
    );

  pendingResolutionRef.current =
    pendingStockMarketResolution;

  const appliedResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const confirmedResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedResolutionIdRef =
    useRef<string | null>(
      null,
    );

  const publishedConfirmationIdRef =
    useRef<string | null>(
      null,
    );

  const applyStockMarketResolved =
    useCallback(
      (
        payload:
          UlsanMarbleStockMarketResolvedPayload,
      ): boolean => {
        if (
          payload.turnNumber !==
            turnNumber ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          appliedResolutionIdsRef
            .current
            .has(payload.resolutionId)
        ) {
          return true;
        }

        const currentPending =
          pendingResolutionRef.current;

        if (
          currentPending &&
          currentPending.resolutionId !==
            payload.resolutionId
        ) {
          return false;
        }

        commitStockMarket({
          ...payload.nextMarket,
        });

        const currentAuctionState =
          auctionStateRef.current;

        const nextAuctionState:
          AuctionState = {
            ...currentAuctionState,

            targetEffects: {
              ...currentAuctionState
                .targetEffects,

              stockLossIndustryByPlayer: {
                ...payload
                  .nextStockLossIndustryByPlayer,
              },
            },
          };

        commitAuctionState(
          nextAuctionState,
        );

        if (
          payload
            .consumedCityHallOneTimeBoost
        ) {
          const nextCityHallState =
            consumeCityHallOneTimeStockBoost(
              cityHallStateRef.current,
              payload.turnNumber,
            );

          if (
            nextCityHallState !==
            cityHallStateRef.current
          ) {
            commitCityHallState(
              nextCityHallState,
            );
          }
        }

        for (
          const credit
          of payload.protectionCredits
        ) {
          deposit(
            credit.playerId,
            credit.amount,
            "ITEM_COMPENSATION",
            `주식 손실보전권 · ${credit.industryId}`,
          );
        }

        const nextPending:
          PendingStockMarketResolution = {
            resolutionId:
              payload.resolutionId,

            turnNumber:
              payload.turnNumber,

            turnSequence:
              payload.turnSequence,

            cycle:
              payload.cycle,

            mode:
              payload.mode,

            additionallyDisabledPlayerIds: [
              ...new Set(
                payload
                  .additionallyDisabledPlayerIds,
              ),
            ],
          };

        pendingResolutionRef.current =
          nextPending;

        setPendingStockMarketResolution(
          nextPending,
        );

        appliedResolutionIdsRef
          .current
          .add(payload.resolutionId);

        if (
          publishedResolutionIdRef.current ===
          payload.resolutionId
        ) {
          publishedResolutionIdRef.current =
            null;
        }

        startStockMarketSettlementPhase();

        return true;
      },
      [
        auctionStateRef,
        cityHallStateRef,
        commitAuctionState,
        commitCityHallState,
        commitStockMarket,
        deposit,
        setPendingStockMarketResolution,
        startStockMarketSettlementPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const applyStockMarketSettlementConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleStockMarketSettlementConfirmedPayload,
      ): boolean => {
        if (payload.turnSequence !== turnSequence) {
              return false;
            }

            const currentPending = pendingResolutionRef.current;

            if (
              !currentPending ||
              currentPending.resolutionId !== payload.resolutionId ||
              currentPending.turnNumber !== payload.turnNumber ||
              currentPending.turnSequence !== payload.turnSequence
            ) {
              return false;
            }

        if (
          confirmedResolutionIdsRef
            .current
            .has(payload.resolutionId)
        ) {
          return true;
        }

        pendingResolutionRef.current =
          null;

        setPendingStockMarketResolution(
          null,
        );

        confirmedResolutionIdsRef
          .current
          .add(payload.resolutionId);

        if (
          publishedConfirmationIdRef
            .current ===
          payload.resolutionId
        ) {
          publishedConfirmationIdRef.current =
            null;
        }

        if (
          currentPending.mode ===
          "DEV"
        ) {
          cancelCurrentAction();
          return true;
        }

        startPortSettlementResolution(
          currentPending
            .additionallyDisabledPlayerIds,
        );

        return true;
      },
      [
        cancelCurrentAction,
        setPendingStockMarketResolution,
        startPortSettlementResolution,
        turnSequence,
      ],
    );

  const startStockMarketResolution =
    useCallback(
      (
        mode:
          StockMarketResolutionMode,

        additionallyDisabledPlayerIds:
          string[] = [],
      ): boolean => {
        if (
          pendingResolutionRef.current
        ) {
          return true;
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        if (
          isNetworkGame &&
          activePlayerId !==
            localPlayerId
        ) {
          return true;
        }

        if (
          publishedResolutionIdRef.current
        ) {
          return true;
        }

        const activeMayorPolicy =
          getActiveMayorPolicy(
            currentMayorTermRef.current,
            turnNumber,
          );

        const activeCityHallTerm =
          getActiveCityHallTerm(
            cityHallStateRef.current,
            turnNumber,
          );

        const cityHallOptions =
          getCityHallStockMarketOptions(
            activeCityHallTerm,
          );

        const result =
          createStockMarketCycle(
            stockIndustries,
            stockCompanies,
            stockMarketRef.current,
            turnNumber,
            {
              volatilityMultiplier:
                getPolicyStockMarketVolatilityMultiplier(
                  activeMayorPolicy,
                ),

              industryChangeBiases:
                mergeRateRecords(
                  getEconomicNewsStockIndustryBiases(
                    getActiveEconomicNews(
                      economicNewsStateRef.current,
                      turnNumber,
                    ),
                  ),

                  cityHallOptions
                    .industryChangeBiases,
                ),

              minimumFinalChangeRate:
                cityHallOptions
                  .minimumFinalChangeRate,
            },
          );

        const protectionResult =
          applyStockLossProtection(
            auctionStateRef.current,
            result.cycle,
            stockPortfoliosRef.current,
            stockCompanies,
          );

        const resolutionId =
          createResolutionId(
            turnSequence,
            turnNumber,
          );

        const payload:
          UlsanMarbleStockMarketResolvedPayload = {
            resolutionId,

            turnNumber,
            turnSequence,

            mode,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            nextMarket:
              result.market,

            cycle:
              protectionResult.cycle,

            protectionCredits:
              protectionResult.credits,

            nextStockLossIndustryByPlayer: {
              ...protectionResult
                .state
                .targetEffects
                .stockLossIndustryByPlayer,
            },

            consumedCityHallOneTimeBoost:
              cityHallOptions
                .hasConsumableOneTimeBoost,
          };

        publishedResolutionIdRef.current =
          resolutionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "STOCK_MARKET_RESOLVED",

              payload,
            });

            return true;
          } catch (error) {
            publishedResolutionIdRef.current =
              null;

            throw error;
          }
        }

        const applied =
          applyStockMarketResolved(
            payload,
          );

        if (!applied) {
          publishedResolutionIdRef.current =
            null;
        }

        return applied;
      },
      [
        activePlayerId,
        applyStockMarketResolved,
        auctionStateRef,
        cityHallStateRef,
        currentMayorTermRef,
        economicNewsStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        stockCompanies,
        stockIndustries,
        stockMarketRef,
        stockPortfoliosRef,
        turnNumber,
        turnSequence,
      ],
    );

  const confirmStockMarketSettlement =
    useCallback(
      (): boolean => {
        const currentPending =
          pendingResolutionRef.current;

        if (!currentPending) {
          return false;
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        if (
          isNetworkGame &&
          activePlayerId !==
            localPlayerId
        ) {
          return false;
        }

        if (
          publishedConfirmationIdRef
            .current ===
          currentPending.resolutionId
        ) {
          return true;
        }

        const payload: UlsanMarbleStockMarketSettlementConfirmedPayload = {
          resolutionId: currentPending.resolutionId,
          turnNumber: currentPending.turnNumber,
          turnSequence: currentPending.turnSequence,
        };

        console.log("[STOCK CONFIRM] publish", {
          localPlayerId,
          activePlayerId,
          currentPending,
          payload,
        });

        publishedConfirmationIdRef.current = currentPending.resolutionId;

        if (onNetworkGameEventRequest) {
          try {
            onNetworkGameEventRequest({
              kind: "STOCK_MARKET_SETTLEMENT_CONFIRMED",
              payload,
            });

            return true;
          } catch (error) {
            publishedConfirmationIdRef.current = null;
            throw error;
          }
        }

        const applied =
          applyStockMarketSettlementConfirmed(
            payload,
          );

        if (!applied) {
          publishedConfirmationIdRef.current =
            null;
        }

        return applied;
      },
      [
        activePlayerId,
        applyStockMarketSettlementConfirmed,
        localPlayerId,
        onNetworkGameEventRequest,
      ],
    );

  const resetStockMarketResolution =
    useCallback(
      () => {
        pendingResolutionRef.current =
          null;

        setPendingStockMarketResolution(
          null,
        );

        appliedResolutionIdsRef
          .current
          .clear();

        confirmedResolutionIdsRef
          .current
          .clear();

        publishedResolutionIdRef.current =
          null;

        publishedConfirmationIdRef.current =
          null;
      },
      [
        setPendingStockMarketResolution,
      ],
    );

  return {
    startStockMarketResolution,
    confirmStockMarketSettlement,

    applyStockMarketResolved,
    applyStockMarketSettlementConfirmed,

    resetStockMarketResolution,
  };
}