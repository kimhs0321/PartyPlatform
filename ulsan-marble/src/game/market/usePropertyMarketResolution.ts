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
  UlsanMarblePropertyMarketResolvedPayload,
  UlsanMarblePropertyMarketSettlementConfirmedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PropertyData,
} from "../../types";

import {
  applyPropertyDefenseItems,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  getActiveCityHallTerm,
  getCityHallPropertyMarketOptions,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import {
  getActiveEconomicNews,
  getEconomicNewsPropertyDistrictBiases,
} from "../economicNews/economicNewsRules";

import type {
  EconomicNewsState,
} from "../economicNews/economicNewsTypes";

import {
  getActiveMayorPolicy,
  getPolicyPropertyMarketOptions,
} from "../election/policyEffects";

import type {
  MayorTerm,
} from "../election/electionTypes";

import {
  createPropertyMarketCycle,
} from "./propertyMarket";

import type {
  PendingMarketResolution,
  PropertyMarketCycle,
  PropertyMarketMap,
  PropertyMarketResolutionMode,
} from "./marketTypes";

interface UsePropertyMarketResolutionOptions {
  pendingMarketResolution:
    PendingMarketResolution | null;

  setPendingMarketResolution:
    Dispatch<
      SetStateAction<
        PendingMarketResolution | null
      >
    >;

  propertyMarketRef:
    MutableRefObject<PropertyMarketMap>;

  auctionStateRef:
    MutableRefObject<AuctionState>;

  cityHallStateRef:
    MutableRefObject<CityHallState>;

  economicNewsStateRef:
    MutableRefObject<EconomicNewsState>;

  currentMayorTermRef:
    MutableRefObject<MayorTerm | null>;

  properties:
    PropertyData[];

  localPlayerId: string;
  activePlayerId: string;

  turnNumber: number;
  turnSequence: number;

  commitPropertyMarket: (
    nextMarket:
      PropertyMarketMap,
  ) => void;

  commitAuctionState: (
    nextState:
      AuctionState,
  ) => void;

  startMarketSettlementPhase:
    () => void;

  cancelCurrentAction:
    () => void;

  continueAfterPropertyMarket: (
    additionallyDisabledPlayerIds?:
      string[],
  ) => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

interface PropertyMarketResolvedSnapshot {
  resolutionId: string;

  turnNumber: number;
  turnSequence: number;

  mode:
    PropertyMarketResolutionMode;

  additionallyDisabledPlayerIds:
    string[];

  nextMarket:
    PropertyMarketMap;

  cycle:
    PropertyMarketCycle;

  nextPropertyDefenseByPlayer:
    Record<string, string>;
}

function createResolutionId(
  turnSequence: number,
  turnNumber: number,
  mode: PropertyMarketResolutionMode,
): string {
  return [
    mode === "DEV"
      ? "property-market-dev"
      : "property-market",

    turnSequence,
    turnNumber,
    Date.now(),

    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

export function usePropertyMarketResolution({
  pendingMarketResolution,
  setPendingMarketResolution,

  propertyMarketRef,
  auctionStateRef,
  cityHallStateRef,
  economicNewsStateRef,
  currentMayorTermRef,

  properties,

  localPlayerId,
  activePlayerId,

  turnNumber,
  turnSequence,

  commitPropertyMarket,
  commitAuctionState,

  startMarketSettlementPhase,
  cancelCurrentAction,
  continueAfterPropertyMarket,

  onNetworkGameEventRequest,
}: UsePropertyMarketResolutionOptions) {
  const pendingResolutionRef =
    useRef<
      PendingMarketResolution | null
    >(
      pendingMarketResolution,
    );

  pendingResolutionRef.current =
    pendingMarketResolution;

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

  const calculatePropertyMarket =
    useCallback(
      () => {
        const activeMayorPolicy =
          getActiveMayorPolicy(
            currentMayorTermRef.current,
            turnNumber,
          );

        const mayorOptions =
          getPolicyPropertyMarketOptions(
            activeMayorPolicy,
          );

        const activeCityHallTerm =
          getActiveCityHallTerm(
            cityHallStateRef.current,
            turnNumber,
          );

        const cityHallOptions =
          getCityHallPropertyMarketOptions(
            activeCityHallTerm,
          );

        /*
         * 정기 네트워크 처리에서는
         * 이 함수가 현재 플레이어 화면에서만
         * 호출된다.
         *
         * 즉 Math.random 기반 시세 생성도
         * 한 번만 실행된다.
         */
        const result =
          createPropertyMarketCycle(
            properties,
            propertyMarketRef.current,
            turnNumber,
            {
              volatilityMultiplier:
                mayorOptions
                  .volatilityMultiplier,

              changeBias:
                mayorOptions.changeBias +
                cityHallOptions.changeBias,

              minimumChangeRate:
                cityHallOptions
                  .minimumChangeRate,

              districtChangeBiases:
                getEconomicNewsPropertyDistrictBiases(
                  getActiveEconomicNews(
                    economicNewsStateRef.current,
                    turnNumber,
                  ),
                ),
            },
          );

        /*
         * 부동산 방어권도
         * authoritative client에서 한 번만
         * 최종 판정한다.
         */
        return applyPropertyDefenseItems(
          auctionStateRef.current,
          propertyMarketRef.current,
          {
            ...result.market,
          },
          result.cycle,
        );
      },
      [
        auctionStateRef,
        cityHallStateRef,
        currentMayorTermRef,
        economicNewsStateRef,
        properties,
        propertyMarketRef,
        turnNumber,
      ],
    );

  const applyResolvedSnapshot =
    useCallback(
      (
        snapshot:
          PropertyMarketResolvedSnapshot,
      ): boolean => {
        if (
          snapshot.turnNumber !==
            turnNumber ||
          snapshot.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          appliedResolutionIdsRef
            .current
            .has(
              snapshot.resolutionId,
            )
        ) {
          return true;
        }

        const currentPending =
          pendingResolutionRef.current;

        if (
          currentPending &&
          currentPending.resolutionId !==
            snapshot.resolutionId
        ) {
          return false;
        }

        /*
         * 모든 클라이언트가
         * authoritative client가 보낸
         * 최종 시세를 그대로 적용한다.
         */
        commitPropertyMarket({
          ...snapshot.nextMarket,
        });

        /*
         * 방어권 발동 후 남아 있는
         * 예약 상태 역시 동일하게 맞춘다.
         */
        const currentAuctionState =
          auctionStateRef.current;

        const nextAuctionState:
          AuctionState = {
            ...currentAuctionState,

            targetEffects: {
              ...currentAuctionState
                .targetEffects,

              propertyDefenseByPlayer: {
                ...snapshot
                  .nextPropertyDefenseByPlayer,
              },
            },
          };

        commitAuctionState(
          nextAuctionState,
        );

        const nextPending:
          PendingMarketResolution = {
            resolutionId:
              snapshot.resolutionId,

            turnNumber:
              snapshot.turnNumber,

            turnSequence:
              snapshot.turnSequence,

            cycle:
              snapshot.cycle,

            mode:
              snapshot.mode,

            additionallyDisabledPlayerIds: [
              ...new Set(
                snapshot
                  .additionallyDisabledPlayerIds,
              ),
            ],
          };

        pendingResolutionRef.current =
          nextPending;

        setPendingMarketResolution(
          nextPending,
        );

        appliedResolutionIdsRef
          .current
          .add(
            snapshot.resolutionId,
          );

        if (
          publishedResolutionIdRef
            .current ===
          snapshot.resolutionId
        ) {
          publishedResolutionIdRef.current =
            null;
        }

        startMarketSettlementPhase();

        return true;
      },
      [
        auctionStateRef,
        commitAuctionState,
        commitPropertyMarket,
        setPendingMarketResolution,
        startMarketSettlementPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const applyPropertyMarketResolved =
    useCallback(
      (
        payload:
          UlsanMarblePropertyMarketResolvedPayload,
      ): boolean => {
        return applyResolvedSnapshot(
          payload,
        );
      },
      [
        applyResolvedSnapshot,
      ],
    );

  const applyPropertyMarketSettlementConfirmed =
    useCallback(
      (
        payload:
          UlsanMarblePropertyMarketSettlementConfirmedPayload,
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
          confirmedResolutionIdsRef
            .current
            .has(
              payload.resolutionId,
            )
        ) {
          return true;
        }

        const currentPending =
          pendingResolutionRef.current;

        if (
          !currentPending ||
          currentPending.resolutionId !==
            payload.resolutionId ||
          currentPending.mode !==
            "SCHEDULED"
        ) {
          return false;
        }

        pendingResolutionRef.current =
          null;

        setPendingMarketResolution(
          null,
        );

        confirmedResolutionIdsRef
          .current
          .add(
            payload.resolutionId,
          );

        if (
          publishedConfirmationIdRef
            .current ===
          payload.resolutionId
        ) {
          publishedConfirmationIdRef.current =
            null;
        }

        /*
         * 확인 이벤트를 받은 모든 클라이언트가
         * 동일한 다음 정산 루트로 진입한다.
         */
        continueAfterPropertyMarket(
          currentPending
            .additionallyDisabledPlayerIds,
        );

        return true;
      },
      [
        continueAfterPropertyMarket,
        setPendingMarketResolution,
        turnNumber,
        turnSequence,
      ],
    );

  const startPropertyMarketResolution =
    useCallback(
      (
        mode:
          PropertyMarketResolutionMode,

        additionallyDisabledPlayerIds:
          string[] = [],
      ): boolean => {
        if (
          pendingResolutionRef.current
        ) {
          return true;
        }

        /*
         * DEV는 이번 동기화 범위가 아니다.
         * 기존처럼 누른 클라이언트에서만
         * 즉시 계산/적용한다.
         */
        if (mode === "DEV") {
          const result =
            calculatePropertyMarket();

          const resolutionId =
            createResolutionId(
              turnSequence,
              turnNumber,
              "DEV",
            );

          return applyResolvedSnapshot({
            resolutionId,

            turnNumber,
            turnSequence,

            mode: "DEV",

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            nextMarket:
              result.market,

            cycle:
              result.cycle,

            nextPropertyDefenseByPlayer: {
              ...result.state
                .targetEffects
                .propertyDefenseByPlayer,
            },
          });
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        /*
         * 중요:
         * 네트워크 정기 변동에서는
         * 현재 턴 플레이어만 난수를 만든다.
         *
         * 상대 클라이언트는 여기서 기다리고
         * PROPERTY_MARKET_RESOLVED를 받아 적용한다.
         */
        if (
          isNetworkGame &&
          activePlayerId !==
            localPlayerId
        ) {
          return true;
        }

        if (
          publishedResolutionIdRef
            .current
        ) {
          return true;
        }

        const result =
          calculatePropertyMarket();

        const resolutionId =
          createResolutionId(
            turnSequence,
            turnNumber,
            "SCHEDULED",
          );

        const payload:
          UlsanMarblePropertyMarketResolvedPayload = {
            resolutionId,

            turnNumber,
            turnSequence,

            mode:
              "SCHEDULED",

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            nextMarket:
              result.market,

            cycle:
              result.cycle,

            nextPropertyDefenseByPlayer: {
              ...result.state
                .targetEffects
                .propertyDefenseByPlayer,
            },
          };

        publishedResolutionIdRef.current =
          resolutionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "PROPERTY_MARKET_RESOLVED",

              payload,
            });

            return true;
          } catch (error) {
            publishedResolutionIdRef.current =
              null;

            throw error;
          }
        }

        /*
         * 네트워크 없는 기존 로컬 모드.
         */
        const applied =
          applyPropertyMarketResolved(
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
        applyPropertyMarketResolved,
        applyResolvedSnapshot,
        calculatePropertyMarket,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );

  const confirmPropertyMarketSettlement =
    useCallback(
      (): boolean => {
        const currentPending =
          pendingResolutionRef.current;

        if (!currentPending) {
          return false;
        }

        /*
         * DEV 확인은 네트워크를 거치지 않는다.
         */
        if (
          currentPending.mode ===
          "DEV"
        ) {
          pendingResolutionRef.current =
            null;

          setPendingMarketResolution(
            null,
          );

          cancelCurrentAction();

          return true;
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        /*
         * 정기 시세변동 확인은
         * 현재 플레이어만 가능.
         */
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

        const payload:
          UlsanMarblePropertyMarketSettlementConfirmedPayload = {
            resolutionId:
              currentPending.resolutionId,

            turnNumber:
              currentPending.turnNumber,

            turnSequence:
              currentPending.turnSequence,
          };

        publishedConfirmationIdRef.current =
          currentPending.resolutionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "PROPERTY_MARKET_SETTLEMENT_CONFIRMED",

              payload,
            });

            return true;
          } catch (error) {
            publishedConfirmationIdRef.current =
              null;

            throw error;
          }
        }

        const applied =
          applyPropertyMarketSettlementConfirmed(
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
        applyPropertyMarketSettlementConfirmed,
        cancelCurrentAction,
        localPlayerId,
        onNetworkGameEventRequest,
        setPendingMarketResolution,
      ],
    );

  const canConfirmPropertyMarketSettlement =
    Boolean(
      pendingMarketResolution,
    ) &&
    (
      pendingMarketResolution?.mode ===
        "DEV" ||
      !onNetworkGameEventRequest ||
      activePlayerId ===
        localPlayerId
    );

  const resetPropertyMarketResolution =
    useCallback(
      () => {
        pendingResolutionRef.current =
          null;

        setPendingMarketResolution(
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
        setPendingMarketResolution,
      ],
    );

  return {
    startPropertyMarketResolution,

    confirmPropertyMarketSettlement,

    canConfirmPropertyMarketSettlement,

    applyPropertyMarketResolved,

    applyPropertyMarketSettlementConfirmed,

    resetPropertyMarketResolution,
  };
}