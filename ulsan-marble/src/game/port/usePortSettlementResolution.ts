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
  UlsanMarblePortSettlementConfirmedPayload,
  UlsanMarblePortSettlementResolvedPayload,
  UlsanMarblePortSettlementResultPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import {
  consumeAuctionItem,
  hasAuctionItem,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  getActiveCityHallTerm,
  getCityHallPortSuccessChanceDelta,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import {
  getActiveDisasterPenalties,
} from "../disaster/disasterRules";

import type {
  DisasterState,
} from "../disaster/disasterTypes";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  getActiveEconomicNews,
  getEconomicNewsPortSuccessChanceDelta,
} from "../economicNews/economicNewsRules";

import type {
  EconomicNewsState,
} from "../economicNews/economicNewsTypes";

import type {
  StockCompanyData,
  StockMarketMap,
} from "../stock/stockTypes";

import {
  getDuePortContracts,
  MAX_PORT_SETTLEMENT_HISTORY,
  PORT_CONTRACTS,
  settlePortContracts,
} from "./portRules";

import type {
  PendingPortSettlement,
  PortSettlementResult,
  PortState,
} from "./portTypes";

type DepositMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UsePortSettlementResolutionOptions {
  pendingPortSettlement:
    PendingPortSettlement | null;

  setPendingPortSettlement: Dispatch<
    SetStateAction<
      PendingPortSettlement | null
    >
  >;

  portStateRef:
    MutableRefObject<PortState>;

  auctionStateRef:
    MutableRefObject<AuctionState>;

  cityHallStateRef:
    MutableRefObject<CityHallState>;

  disasterStateRef:
    MutableRefObject<DisasterState>;

  economicNewsStateRef:
    MutableRefObject<EconomicNewsState>;

  stockMarketRef:
    MutableRefObject<StockMarketMap>;

  playersRef:
    MutableRefObject<PlayerTokenData[]>;

  stockCompanies:
    StockCompanyData[];

  localPlayerId: string;
  controllerPlayerId?: string;

  turnNumber: number;
  turnSequence: number;

  commitPortState: (
    nextState: PortState,
  ) => void;

  commitAuctionState: (
    nextState: AuctionState,
  ) => void;

  deposit:
    DepositMoney;

  startPortSettlementPhase:
    () => void;

  continueAfterPortSettlement: (
    additionallyDisabledPlayerIds:
      string[],
  ) => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createPortSettlementId(
  turnSequence: number,
  turnNumber: number,
): string {
  return [
    "PORT_SETTLEMENT",
    turnSequence,
    turnNumber,
  ].join(":");
}

function toPayloadResult(
  result:
    PortSettlementResult,
): UlsanMarblePortSettlementResultPayload {
  return {
    contract: {
      ...result.contract,
    },

    success:
      result.success,

    finalSuccessChance:
      result.finalSuccessChance,

    modifiers:
      result.modifiers.map(
        (modifier) => ({
          ...modifier,
        }),
      ),

    payoutAmount:
      result.payoutAmount,

    netProfit:
      result.netProfit,
  };
}

function fromPayloadResult(
  payload:
    UlsanMarblePortSettlementResultPayload,
): PortSettlementResult | null {
  const definition =
    PORT_CONTRACTS[
      payload.contract.type
    ];

  if (!definition) {
    return null;
  }

  return {
    contract: {
      ...payload.contract,
    },

    definition,

    success:
      payload.success,

    finalSuccessChance:
      payload.finalSuccessChance,

    modifiers:
      payload.modifiers.map(
        (modifier) => ({
          ...modifier,
        }),
      ),

    payoutAmount:
      payload.payoutAmount,

    netProfit:
      payload.netProfit,
  };
}

export function usePortSettlementResolution({
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

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  commitPortState,
  commitAuctionState,

  deposit,

  startPortSettlementPhase,
  continueAfterPortSettlement,

  onNetworkGameEventRequest,
}: UsePortSettlementResolutionOptions) {
  const settlementPublishRef =
    useRef<string | null>(null);

  const confirmPublishRef =
    useRef<string | null>(null);

  const applyPortSettlementResolved =
    useCallback(
      (
        payload:
          UlsanMarblePortSettlementResolvedPayload,
      ): boolean => {
        if (
          pendingPortSettlement
            ?.settlementId ===
          payload.settlementId
        ) {
          return true;
        }

        if (
          pendingPortSettlement
        ) {
          return false;
        }

        if (
          payload.turnNumber !==
            turnNumber ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        const results:
          PortSettlementResult[] =
          [];

        for (
          const resultPayload of
          payload.results
        ) {
          const result =
            fromPayloadResult(
              resultPayload,
            );

          if (!result) {
            return false;
          }

          results.push(result);
        }

        const allPlayersExist =
          results.every(
            (result) =>
              playersRef.current.some(
                (player) =>
                  player.id ===
                  result.contract
                    .playerId,
              ),
          );

        if (!allPlayersExist) {
          return false;
        }

        /*
         * 적하보험 소비도 확정 결과에 맞춰
         * 모든 클라이언트에 동일하게 적용한다.
         */
        let nextAuctionState =
          auctionStateRef.current;

        for (
          const playerId of
          payload
            .consumedCargoInsurancePlayerIds
        ) {
          const consumed =
            consumeAuctionItem(
              nextAuctionState,
              playerId,
              "PORT_CARGO_INSURANCE",
            );

          if (!consumed) {
            console.warn(
              "[UlsanMarble] 적하보험 소비 상태 불일치",
              {
                settlementId:
                  payload.settlementId,
                playerId,
              },
            );

            continue;
          }

          nextAuctionState =
            consumed.state;
        }

        if (
          nextAuctionState !==
          auctionStateRef.current
        ) {
          commitAuctionState(
            nextAuctionState,
          );
        }

        const settledContractIds =
          new Set(
            results.map(
              (result) =>
                result.contract.id,
            ),
          );

        const nextPortState:
          PortState = {
          activeContracts:
            payload.nextActiveContracts.map(
              (contract) => ({
                ...contract,
              }),
            ),

          settlementHistory: [
            ...results,

            ...portStateRef.current
              .settlementHistory
              .filter(
                (result) =>
                  !settledContractIds.has(
                    result.contract.id,
                  ),
              ),
          ].slice(
            0,
            MAX_PORT_SETTLEMENT_HISTORY,
          ),
        };

        commitPortState(
          nextPortState,
        );

        for (
          const result of results
        ) {
          if (
            result.payoutAmount <= 0
          ) {
            continue;
          }

          const paymentResult =
            deposit(
              result.contract.playerId,
              result.payoutAmount,
              "PORT_SETTLEMENT",
              `울산항 · ${result.definition.name} ${
                result.success
                  ? "성공"
                  : "실패 환급"
              }`,
            );

          if (!paymentResult.ok) {
            console.error(
              "[UlsanMarble] 항구 정산금 지급 실패",
              {
                settlementId:
                  payload.settlementId,

                contractId:
                  result.contract.id,

                error:
                  paymentResult.error,
              },
            );
          }
        }

        settlementPublishRef.current =
          null;

        /*
         * 정산할 계약이 없었던 경우에는
         * 모달을 열지 않고 바로 다음 단계로 간다.
         */
        if (results.length === 0) {
          setPendingPortSettlement(
            null,
          );

          continueAfterPortSettlement(
            payload
              .additionallyDisabledPlayerIds,
          );

          return true;
        }

        setPendingPortSettlement({
          settlementId:
            payload.settlementId,

          turnNumber:
            payload.turnNumber,

          turnSequence:
            payload.turnSequence,

          results,

          additionallyDisabledPlayerIds: [
            ...payload
              .additionallyDisabledPlayerIds,
          ],
        });

        startPortSettlementPhase();

        return true;
      },
      [
        auctionStateRef,
        commitAuctionState,
        commitPortState,
        continueAfterPortSettlement,
        deposit,
        pendingPortSettlement,
        playersRef,
        portStateRef,
        setPendingPortSettlement,
        startPortSettlementPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const publishPortSettlementResolved =
    useCallback(
      (
        payload:
          UlsanMarblePortSettlementResolvedPayload,
      ): void => {
        if (
          settlementPublishRef.current
        ) {
          return;
        }

        settlementPublishRef.current =
          payload.settlementId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "PORT_SETTLEMENT_RESOLVED",

              payload,
            });
          } catch (error) {
            settlementPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        const applied =
          applyPortSettlementResolved(
            payload,
          );

        if (!applied) {
          settlementPublishRef.current =
            null;
        }
      },
      [
        applyPortSettlementResolved,
        onNetworkGameEventRequest,
      ],
    );

  const startPortSettlementResolution =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ): void => {
        if (
          pendingPortSettlement
        ) {
          return;
        }

        const disabledPlayerIdSet =
          new Set(
            additionallyDisabledPlayerIds,
          );

        const activePlayerIds =
          playersRef.current
            .filter(
              (player) =>
                !player.isBankrupt &&
                !disabledPlayerIdSet.has(
                  player.id,
                ),
            )
            .map(
              (player) =>
                player.id,
            );

        const activePlayerIdSet =
          new Set(activePlayerIds);

        const cleanedState:
          PortState = {
          ...portStateRef.current,

          activeContracts:
            portStateRef.current
              .activeContracts
              .filter(
                (contract) =>
                  activePlayerIdSet.has(
                    contract.playerId,
                  ),
              ),
        };

        const dueContracts =
          getDuePortContracts(
            cleanedState,
            turnNumber,
            additionallyDisabledPlayerIds,
          );

        const settlementId =
          createPortSettlementId(
            turnSequence,
            turnNumber,
          );

        /*
        * 네트워크 항구 정산은
        * 계약 유무와 관계없이 고정 controller만 진행한다.
        *
        * 계약이 없는 경우에도 RESOLVED 이벤트를 발행해
        * 모든 클라이언트의 다음 정산 진입 시점을 맞춘다.
        */
        if (
          onNetworkGameEventRequest &&
          controllerPlayerId !==
            localPlayerId
        ) {
          return;
        }

        if (
          dueContracts.length === 0
        ) {
          publishPortSettlementResolved({
            settlementId,

            turnNumber,
            turnSequence,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            nextActiveContracts:
              cleanedState.activeContracts.map(
                (contract) => ({
                  ...contract,
                }),
              ),

            results: [],

            consumedCargoInsurancePlayerIds:
              [],
          });

          return;
        }

        const typhoonActive =
          getActiveDisasterPenalties(
            disasterStateRef.current,
            turnNumber,
          ).some(
            (penalty) =>
              penalty.disasterType ===
              "TYPHOON",
          );

        const shipbuildingCompany =
          stockCompanies.find(
            (company) =>
              company.industry ===
              "SHIPBUILDING",
          );

        const shipbuildingTrendUp =
          shipbuildingCompany
            ? (
                stockMarketRef.current[
                  shipbuildingCompany.id
                ]?.lastIndustryChangeRate ??
                0
              ) > 0
            : false;

        /*
         * Math.random은 여기서,
         * 행동 플레이어 화면에서만 실행된다.
         */
        const settlement =
          settlePortContracts(
            cleanedState,
            dueContracts,
            {
              typhoonActive,

              shipbuildingTrendUp,

              economicNewsChanceDelta:
                getEconomicNewsPortSuccessChanceDelta(
                  getActiveEconomicNews(
                    economicNewsStateRef.current,
                    turnNumber,
                  ),
                ),

              cityHallChanceDelta:
                getCityHallPortSuccessChanceDelta(
                  getActiveCityHallTerm(
                    cityHallStateRef.current,
                    turnNumber,
                  ),
                ),
            },
          );

        let simulatedAuctionState =
          auctionStateRef.current;

        const consumedCargoInsurancePlayerIds:
          string[] = [];

        const adjustedResults =
          settlement.results.map(
            (result) => {
              if (
                result.success ||
                !hasAuctionItem(
                  simulatedAuctionState,
                  result.contract
                    .playerId,
                  "PORT_CARGO_INSURANCE",
                )
              ) {
                return result;
              }

              const consumed =
                consumeAuctionItem(
                  simulatedAuctionState,
                  result.contract
                    .playerId,
                  "PORT_CARGO_INSURANCE",
                );

              if (!consumed) {
                return result;
              }

              simulatedAuctionState =
                consumed.state;

              consumedCargoInsurancePlayerIds.push(
                result.contract.playerId,
              );

              const payoutAmount =
                Math.max(
                  result.payoutAmount,

                  Math.floor(
                    result.contract
                      .investmentAmount *
                      0.8,
                  ),
                );

              return {
                ...result,

                payoutAmount,

                netProfit:
                  payoutAmount -
                  result.contract
                    .investmentAmount,

                modifiers: [
                  ...result.modifiers,

                  {
                    type:
                      "CARGO_INSURANCE" as const,

                    label:
                      "항구 적하보험",

                    chanceDelta: 0,
                  },
                ],
              };
            },
          );

        publishPortSettlementResolved({
          settlementId,

          turnNumber,
          turnSequence,

          additionallyDisabledPlayerIds: [
            ...new Set(
              additionallyDisabledPlayerIds,
            ),
          ],

          nextActiveContracts:
            settlement.state
              .activeContracts
              .map(
                (contract) => ({
                  ...contract,
                }),
              ),

          results:
            adjustedResults.map(
              toPayloadResult,
            ),

          consumedCargoInsurancePlayerIds:
            [
              ...new Set(
                consumedCargoInsurancePlayerIds,
              ),
            ],
        });
      },
    [
      controllerPlayerId,
      auctionStateRef,
      cityHallStateRef,
      commitPortState,
      continueAfterPortSettlement,
      disasterStateRef,
      economicNewsStateRef,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingPortSettlement,
      playersRef,
      portStateRef,
      publishPortSettlementResolved,
      setPendingPortSettlement,
      stockCompanies,
      stockMarketRef,
      turnNumber,
      turnSequence,
    ],
    );

  const applyPortSettlementConfirmed =
    useCallback(
      (
        payload:
          UlsanMarblePortSettlementConfirmedPayload,
      ): boolean => {
        const pending =
          pendingPortSettlement;

        if (!pending) {
          return false;
        }

        if (
          pending.settlementId !==
            payload.settlementId ||
          pending.turnNumber !==
            payload.turnNumber ||
          pending.turnSequence !==
            payload.turnSequence ||
          payload.turnNumber !==
            turnNumber ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        confirmPublishRef.current =
          null;

        setPendingPortSettlement(
          null,
        );

        continueAfterPortSettlement(
          pending
            .additionallyDisabledPlayerIds,
        );

        return true;
      },
      [
        continueAfterPortSettlement,
        pendingPortSettlement,
        setPendingPortSettlement,
        turnNumber,
        turnSequence,
      ],
    );

  const confirmPortSettlement =
    useCallback((): void => {
      const pending =
        pendingPortSettlement;

      if (!pending) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        controllerPlayerId !==
          localPlayerId
      ) {
        return;
      }

      if (
        confirmPublishRef.current ===
        pending.settlementId
      ) {
        return;
      }

      const payload:
        UlsanMarblePortSettlementConfirmedPayload =
        {
          settlementId:
            pending.settlementId,

          turnNumber:
            pending.turnNumber,

          turnSequence:
            pending.turnSequence,
        };

      confirmPublishRef.current =
        pending.settlementId;

      if (
        onNetworkGameEventRequest
      ) {
        try {
          onNetworkGameEventRequest({
            kind:
              "PORT_SETTLEMENT_CONFIRMED",

            payload,
          });
        } catch (error) {
          confirmPublishRef.current =
            null;

          throw error;
        }

        return;
      }

      const applied =
        applyPortSettlementConfirmed(
          payload,
        );

      if (!applied) {
        confirmPublishRef.current =
          null;
      }
    }, [
      controllerPlayerId,
      applyPortSettlementConfirmed,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingPortSettlement,
    ]);

  const resetPortSettlementResolution =
    useCallback((): void => {
      settlementPublishRef.current =
        null;

      confirmPublishRef.current =
        null;

      setPendingPortSettlement(
        null,
      );
    }, [
      setPendingPortSettlement,
    ]);

  return {
    startPortSettlementResolution,
    confirmPortSettlement,

    applyPortSettlementResolved,
    applyPortSettlementConfirmed,

    resetPortSettlementResolution,
  };
}