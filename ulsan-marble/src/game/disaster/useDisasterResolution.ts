import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import type { MutableRefObject } from "react";

import type {
  UlsanMarbleDisasterActionDecidedPayload,
  UlsanMarbleDisasterResolvedPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  PropertyData,
} from "../../types";

import {
  consumeAuctionItem,
  hasAuctionItem,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  getActiveCityHallTerm,
  getCityHallDisasterRepairCostMultiplier,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import {
  canCoverDebtAfterLiquidation,
  getCombinedLiquidationValue,
  getDebtShortfall,
} from "../economy/insolvency";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import type {
  MayorPolicy,
} from "../election/electionTypes";

import {
  getPolicyPropertySaleRate,
} from "../election/policyEffects";

import {
  removeInsuranceContract,
  removePlayerInsuranceContracts,
} from "../insurance/insuranceRules";

import type {
  InsuranceContractMap,
} from "../insurance/insuranceTypes";

import {
  releasePlayerFromJail,
} from "../jail/jailRules";

import type {
  LottoState,
} from "../lottery/lotteryTypes";

import type {
  PropertyMarketMap,
} from "../market/marketTypes";

import {
  getSellablePropertyAssets,
  sellPropertyOwnership,
} from "../property/propertySale";

import type {
  PropertyOwnershipMap,
} from "../property/propertyTypes";

import {
  getSellableStockAssets,
} from "../stock/stockLiquidation";

import {
  getStockPrice,
} from "../stock/stockMarket";

import {
  getStockHolding,
  sellStockHolding,
} from "../stock/stockTrading";

import type {
  StockCompanyData,
  StockMarketMap,
  StockPortfolioMap,
} from "../stock/stockTypes";

import {
  applyDisasterEventToState,
  createDisasterEvent,
  createInitialDisasterState,
  getActiveDisasterPenalties,
  getPolicyDisasterChanceMultiplier,
  getPolicyDisasterRepairCostMultiplier,
  selectRandomDisasterType,
  shouldTriggerDisaster,
} from "./disasterRules";

import type {
  DisasterLiquidationError,
  DisasterPaymentError,
  DisasterState,
  DisasterType,
  PendingDisasterResolution,
} from "./disasterTypes";

type MoneyOperation = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseDisasterResolutionOptions {
  players: PlayerTokenData[];
  playersRef:
    MutableRefObject<PlayerTokenData[]>;

  propertyOwnerships:
    PropertyOwnershipMap;
  propertyOwnershipsRef:
    MutableRefObject<PropertyOwnershipMap>;

  propertyMarket:
    PropertyMarketMap;
  propertyMarketRef:
    MutableRefObject<PropertyMarketMap>;

  stockPortfolios:
    StockPortfolioMap;
  stockPortfoliosRef:
    MutableRefObject<StockPortfolioMap>;

  stockMarket:
    StockMarketMap;
  stockMarketRef:
    MutableRefObject<StockMarketMap>;

  insuranceContractsRef:
    MutableRefObject<InsuranceContractMap>;

  lottoStateRef:
    MutableRefObject<LottoState>;

  cityHallStateRef:
    MutableRefObject<CityHallState>;

  auctionStateRef:
    MutableRefObject<AuctionState>;

  properties: PropertyData[];
  stockCompanies: StockCompanyData[];

  activeMayorPolicy:
    MayorPolicy | null;

  localPlayerId: string;
  activePlayerId: string;
  controllerPlayerId?: string;

  turnNumber: number;
  turnSequence: number;

  networkTurnNumber?: number;
  networkTurnSequence?: number;

  canRunDev: boolean;

  commitPlayers: (
    next: PlayerTokenData[],
  ) => void;

  commitPropertyOwnerships: (
    next: PropertyOwnershipMap,
  ) => void;

  commitPropertyMarket: (
    next: PropertyMarketMap,
  ) => void;

  commitStockPortfolios: (
    next: StockPortfolioMap,
  ) => void;

  commitLottoState: (
    next: LottoState,
  ) => void;

  commitInsuranceContracts: (
    next: InsuranceContractMap,
  ) => void;

  commitAuctionState: (
    next: AuctionState,
  ) => void;

  getPlayerLiquidBalance: (
    playerId: string,
  ) => number;

  deposit: MoneyOperation;
  withdraw: MoneyOperation;

  prepareMandatoryPayment: (
    playerId: string,
    amount: number,
    memo: string,
  ) => boolean;

  settleBankAssetsForBankruptcy: (
    playerId: string,
    memo: string,
  ) => boolean;

  startDisasterPhase: () => void;

  completeDisasterPhase: (
    additionallyDisabledPlayerIds:
      string[],
  ) => void;

  completeTurn: (
    additionallyDisabledPlayerIds:
      string[],
  ) => void;

  cancelCurrentAction: () => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

export function useDisasterResolution({
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

  localPlayerId,
  activePlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  networkTurnNumber,
  networkTurnSequence,

  canRunDev,

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

  startDisasterPhase,
  completeDisasterPhase,
  completeTurn,
  cancelCurrentAction,

  onNetworkGameEventRequest,
}: UseDisasterResolutionOptions) {
  const [
    disasterState,
    setDisasterState,
  ] = useState(
    () => createInitialDisasterState(),
  );

  const disasterStateRef =
    useRef(
      createInitialDisasterState(),
    );

  const [
    pendingDisasterResolution,
    setPendingDisasterResolution,
  ] = useState<
    PendingDisasterResolution | null
  >(null);

  const [
    disasterPaymentError,
    setDisasterPaymentError,
  ] = useState<
    DisasterPaymentError | null
  >(null);

  const [
    disasterLiquidationError,
    setDisasterLiquidationError,
  ] = useState<
    DisasterLiquidationError | null
  >(null);

  const processedDisasterActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedDisasterActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const commitDisasterState =
    useCallback(
      (
        nextState:
          DisasterState,
      ) => {
        disasterStateRef.current =
          nextState;

        setDisasterState(
          nextState,
        );
      },
      [],
    );

  const activeDisasterPenalties =
    useMemo(
      () =>
        getActiveDisasterPenalties(
          disasterState,
          turnNumber,
        ),
      [
        disasterState,
        turnNumber,
      ],
    );

  const pendingDisasterAssessment =
    useMemo(() => {
      if (
        !pendingDisasterResolution ||
        pendingDisasterResolution.stage !==
          "SETTLEMENT"
      ) {
        return null;
      }

      return (
        pendingDisasterResolution
          .event
          .playerAssessments[
            pendingDisasterResolution
              .currentAssessmentIndex
          ] ?? null
      );
    }, [
      pendingDisasterResolution,
    ]);

  const canConfirmPendingDisasterEvent =
    Boolean(
      pendingDisasterResolution &&
        pendingDisasterResolution.stage ===
          "EVENT",
    ) &&
    (
      !onNetworkGameEventRequest ||
      controllerPlayerId ===
        localPlayerId
    );

  const canInteractWithPendingDisaster =
    Boolean(
      pendingDisasterAssessment,
    ) &&
    (
      !onNetworkGameEventRequest ||
      pendingDisasterAssessment
        ?.playerId === localPlayerId
    );

  const pendingDisasterPlayer =
    useMemo(() => {
      if (!pendingDisasterAssessment) {
        return null;
      }

      return (
        players.find(
          (player) =>
            player.id ===
            pendingDisasterAssessment
              .playerId,
        ) ?? null
      );
    }, [
      pendingDisasterAssessment,
      players,
    ]);

  const canPayPendingDisaster =
    Boolean(
      pendingDisasterAssessment &&
        pendingDisasterPlayer &&
        getPlayerLiquidBalance(
          pendingDisasterPlayer.id,
        ) >=
          pendingDisasterAssessment
            .totalAmount,
    );

  const pendingDisasterLiquidationAssets =
    useMemo(() => {
      if (!pendingDisasterAssessment) {
        return [];
      }

      return getSellablePropertyAssets(
        propertyOwnerships,
        properties,
        pendingDisasterAssessment
          .playerId,
        propertyMarket,
        getPolicyPropertySaleRate(
          activeMayorPolicy,
        ),
      );
    }, [
      activeMayorPolicy,
      pendingDisasterAssessment,
      properties,
      propertyMarket,
      propertyOwnerships,
    ]);

  const pendingDisasterStockLiquidationAssets =
    useMemo(() => {
      if (!pendingDisasterAssessment) {
        return [];
      }

      return getSellableStockAssets(
        stockPortfolios,
        stockCompanies,
        stockMarket,
        pendingDisasterAssessment
          .playerId,
      );
    }, [
      pendingDisasterAssessment,
      stockCompanies,
      stockMarket,
      stockPortfolios,
    ]);

  const pendingDisasterLiquidationValue =
    useMemo(
      () =>
        getCombinedLiquidationValue(
          pendingDisasterLiquidationAssets,
          pendingDisasterStockLiquidationAssets,
        ),
      [
        pendingDisasterLiquidationAssets,
        pendingDisasterStockLiquidationAssets,
      ],
    );

  const pendingDisasterShortfall =
    pendingDisasterAssessment
      ? getDebtShortfall(
          getPlayerLiquidBalance(
            pendingDisasterAssessment
              .playerId,
          ),
          pendingDisasterAssessment
            .totalAmount,
        )
      : 0;

  const canCoverPendingDisasterAfterLiquidation =
    pendingDisasterAssessment
      ? canCoverDebtAfterLiquidation(
          getPlayerLiquidBalance(
            pendingDisasterAssessment
              .playerId,
          ),
          pendingDisasterAssessment
            .totalAmount,
          pendingDisasterLiquidationAssets,
          pendingDisasterStockLiquidationAssets,
        )
      : false;

  const canDeclarePendingDisasterBankruptcy =
    Boolean(
      pendingDisasterAssessment,
    ) &&
    !canPayPendingDisaster &&
    pendingDisasterLiquidationAssets.length ===
      0 &&
    pendingDisasterStockLiquidationAssets.length ===
      0;

  const applyDisasterResolved =
    useCallback(
      (
        payload:
          UlsanMarbleDisasterResolvedPayload,
      ): boolean => {
        const currentTurnSequence =
          networkTurnSequence ??
          turnSequence;

        if (
          payload.turnSequence !==
          currentTurnSequence
        ) {
          return false;
        }

        if (
          payload.outcome ===
          "SKIP"
        ) {
          completeTurn(
            payload
              .additionallyDisabledPlayerIds,
          );

          return true;
        }

        commitPropertyMarket(
          payload.nextMarket,
        );

        commitAuctionState({
          ...auctionStateRef.current,

          inventories:
            payload.nextAuctionInventories,
        });

        commitDisasterState(
          applyDisasterEventToState(
            disasterStateRef.current,
            payload.event,
            payload.penalties,
          ),
        );

        setPendingDisasterResolution({
          event: payload.event,
          mode: payload.mode,
          stage: "EVENT",
          currentAssessmentIndex: 0,
          additionallyDisabledPlayerIds: [
            ...payload
              .additionallyDisabledPlayerIds,
          ],
          newlyBankruptPlayerIds: [],
        });

        setDisasterPaymentError(null);
        setDisasterLiquidationError(
          null,
        );

        startDisasterPhase();

        return true;
      },
      [
        auctionStateRef,
        commitAuctionState,
        commitDisasterState,
        commitPropertyMarket,
        completeTurn,
        networkTurnSequence,
        startDisasterPhase,
        turnSequence,
      ],
    );

  const startDisasterResolution =
    useCallback(
      (
        mode:
          | "SCHEDULED"
          | "DEV",
        additionallyDisabledPlayerIds:
          string[] = [],
        forcedType?: DisasterType,
      ) => {
        const isNetworkResolution =
          Boolean(
            onNetworkGameEventRequest,
          );

        const requiresControllerPublisher =
          mode === "SCHEDULED" &&
          isNetworkResolution;

        if (
          requiresControllerPublisher &&
          controllerPlayerId !==
            localPlayerId
        ) {
          return;
        }

        const serverTurnNumber =
          networkTurnNumber ??
          turnNumber;

        const eventTurnSequence =
          networkTurnSequence ??
          turnSequence;

        const shouldStart =
          mode === "DEV" ||
          shouldTriggerDisaster(
            turnNumber,
            disasterStateRef.current
              .lastOccurredTurn,
            getPolicyDisasterChanceMultiplier(
              activeMayorPolicy,
            ),
          );

        if (!shouldStart) {
          if (
            isNetworkResolution &&
            onNetworkGameEventRequest
          ) {
            onNetworkGameEventRequest({
              kind:
                "DISASTER_RESOLVED",

              payload: {
                mode: "SCHEDULED",
                outcome: "SKIP",
                turnNumber:
                  serverTurnNumber,
                turnSequence:
                  eventTurnSequence,
                additionallyDisabledPlayerIds: [
                  ...new Set(
                    additionallyDisabledPlayerIds,
                  ),
                ],
              },
            });

            return;
          }

          completeTurn(
            additionallyDisabledPlayerIds,
          );

          return;
        }

        const disasterType =
          forcedType ??
          selectRandomDisasterType();

        const result =
          createDisasterEvent({
            type: disasterType,
            turnNumber,
            properties,
            ownerships:
              propertyOwnershipsRef.current,
            market:
              propertyMarketRef.current,
            insuranceContracts:
              insuranceContractsRef.current,
            disabledPlayerIds:
              additionallyDisabledPlayerIds,
            repairCostMultiplier:
              getPolicyDisasterRepairCostMultiplier(
                activeMayorPolicy,
              ) *
              getCityHallDisasterRepairCostMultiplier(
                getActiveCityHallTerm(
                  cityHallStateRef.current,
                  turnNumber,
                ),
              ),
          });

        let nextAuctionState =
          auctionStateRef.current;

        const supportedDamageByKey =
          new Map<string, number>();

        const supportedAssessments =
          result.event.playerAssessments.map(
            (assessment) => {
              if (
                assessment.totalAmount <=
                  0 ||
                !hasAuctionItem(
                  nextAuctionState,
                  assessment.playerId,
                  "DISASTER_SUPPORT",
                )
              ) {
                return assessment;
              }

              const consumed =
                consumeAuctionItem(
                  nextAuctionState,
                  assessment.playerId,
                  "DISASTER_SUPPORT",
                );

              if (!consumed) {
                return assessment;
              }

              nextAuctionState =
                consumed.state;

              const damages =
                assessment.damages.map(
                  (damage) => {
                    const finalRepairCost =
                      Math.max(
                        1,
                        Math.round(
                          damage.finalRepairCost *
                            0.5,
                        ),
                      );

                    supportedDamageByKey.set(
                      `${assessment.playerId}:${damage.propertyId}`,
                      finalRepairCost,
                    );

                    return {
                      ...damage,
                      finalRepairCost,
                    };
                  },
                );

              return {
                ...assessment,
                damages,
                totalAmount:
                  damages.reduce(
                    (
                      total,
                      damage,
                    ) =>
                      total +
                      damage.finalRepairCost,
                    0,
                  ),
              };
            },
          );

        const supportedPropertyDamages =
          result.event.propertyDamages.map(
            (damage) => {
              if (
                !damage.ownerPlayerId
              ) {
                return damage;
              }

              const finalRepairCost =
                supportedDamageByKey.get(
                  `${damage.ownerPlayerId}:${damage.propertyId}`,
                );

              return finalRepairCost ===
                undefined
                ? damage
                : {
                    ...damage,
                    finalRepairCost,
                  };
            },
          );

        const supportedEvent = {
          ...result.event,
          propertyDamages:
            supportedPropertyDamages,
          playerAssessments:
            supportedAssessments,
          totalRepairCost:
            supportedAssessments.reduce(
              (
                total,
                assessment,
              ) =>
                total +
                assessment.totalAmount,
              0,
            ),
        };

        if (
          isNetworkResolution &&
          onNetworkGameEventRequest
        ) {
          onNetworkGameEventRequest({
            kind:
              "DISASTER_RESOLVED",

            payload: {
              mode,
              outcome: "EVENT",
              turnNumber:
                serverTurnNumber,
              turnSequence:
                eventTurnSequence,
              additionallyDisabledPlayerIds: [
                ...new Set(
                  additionallyDisabledPlayerIds,
                ),
              ],
              event: supportedEvent,
              nextMarket:
                result.market,
              penalties:
                result.penalties,
              nextAuctionInventories:
                nextAuctionState.inventories,
            },
          });

          return;
        }

        if (
          nextAuctionState !==
          auctionStateRef.current
        ) {
          commitAuctionState(
            nextAuctionState,
          );
        }

        commitPropertyMarket(
          result.market,
        );

        commitDisasterState(
          applyDisasterEventToState(
            disasterStateRef.current,
            supportedEvent,
            result.penalties,
          ),
        );

        setPendingDisasterResolution({
          event: supportedEvent,
          mode,
          stage: "EVENT",
          currentAssessmentIndex: 0,
          additionallyDisabledPlayerIds: [
            ...new Set(
              additionallyDisabledPlayerIds,
            ),
          ],
          newlyBankruptPlayerIds: [],
        });

        setDisasterPaymentError(null);
        setDisasterLiquidationError(
          null,
        );

        startDisasterPhase();
      },
      [
        activeMayorPolicy,
        auctionStateRef,
        cityHallStateRef,
        commitAuctionState,
        commitDisasterState,
        commitPropertyMarket,
        completeTurn,
        controllerPlayerId,
        insuranceContractsRef,
        localPlayerId,
        networkTurnNumber,
        networkTurnSequence,
        onNetworkGameEventRequest,
        properties,
        propertyMarketRef,
        propertyOwnershipsRef,
        startDisasterPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const finalizeDisasterResolution =
    useCallback(
      (
        resolution:
          PendingDisasterResolution,
      ) => {
        const disabledPlayerIds = [
          ...new Set([
            ...resolution
              .additionallyDisabledPlayerIds,
            ...resolution
              .newlyBankruptPlayerIds,
          ]),
        ];

        setPendingDisasterResolution(
          null,
        );
        setDisasterPaymentError(null);
        setDisasterLiquidationError(
          null,
        );

        if (
          resolution.mode === "DEV"
        ) {
          cancelCurrentAction();
          return;
        }

        completeDisasterPhase(
          disabledPlayerIds,
        );
      },
      [
        cancelCurrentAction,
        completeDisasterPhase,
      ],
    );

  const completePendingDisasterResolution =
    useCallback(() => {
      if (
        !pendingDisasterResolution
      ) {
        return;
      }

      finalizeDisasterResolution(
        pendingDisasterResolution,
      );
    }, [
      finalizeDisasterResolution,
      pendingDisasterResolution,
    ]);

  const advancePendingDisasterSettlement =
    useCallback(
      (
        bankruptPlayerId?: string,
      ) => {
        if (
          !pendingDisasterResolution
        ) {
          setDisasterPaymentError(
            "NO_PENDING_DISASTER",
          );
          return;
        }

        const newlyBankruptPlayerIds =
          bankruptPlayerId
            ? [
                ...new Set([
                  ...pendingDisasterResolution
                    .newlyBankruptPlayerIds,
                  bankruptPlayerId,
                ]),
              ]
            : pendingDisasterResolution
                .newlyBankruptPlayerIds;

        const nextIndex =
          pendingDisasterResolution
            .currentAssessmentIndex +
          1;

        const nextResolution = {
          ...pendingDisasterResolution,
          currentAssessmentIndex:
            nextIndex,
          newlyBankruptPlayerIds,
        };

        setDisasterPaymentError(null);
        setDisasterLiquidationError(
          null,
        );

        if (
          nextIndex <
          pendingDisasterResolution
            .event
            .playerAssessments.length
        ) {
          setPendingDisasterResolution(
            nextResolution,
          );
          return;
        }

        finalizeDisasterResolution(
          nextResolution,
        );
      },
      [
        finalizeDisasterResolution,
        pendingDisasterResolution,
      ],
    );

  const publishDisasterAction =
    useCallback(
      (
        payload:
          UlsanMarbleDisasterActionDecidedPayload,
      ): boolean => {
        if (
          publishedDisasterActionIdsRef
            .current
            .has(
              payload.actionId,
            )
        ) {
          return true;
        }

        publishedDisasterActionIdsRef
          .current
          .add(
            payload.actionId,
          );

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "DISASTER_ACTION_DECIDED",
              payload,
            });

            return true;
          } catch (error) {
            publishedDisasterActionIdsRef
              .current
              .delete(
                payload.actionId,
              );

            throw error;
          }
        }

        return false;
      },
      [
        onNetworkGameEventRequest,
      ],
    );

  const applyDisasterActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleDisasterActionDecidedPayload,
      ): boolean => {
        if (
          processedDisasterActionIdsRef
            .current
            .has(
              payload.actionId,
            )
        ) {
          publishedDisasterActionIdsRef
            .current
            .delete(
              payload.actionId,
            );

          return true;
        }

        const currentTurnSequence =
          networkTurnSequence ??
          turnSequence;

        if (
          payload.turnSequence !==
          currentTurnSequence
        ) {
          return false;
        }

        const resolution =
          pendingDisasterResolution;

        if (
          !resolution ||
          resolution.event.id !==
            payload.disasterId ||
          resolution.event.turnNumber !==
            payload.turnNumber
        ) {
          return false;
        }

        if (
          payload.action ===
          "ACKNOWLEDGE"
        ) {
          if (
            resolution.stage !==
            "EVENT"
          ) {
            return false;
          }

          const expectedActorPlayerId =
            onNetworkGameEventRequest
              ? controllerPlayerId
              : activePlayerId;

          if (
            !expectedActorPlayerId ||
            payload.playerId !==
              expectedActorPlayerId
          ) {
            return false;
          }

          processedDisasterActionIdsRef
            .current
            .add(
              payload.actionId,
            );

          publishedDisasterActionIdsRef
            .current
            .delete(
              payload.actionId,
            );

          setDisasterPaymentError(
            null,
          );
          setDisasterLiquidationError(
            null,
          );

          if (
            resolution.event
              .playerAssessments
              .length === 0
          ) {
            finalizeDisasterResolution(
              resolution,
            );

            return true;
          }

          setPendingDisasterResolution({
            ...resolution,
            stage: "SETTLEMENT",
            currentAssessmentIndex: 0,
          });

          return true;
        }

        if (
          resolution.stage !==
          "SETTLEMENT"
        ) {
          return false;
        }

        const assessment =
          resolution.event
            .playerAssessments[
              resolution
                .currentAssessmentIndex
            ];

        if (
          !assessment ||
          assessment.playerId !==
            payload.playerId
        ) {
          return false;
        }

        if (
          payload.action === "PAY"
        ) {
          if (
            payload.totalAmount !==
            assessment.totalAmount
          ) {
            return false;
          }

          const playerExists =
            playersRef.current.some(
              (player) =>
                player.id ===
                assessment.playerId,
            );

          if (!playerExists) {
            setDisasterPaymentError(
              "PLAYER_NOT_FOUND",
            );
            return false;
          }

          if (
            !prepareMandatoryPayment(
              assessment.playerId,
              assessment.totalAmount,
              `${resolution.event.name} 복구비 자동 인출`,
            )
          ) {
            setDisasterPaymentError(
              "INSUFFICIENT_FUNDS",
            );
            return false;
          }

          const paymentResult =
            withdraw(
              assessment.playerId,
              assessment.totalAmount,
              "DISASTER_REPAIR",
              `${resolution.event.name} 복구비`,
            );

          if (!paymentResult.ok) {
            setDisasterPaymentError(
              paymentResult.error ===
                "INSUFFICIENT_FUNDS"
                ? "INSUFFICIENT_FUNDS"
                : "PAYMENT_FAILED",
            );
            return false;
          }

          processedDisasterActionIdsRef
            .current
            .add(
              payload.actionId,
            );

          publishedDisasterActionIdsRef
            .current
            .delete(
              payload.actionId,
            );

          advancePendingDisasterSettlement();

          return true;
        }

        if (
          payload.action ===
          "SELL_PROPERTY"
        ) {
          const property =
            properties.find(
              (item) =>
                item.id ===
                payload.propertyId,
            );

          if (!property) {
            setDisasterLiquidationError(
              "SALE_FAILED",
            );
            return false;
          }

          const saleResult =
            sellPropertyOwnership(
              propertyOwnershipsRef.current,
              payload.propertyId,
              assessment.playerId,
              property,
              propertyMarketRef.current,
              getPolicyPropertySaleRate(
                activeMayorPolicy,
              ),
            );

          if (!saleResult.ok) {
            setDisasterLiquidationError(
              saleResult.error ===
                "NOT_OWNER"
                ? "NOT_OWNER"
                : "PROPERTY_NOT_OWNED",
            );
            return false;
          }

          if (
            saleResult.salePrice !==
            payload.salePrice
          ) {
            return false;
          }

          const depositResult =
            deposit(
              assessment.playerId,
              payload.salePrice,
              "SALE",
              `${property.name} 재난 복구 자산 정리`,
            );

          if (!depositResult.ok) {
            setDisasterLiquidationError(
              "SALE_FAILED",
            );
            return false;
          }

          commitPropertyOwnerships(
            saleResult.ownerships,
          );

          commitInsuranceContracts(
            removeInsuranceContract(
              insuranceContractsRef.current,
              payload.propertyId,
            ),
          );

          processedDisasterActionIdsRef
            .current
            .add(
              payload.actionId,
            );

          publishedDisasterActionIdsRef
            .current
            .delete(
              payload.actionId,
            );

          setDisasterLiquidationError(
            null,
          );
          setDisasterPaymentError(
            null,
          );

          return true;
        }

        if (
          payload.action ===
          "SELL_STOCK"
        ) {
          const company =
            stockCompanies.find(
              (item) =>
                item.id ===
                payload.companyId,
            );

          if (!company) {
            setDisasterLiquidationError(
              "COMPANY_NOT_FOUND",
            );
            return false;
          }

          if (
            !Number.isInteger(
              payload.quantity,
            ) ||
            payload.quantity <= 0
          ) {
            setDisasterLiquidationError(
              "INVALID_STOCK_QUANTITY",
            );
            return false;
          }

          const holding =
            getStockHolding(
              stockPortfoliosRef.current,
              assessment.playerId,
              payload.companyId,
            );

          if (
            !holding ||
            holding.quantity <
              payload.quantity
          ) {
            setDisasterLiquidationError(
              "STOCK_NOT_OWNED",
            );
            return false;
          }

          if (
            holding.quantity !==
            payload.holdingBefore
          ) {
            return false;
          }

          const pricePerShare =
            getStockPrice(
              stockMarketRef.current,
              payload.companyId,
            );

          if (
            pricePerShare <= 0 ||
            pricePerShare !==
              payload.pricePerShare
          ) {
            return false;
          }

          const depositResult =
            deposit(
              assessment.playerId,
              payload.quantity *
                payload.pricePerShare,
              "STOCK_SALE",
              `${company.name} ${payload.quantity}주 재난 복구 자산 정리`,
            );

          if (!depositResult.ok) {
            setDisasterLiquidationError(
              "SALE_FAILED",
            );
            return false;
          }

          commitStockPortfolios(
            sellStockHolding(
              stockPortfoliosRef.current,
              assessment.playerId,
              payload.companyId,
              payload.quantity,
            ),
          );

          processedDisasterActionIdsRef
            .current
            .add(
              payload.actionId,
            );

          publishedDisasterActionIdsRef
            .current
            .delete(
              payload.actionId,
            );

          setDisasterLiquidationError(
            null,
          );
          setDisasterPaymentError(
            null,
          );

          return true;
        }

        const remainingPropertyAssets =
          getSellablePropertyAssets(
            propertyOwnershipsRef.current,
            properties,
            assessment.playerId,
            propertyMarketRef.current,
            getPolicyPropertySaleRate(
              activeMayorPolicy,
            ),
          );

        const remainingStockAssets =
          getSellableStockAssets(
            stockPortfoliosRef.current,
            stockCompanies,
            stockMarketRef.current,
            assessment.playerId,
          );

        if (
          remainingPropertyAssets.length >
            0 ||
          remainingStockAssets.length >
            0
        ) {
          setDisasterLiquidationError(
            "ASSETS_REMAIN",
          );
          return false;
        }

        const player =
          playersRef.current.find(
            (item) =>
              item.id ===
              assessment.playerId,
          );

        if (!player) {
          setDisasterPaymentError(
            "PLAYER_NOT_FOUND",
          );
          return false;
        }

        if (
          !settleBankAssetsForBankruptcy(
            player.id,
            `${resolution.event.name} 미납 복구비 예금 정산`,
          )
        ) {
          setDisasterLiquidationError(
            "SALE_FAILED",
          );
          return false;
        }

        const settledPlayer =
          playersRef.current.find(
            (item) =>
              item.id === player.id,
          );

        if (!settledPlayer) {
          return false;
        }

        if (
          settledPlayer.money > 0
        ) {
          const settlementResult =
            withdraw(
              settledPlayer.id,
              settledPlayer.money,
              "BANKRUPTCY",
              `${resolution.event.name} 미납 복구비 정산`,
            );

          if (!settlementResult.ok) {
            setDisasterLiquidationError(
              "SALE_FAILED",
            );
            return false;
          }
        }

        commitStockPortfolios({
          ...stockPortfoliosRef.current,
          [player.id]: {},
        });

        commitLottoState({
          ...lottoStateRef.current,
          tickets:
            lottoStateRef.current.tickets.filter(
              (ticket) =>
                ticket.playerId !==
                player.id,
            ),
        });

        commitInsuranceContracts(
          removePlayerInsuranceContracts(
            insuranceContractsRef.current,
            player.id,
          ),
        );

        commitPlayers(
          playersRef.current.map(
            (currentPlayer) =>
              currentPlayer.id ===
              player.id
                ? {
                    ...releasePlayerFromJail(
                      currentPlayer,
                    ),
                    money: 0,
                    isBankrupt: true,
                    jailEscapeCards: 0,
                  }
                : currentPlayer,
          ),
        );

        processedDisasterActionIdsRef
          .current
          .add(
            payload.actionId,
          );

        publishedDisasterActionIdsRef
          .current
          .delete(
            payload.actionId,
          );

        advancePendingDisasterSettlement(
          player.id,
        );

        return true;
      },
      [
        activeMayorPolicy,
        activePlayerId,
        advancePendingDisasterSettlement,
        commitInsuranceContracts,
        commitLottoState,
        commitPlayers,
        commitPropertyOwnerships,
        commitStockPortfolios,
        controllerPlayerId,
        deposit,
        finalizeDisasterResolution,
        insuranceContractsRef,
        lottoStateRef,
        networkTurnSequence,
        onNetworkGameEventRequest,
        playersRef,
        prepareMandatoryPayment,
        properties,
        propertyMarketRef,
        propertyOwnershipsRef,
        settleBankAssetsForBankruptcy,
        stockCompanies,
        stockMarketRef,
        stockPortfoliosRef,
        turnSequence,
        withdraw,
      ],
    );

  const sendDisasterAction =
    useCallback(
      (
        payload:
          UlsanMarbleDisasterActionDecidedPayload,
      ): boolean => {
        if (
          onNetworkGameEventRequest
        ) {
          return publishDisasterAction(
            payload,
          );
        }

        return applyDisasterActionDecided(
          payload,
        );
      },
      [
        applyDisasterActionDecided,
        onNetworkGameEventRequest,
        publishDisasterAction,
      ],
    );

  const payPendingDisasterRepair =
    useCallback(() => {
      if (
        !pendingDisasterAssessment ||
        !pendingDisasterResolution
      ) {
        setDisasterPaymentError(
          "NO_PENDING_DISASTER",
        );
        return;
      }

      if (
        onNetworkGameEventRequest &&
        pendingDisasterAssessment
          .playerId !== localPlayerId
      ) {
        return;
      }

      if (
        getPlayerLiquidBalance(
          pendingDisasterAssessment
            .playerId,
        ) <
        pendingDisasterAssessment
          .totalAmount
      ) {
        setDisasterPaymentError(
          "INSUFFICIENT_FUNDS",
        );
        return;
      }

      sendDisasterAction({
        actionId: [
          pendingDisasterResolution
            .event.id,
          pendingDisasterAssessment
            .playerId,
          "PAY",
        ].join(":"),
        disasterId:
          pendingDisasterResolution
            .event.id,
        playerId:
          pendingDisasterAssessment
            .playerId,
        turnNumber:
          pendingDisasterResolution
            .event.turnNumber,
        turnSequence:
          networkTurnSequence ??
          turnSequence,
        action: "PAY",
        totalAmount:
          pendingDisasterAssessment
            .totalAmount,
      });
    }, [
      getPlayerLiquidBalance,
      localPlayerId,
      networkTurnSequence,
      onNetworkGameEventRequest,
      pendingDisasterAssessment,
      pendingDisasterResolution,
      sendDisasterAction,
      turnSequence,
    ]);

  const sellPropertyForPendingDisaster =
    useCallback(
      (
        propertyId: string,
      ) => {
        const resolution =
          pendingDisasterResolution;

        const assessment =
          pendingDisasterAssessment;

        if (
          !resolution ||
          !assessment
        ) {
          setDisasterLiquidationError(
            "NO_PENDING_DISASTER",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          assessment.playerId !==
            localPlayerId
        ) {
          return;
        }

        const property =
          properties.find(
            (item) =>
              item.id === propertyId,
          );

        if (!property) {
          setDisasterLiquidationError(
            "SALE_FAILED",
          );
          return;
        }

        const saleResult =
          sellPropertyOwnership(
            propertyOwnershipsRef.current,
            propertyId,
            assessment.playerId,
            property,
            propertyMarketRef.current,
            getPolicyPropertySaleRate(
              activeMayorPolicy,
            ),
          );

        if (!saleResult.ok) {
          setDisasterLiquidationError(
            saleResult.error ===
              "NOT_OWNER"
              ? "NOT_OWNER"
              : "PROPERTY_NOT_OWNED",
          );
          return;
        }

        sendDisasterAction({
          actionId: [
            resolution.event.id,
            assessment.playerId,
            "SELL_PROPERTY",
            propertyId,
          ].join(":"),
          disasterId:
            resolution.event.id,
          playerId:
            assessment.playerId,
          turnNumber:
            resolution.event.turnNumber,
          turnSequence:
            networkTurnSequence ??
            turnSequence,
          action:
            "SELL_PROPERTY",
          propertyId,
          salePrice:
            saleResult.salePrice,
        });
      },
      [
        activeMayorPolicy,
        localPlayerId,
        networkTurnSequence,
        onNetworkGameEventRequest,
        pendingDisasterAssessment,
        pendingDisasterResolution,
        properties,
        propertyMarketRef,
        propertyOwnershipsRef,
        sendDisasterAction,
        turnSequence,
      ],
    );

  const sellStockForPendingDisaster =
    useCallback(
      (
        companyId: string,
        quantity: number,
      ) => {
        const resolution =
          pendingDisasterResolution;

        const assessment =
          pendingDisasterAssessment;

        if (
          !resolution ||
          !assessment
        ) {
          setDisasterLiquidationError(
            "NO_PENDING_DISASTER",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          assessment.playerId !==
            localPlayerId
        ) {
          return;
        }

        const company =
          stockCompanies.find(
            (item) =>
              item.id === companyId,
          );

        if (!company) {
          setDisasterLiquidationError(
            "COMPANY_NOT_FOUND",
          );
          return;
        }

        const safeQuantity =
          Math.trunc(quantity);

        if (safeQuantity <= 0) {
          setDisasterLiquidationError(
            "INVALID_STOCK_QUANTITY",
          );
          return;
        }

        const holding =
          getStockHolding(
            stockPortfoliosRef.current,
            assessment.playerId,
            companyId,
          );

        if (
          !holding ||
          holding.quantity <
            safeQuantity
        ) {
          setDisasterLiquidationError(
            "STOCK_NOT_OWNED",
          );
          return;
        }

        const pricePerShare =
          getStockPrice(
            stockMarketRef.current,
            companyId,
          );

        if (pricePerShare <= 0) {
          setDisasterLiquidationError(
            "SALE_FAILED",
          );
          return;
        }

        sendDisasterAction({
          actionId: [
            resolution.event.id,
            assessment.playerId,
            "SELL_STOCK",
            companyId,
            holding.quantity,
            safeQuantity,
          ].join(":"),
          disasterId:
            resolution.event.id,
          playerId:
            assessment.playerId,
          turnNumber:
            resolution.event.turnNumber,
          turnSequence:
            networkTurnSequence ??
            turnSequence,
          action: "SELL_STOCK",
          companyId,
          quantity: safeQuantity,
          pricePerShare,
          holdingBefore:
            holding.quantity,
        });
      },
      [
        localPlayerId,
        networkTurnSequence,
        onNetworkGameEventRequest,
        pendingDisasterAssessment,
        pendingDisasterResolution,
        sendDisasterAction,
        stockCompanies,
        stockMarketRef,
        stockPortfoliosRef,
        turnSequence,
      ],
    );

  const declarePendingDisasterBankruptcy =
    useCallback(() => {
      const resolution =
        pendingDisasterResolution;

      const assessment =
        pendingDisasterAssessment;

      if (
        !resolution ||
        !assessment
      ) {
        setDisasterLiquidationError(
          "NO_PENDING_DISASTER",
        );
        return;
      }

      if (
        onNetworkGameEventRequest &&
        assessment.playerId !==
          localPlayerId
      ) {
        return;
      }

      const propertyAssets =
        getSellablePropertyAssets(
          propertyOwnershipsRef.current,
          properties,
          assessment.playerId,
          propertyMarketRef.current,
          getPolicyPropertySaleRate(
            activeMayorPolicy,
          ),
        );

      const stockAssets =
        getSellableStockAssets(
          stockPortfoliosRef.current,
          stockCompanies,
          stockMarketRef.current,
          assessment.playerId,
        );

      if (
        propertyAssets.length > 0 ||
        stockAssets.length > 0
      ) {
        setDisasterLiquidationError(
          "ASSETS_REMAIN",
        );
        return;
      }

      sendDisasterAction({
        actionId: [
          resolution.event.id,
          assessment.playerId,
          "DECLARE_BANKRUPTCY",
        ].join(":"),
        disasterId:
          resolution.event.id,
        playerId:
          assessment.playerId,
        turnNumber:
          resolution.event.turnNumber,
        turnSequence:
          networkTurnSequence ??
          turnSequence,
        action:
          "DECLARE_BANKRUPTCY",
      });
    }, [
      activeMayorPolicy,
      localPlayerId,
      networkTurnSequence,
      onNetworkGameEventRequest,
      pendingDisasterAssessment,
      pendingDisasterResolution,
      properties,
      propertyMarketRef,
      propertyOwnershipsRef,
      sendDisasterAction,
      stockCompanies,
      stockMarketRef,
      stockPortfoliosRef,
      turnSequence,
    ]);

  const acknowledgePendingDisasterEvent =
    useCallback(() => {
      const resolution =
        pendingDisasterResolution;

      if (
        !resolution ||
        resolution.stage !== "EVENT"
      ) {
        return;
      }

      const actorPlayerId =
        onNetworkGameEventRequest
          ? controllerPlayerId
          : activePlayerId;

      if (!actorPlayerId) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        actorPlayerId !==
          localPlayerId
      ) {
        return;
      }

      sendDisasterAction({
        actionId: [
          resolution.event.id,
          "ACKNOWLEDGE",
        ].join(":"),
        disasterId:
          resolution.event.id,
        playerId:
          actorPlayerId,
        turnNumber:
          resolution.event.turnNumber,
        turnSequence:
          networkTurnSequence ??
          turnSequence,
        action: "ACKNOWLEDGE",
      });
    }, [
      activePlayerId,
      controllerPlayerId,
      localPlayerId,
      networkTurnSequence,
      onNetworkGameEventRequest,
      pendingDisasterResolution,
      sendDisasterAction,
      turnSequence,
    ]);

  const devRunDisaster =
    useCallback(
      (
        type: DisasterType,
      ) => {
        if (!canRunDev) {
          return;
        }

        startDisasterResolution(
          "DEV",
          [],
          type,
        );
      },
      [
        canRunDev,
        startDisasterResolution,
      ],
    );

  const devResetDisasterCooldown =
    useCallback(() => {
      if (!canRunDev) {
        return;
      }

      commitDisasterState({
        ...disasterStateRef.current,
        lastOccurredTurn: null,
      });
    }, [
      canRunDev,
      commitDisasterState,
    ]);

  const clearPendingDisasterResolution =
    useCallback(() => {
      setPendingDisasterResolution(
        null,
      );
      setDisasterPaymentError(null);
      setDisasterLiquidationError(
        null,
      );
    }, []);

  const resetDisasterResolution =
    useCallback(() => {
      const resetState =
        createInitialDisasterState();

      disasterStateRef.current =
        resetState;

      setDisasterState(resetState);

      setPendingDisasterResolution(
        null,
      );
      setDisasterPaymentError(null);
      setDisasterLiquidationError(
        null,
      );

      processedDisasterActionIdsRef
        .current
        .clear();

      publishedDisasterActionIdsRef
        .current
        .clear();
    }, []);

  return {
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
  };
}
