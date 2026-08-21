import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleTaxActionDecidedPayload,
  UlsanMarbleTaxSettlementStartedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  PropertyData,
} from "../../types";

import {
  applyTaxDiscountItems,
  consumeAuctionItem,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  applyCityHallPropertyTaxSupports,
  getActiveCityHallTerm,
  getCityHallTaxMultiplier,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "./economyTypes";

import {
  createTaxAssessments,
} from "./tax";

import type {
  PendingTaxSettlement,
  TaxAssessment,
  TaxLiquidationError,
  TaxPaymentError,
} from "./taxTypes";

import {
  getPolicyPropertySaleRate,
  getPolicyTaxMultiplier,
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

type MoneyOperation = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseTaxSettlementResolutionOptions {
  pendingTaxSettlement:
    PendingTaxSettlement | null;

  setPendingTaxSettlement:
    Dispatch<
      SetStateAction<
        PendingTaxSettlement | null
      >
    >;

  setTaxPaymentError:
    Dispatch<
      SetStateAction<
        TaxPaymentError | null
      >
    >;

  setTaxLiquidationError:
    Dispatch<
      SetStateAction<
        TaxLiquidationError | null
      >
    >;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  propertyOwnershipsRef:
    MutableRefObject<
      PropertyOwnershipMap
    >;

  propertyMarketRef:
    MutableRefObject<
      PropertyMarketMap
    >;

  stockPortfoliosRef:
    MutableRefObject<
      StockPortfolioMap
    >;

  stockMarketRef:
    MutableRefObject<
      StockMarketMap
    >;

  insuranceContractsRef:
    MutableRefObject<
      InsuranceContractMap
    >;

  lottoStateRef:
    MutableRefObject<
      LottoState
    >;

  cityHallStateRef:
    MutableRefObject<
      CityHallState
    >;

  auctionStateRef:
    MutableRefObject<
      AuctionState
    >;

  properties:
    PropertyData[];

  stockCompanies:
    StockCompanyData[];

  activeMayorPolicy:
    Parameters<
      typeof getPolicyTaxMultiplier
    >[0];

  localPlayerId: string;
  activePlayerId: string;

  turnNumber: number;
  turnSequence: number;

  commitPlayers: (
    next: PlayerTokenData[],
  ) => void;

  commitPropertyOwnerships: (
    next:
      PropertyOwnershipMap,
  ) => void;

  commitStockPortfolios: (
    next:
      StockPortfolioMap,
  ) => void;

  commitLottoState: (
    next: LottoState,
  ) => void;

  commitInsuranceContracts: (
    next:
      InsuranceContractMap,
  ) => void;

  commitCityHallState: (
    next:
      CityHallState,
  ) => void;

  commitAuctionState: (
    next:
      AuctionState,
  ) => void;

  getPlayerLiquidBalance: (
    playerId: string,
  ) => number;

  deposit:
    MoneyOperation;

  withdraw:
    MoneyOperation;

  prepareMandatoryPayment: (
    playerId: string,
    amount: number,
    memo: string,
  ) => boolean;

  settleBankAssetsForBankruptcy: (
    playerId: string,
    memo: string,
  ) => boolean;

  startTaxSettlementPhase:
    () => void;

  startPropertyMarketResolution: (
    mode:
      "SCHEDULED" | "DEV",
    additionallyDisabledPlayerIds?:
      string[],
  ) => boolean | void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createSettlementId(
  turnSequence: number,
  settlementTurn: number,
): string {
  return [
    "tax",
    turnSequence,
    settlementTurn,
  ].join("-");
}

export function useTaxSettlementResolution({
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

  localPlayerId,
  activePlayerId,

  turnNumber,
  turnSequence,

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

  startTaxSettlementPhase,
  startPropertyMarketResolution,

  onNetworkGameEventRequest,
}: UseTaxSettlementResolutionOptions) {
  const pendingSettlementRef =
    useRef<
      PendingTaxSettlement | null
    >(pendingTaxSettlement);

  const appliedSettlementIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const processedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedSettlementIdRef =
    useRef<string | null>(
      null,
    );

  const publishedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  useEffect(() => {
    pendingSettlementRef.current =
      pendingTaxSettlement;
  }, [
    pendingTaxSettlement,
  ]);

  const commitPendingSettlement =
    useCallback(
      (
        next:
          PendingTaxSettlement |
          null,
      ) => {
        pendingSettlementRef.current =
          next;

        setPendingTaxSettlement(
          next,
        );
      },
      [
        setPendingTaxSettlement,
      ],
    );

  const currentAssessment =
    useMemo(() => {
      if (!pendingTaxSettlement) {
        return null;
      }

      return (
        pendingTaxSettlement
          .assessments[
            pendingTaxSettlement
              .currentIndex
          ] ?? null
      );
    }, [
      pendingTaxSettlement,
    ]);

  const canInteractWithPendingTax =
    Boolean(currentAssessment) &&
    (
      !onNetworkGameEventRequest ||
      currentAssessment?.playerId ===
        localPlayerId
    );

  const propertyMap =
    useMemo(
      () =>
        new Map(
          properties.map(
            (property) => [
              property.id,
              property,
            ],
          ),
        ),
      [
        properties,
      ],
    );

  const stockCompanyMap =
    useMemo(
      () =>
        new Map(
          stockCompanies.map(
            (company) => [
              company.id,
              company,
            ],
          ),
        ),
      [
        stockCompanies,
      ],
    );

  const advanceSettlement =
    useCallback(
      (
        settlement:
          PendingTaxSettlement,
        bankruptPlayerId?:
          string,
      ) => {
        const newlyBankruptPlayerIds =
          bankruptPlayerId
            ? [
                ...new Set([
                  ...settlement
                    .newlyBankruptPlayerIds,

                  bankruptPlayerId,
                ]),
              ]
            : settlement
                .newlyBankruptPlayerIds;

        const nextIndex =
          settlement.currentIndex +
          1;

        setTaxPaymentError(null);
        setTaxLiquidationError(
          null,
        );

        if (
          nextIndex <
          settlement
            .assessments
            .length
        ) {
          commitPendingSettlement({
            ...settlement,

            currentIndex:
              nextIndex,

            newlyBankruptPlayerIds,
          });

          return;
        }

        commitPendingSettlement(
          null,
        );

        startPropertyMarketResolution(
          "SCHEDULED",
          newlyBankruptPlayerIds,
        );
      },
      [
        commitPendingSettlement,
        setTaxLiquidationError,
        setTaxPaymentError,
        startPropertyMarketResolution,
      ],
    );

  const applyTaxSettlementStarted =
    useCallback(
      (
        payload:
          UlsanMarbleTaxSettlementStartedPayload,
      ): boolean => {
        if (
          payload.settlementTurn !==
            turnNumber ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          appliedSettlementIdsRef
            .current
            .has(
              payload.settlementId,
            )
        ) {
          return true;
        }

        const currentPending =
          pendingSettlementRef.current;

        if (
          currentPending &&
          currentPending
            .settlementId !==
            payload.settlementId
        ) {
          return false;
        }

        /*
         * 먼저 결과만 계산하고,
         * 모든 검증이 끝난 다음
         * 실제 상태를 commit한다.
         */
        const cityHallResult =
          applyCityHallPropertyTaxSupports(
            cityHallStateRef.current,
            payload.rawAssessments as
              TaxAssessment[],
          );

        let nextAuctionState =
          auctionStateRef.current;

        for (
          const playerId of
          payload.discountedPlayerIds
        ) {
          const consumed =
            consumeAuctionItem(
              nextAuctionState,
              playerId,
              "TAX_DISCOUNT",
            );

          if (!consumed) {
            return false;
          }

          nextAuctionState =
            consumed.state;
        }

        if (
          cityHallResult.state !==
          cityHallStateRef.current
        ) {
          commitCityHallState(
            cityHallResult.state,
          );
        }

        if (
          nextAuctionState !==
          auctionStateRef.current
        ) {
          commitAuctionState(
            nextAuctionState,
          );
        }

        appliedSettlementIdsRef
          .current
          .add(
            payload.settlementId,
          );

        if (
          publishedSettlementIdRef
            .current ===
          payload.settlementId
        ) {
          publishedSettlementIdRef
            .current =
            null;
        }

        setTaxPaymentError(null);
        setTaxLiquidationError(
          null,
        );

        if (
          payload.assessments
            .length === 0
        ) {
          commitPendingSettlement(
            null,
          );

          startPropertyMarketResolution(
            "SCHEDULED",

            payload
              .additionallyDisabledPlayerIds,
          );

          return true;
        }

        commitPendingSettlement({
          settlementId:
            payload.settlementId,

          settlementTurn:
            payload.settlementTurn,

          turnSequence:
            payload.turnSequence,

          assessments:
            payload.assessments as
              TaxAssessment[],

          currentIndex:
            0,

          newlyBankruptPlayerIds: [
            ...new Set(
              payload
                .additionallyDisabledPlayerIds,
            ),
          ],
        });

        startTaxSettlementPhase();

        return true;
      },
      [
        auctionStateRef,
        cityHallStateRef,
        commitAuctionState,
        commitCityHallState,
        commitPendingSettlement,
        setTaxLiquidationError,
        setTaxPaymentError,
        startPropertyMarketResolution,
        startTaxSettlementPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const startTaxSettlementResolution =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ): boolean => {
        if (
          pendingSettlementRef.current
        ) {
          return true;
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        /*
         * 세금 정산 자체는
         * 서버 active player가 한 번만 계산한다.
         */
        if (
          isNetworkGame &&
          activePlayerId !==
            localPlayerId
        ) {
          return true;
        }

        if (
          publishedSettlementIdRef.current
        ) {
          return true;
        }

        const disabledPlayerIdSet =
          new Set(
            additionallyDisabledPlayerIds,
          );

        const taxPlayers =
          playersRef.current.map(
            (player) =>
              disabledPlayerIdSet.has(
                player.id,
              )
                ? {
                    ...player,
                    isBankrupt: true,
                  }
                : player,
          );

        const rawAssessments =
          createTaxAssessments(
            taxPlayers,

            propertyOwnershipsRef
              .current,

            properties,

            propertyMarketRef
              .current,

            turnNumber,

            getPolicyTaxMultiplier(
              activeMayorPolicy,
            ) *
              getCityHallTaxMultiplier(
                getActiveCityHallTerm(
                  cityHallStateRef
                    .current,

                  turnNumber,
                ),
              ),
          );

        /*
         * 아직 commit하지 않는다.
         * authority도 서버 echo를 받아
         * 동일한 경로로 적용한다.
         */
        const cityHallResult =
          applyCityHallPropertyTaxSupports(
            cityHallStateRef.current,
            rawAssessments,
          );

        const taxDiscountResult =
          applyTaxDiscountItems(
            auctionStateRef.current,

            cityHallResult
              .assessments,
          );

        const settlementId =
          createSettlementId(
            turnSequence,
            turnNumber,
          );

        const payload:
          UlsanMarbleTaxSettlementStartedPayload =
          {
            settlementId,

            settlementTurn:
              turnNumber,

            turnSequence,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            rawAssessments,

            assessments:
              taxDiscountResult
                .assessments,

            discountedPlayerIds:
              taxDiscountResult
                .discountedPlayerIds,
          };

        publishedSettlementIdRef.current =
          settlementId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "TAX_SETTLEMENT_STARTED",

              payload,
            });

            return true;
          } catch (error) {
            publishedSettlementIdRef.current =
              null;

            throw error;
          }
        }

        const applied =
          applyTaxSettlementStarted(
            payload,
          );

        if (!applied) {
          publishedSettlementIdRef.current =
            null;
        }

        return applied;
      },
      [
        activeMayorPolicy,
        activePlayerId,
        applyTaxSettlementStarted,
        auctionStateRef,
        cityHallStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        playersRef,
        properties,
        propertyMarketRef,
        propertyOwnershipsRef,
        turnNumber,
        turnSequence,
      ],
    );

  const publishTaxAction =
    useCallback(
      (
        payload:
          UlsanMarbleTaxActionDecidedPayload,
      ): boolean => {
        if (
          publishedActionIdsRef
            .current
            .has(
              payload.actionId,
            )
        ) {
          return true;
        }

        publishedActionIdsRef
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
                "TAX_ACTION_DECIDED",

              payload,
            });

            return true;
          } catch (error) {
            publishedActionIdsRef
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

  const applyTaxActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleTaxActionDecidedPayload,
      ): boolean => {
        if (
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          processedActionIdsRef
            .current
            .has(
              payload.actionId,
            )
        ) {
          return true;
        }

        const settlement =
          pendingSettlementRef.current;

        if (
          !settlement ||
          settlement.settlementId !==
            payload.settlementId ||
          settlement.settlementTurn !==
            payload.settlementTurn ||
          settlement.turnSequence !==
            payload.turnSequence
        ) {
          return false;
        }

        const assessment =
          settlement.assessments[
            settlement.currentIndex
          ];

        if (
          !assessment ||
          assessment.playerId !==
            payload.taxpayerId
        ) {
          return false;
        }

        let shouldAdvance =
          false;

        let bankruptPlayerId:
          string |
          undefined;

        if (
          payload.action ===
          "PAY"
        ) {
          if (
            payload.totalAmount !==
            assessment.totalAmount
          ) {
            return false;
          }

          const taxpayerExists =
            playersRef.current.some(
              (player) =>
                player.id ===
                assessment.playerId,
            );

          if (!taxpayerExists) {
            setTaxPaymentError(
              "PLAYER_NOT_FOUND",
            );

            return false;
          }

          if (
            !prepareMandatoryPayment(
              assessment.playerId,
              assessment.totalAmount,
              `${assessment.settlementTurn}턴 정기 세금 자동 인출`,
            )
          ) {
            setTaxPaymentError(
              "INSUFFICIENT_FUNDS",
            );

            return false;
          }

          const paymentResult =
            withdraw(
              assessment.playerId,
              assessment.totalAmount,
              "TAX",
              `${assessment.settlementTurn}턴 정기 세금`,
            );

          if (
            !paymentResult.ok
          ) {
            setTaxPaymentError(
              paymentResult.error ===
                "INSUFFICIENT_FUNDS"
                ? "INSUFFICIENT_FUNDS"
                : "PAYMENT_FAILED",
            );

            return false;
          }

          shouldAdvance = true;
        }

        if (
          payload.action ===
          "SELL_PROPERTY"
        ) {
          const property =
            propertyMap.get(
              payload.propertyId,
            );

          if (!property) {
            setTaxLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const saleResult =
            sellPropertyOwnership(
              propertyOwnershipsRef
                .current,

              payload.propertyId,

              assessment.playerId,

              property,

              propertyMarketRef
                .current,

              getPolicyPropertySaleRate(
                activeMayorPolicy,
              ),
            );

          if (!saleResult.ok) {
            setTaxLiquidationError(
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
              `${property.name} 매각`,
            );

          if (!depositResult.ok) {
            setTaxLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          commitPropertyOwnerships(
            saleResult.ownerships,
          );

          commitInsuranceContracts(
            removeInsuranceContract(
              insuranceContractsRef
                .current,

              payload.propertyId,
            ),
          );
        }

        if (
          payload.action ===
          "SELL_STOCK"
        ) {
          const company =
            stockCompanyMap.get(
              payload.companyId,
            );

          if (!company) {
            setTaxLiquidationError(
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
            setTaxLiquidationError(
              "INVALID_STOCK_QUANTITY",
            );

            return false;
          }

          const holding =
            getStockHolding(
              stockPortfoliosRef
                .current,

              assessment.playerId,

              payload.companyId,
            );

          if (
            !holding ||
            holding.quantity <
              payload.quantity
          ) {
            setTaxLiquidationError(
              "STOCK_NOT_OWNED",
            );

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

          const saleAmount =
            payload.quantity *
            payload.pricePerShare;

          const depositResult =
            deposit(
              assessment.playerId,
              saleAmount,
              "STOCK_SALE",
              `${company.name} ${payload.quantity}주 매각`,
            );

          if (!depositResult.ok) {
            setTaxLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const nextPortfolios =
            sellStockHolding(
              stockPortfoliosRef
                .current,

              assessment.playerId,

              payload.companyId,

              payload.quantity,
            );

          if (!nextPortfolios) {
            setTaxLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          commitStockPortfolios(
            nextPortfolios,
          );
        }

        if (
          payload.action ===
          "DECLARE_BANKRUPTCY"
        ) {
          const propertyAssets =
            getSellablePropertyAssets(
              propertyOwnershipsRef
                .current,

              properties,

              assessment.playerId,

              propertyMarketRef
                .current,

              getPolicyPropertySaleRate(
                activeMayorPolicy,
              ),
            );

          const stockAssets =
            getSellableStockAssets(
              stockPortfoliosRef
                .current,

              stockCompanies,

              stockMarketRef.current,

              assessment.playerId,
            );

          if (
            propertyAssets.length >
              0 ||
            stockAssets.length > 0
          ) {
            setTaxLiquidationError(
              "ASSETS_REMAIN",
            );

            return false;
          }

          if (
            !settleBankAssetsForBankruptcy(
              assessment.playerId,
              `${assessment.settlementTurn}턴 세금 파산 정산`,
            )
          ) {
            setTaxLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const taxpayer =
            playersRef.current.find(
              (player) =>
                player.id ===
                assessment.playerId,
            );

          if (!taxpayer) {
            setTaxPaymentError(
              "PLAYER_NOT_FOUND",
            );

            return false;
          }

          if (taxpayer.money > 0) {
            const withdrawalResult =
              withdraw(
                taxpayer.id,
                taxpayer.money,
                "BANKRUPTCY",
                `${assessment.settlementTurn}턴 세금 파산 잔여 현금 정산`,
              );

            if (
              !withdrawalResult.ok
            ) {
              setTaxLiquidationError(
                "SALE_FAILED",
              );

              return false;
            }
          }

          commitStockPortfolios({
            ...stockPortfoliosRef
              .current,

            [taxpayer.id]: {},
          });

          commitLottoState({
            ...lottoStateRef.current,

            tickets:
              lottoStateRef.current
                .tickets
                .filter(
                  (ticket) =>
                    ticket.playerId !==
                    taxpayer.id,
                ),
          });

          commitInsuranceContracts(
            removePlayerInsuranceContracts(
              insuranceContractsRef
                .current,

              taxpayer.id,
            ),
          );

          commitPlayers(
            playersRef.current.map(
              (player) =>
                player.id ===
                taxpayer.id
                  ? {
                      ...releasePlayerFromJail(
                        player,
                      ),

                      money: 0,

                      isBankrupt:
                        true,

                      jailEscapeCards:
                        0,
                    }
                  : player,
            ),
          );

          bankruptPlayerId =
            taxpayer.id;

          shouldAdvance =
            true;
        }

        processedActionIdsRef
          .current
          .add(
            payload.actionId,
          );

        publishedActionIdsRef
          .current
          .delete(
            payload.actionId,
          );

        setTaxLiquidationError(
          null,
        );

        setTaxPaymentError(
          null,
        );

        if (shouldAdvance) {
          advanceSettlement(
            settlement,
            bankruptPlayerId,
          );
        }

        return true;
      },
      [
        activeMayorPolicy,
        advanceSettlement,
        commitInsuranceContracts,
        commitLottoState,
        commitPlayers,
        commitPropertyOwnerships,
        commitStockPortfolios,
        deposit,
        insuranceContractsRef,
        lottoStateRef,
        playersRef,
        prepareMandatoryPayment,
        properties,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        setTaxLiquidationError,
        setTaxPaymentError,
        settleBankAssetsForBankruptcy,
        stockCompanies,
        stockCompanyMap,
        stockMarketRef,
        stockPortfoliosRef,
        turnSequence,
        withdraw,
      ],
    );

  /*
   * 로컬 모드에서 publish helper가
   * 서버를 거치지 않으므로 바로 apply한다.
   */
  const sendAction =
    useCallback(
      (
        payload:
          UlsanMarbleTaxActionDecidedPayload,
      ): boolean => {
        if (
          onNetworkGameEventRequest
        ) {
          return publishTaxAction(
            payload,
          );
        }

        return applyTaxActionDecided(
          payload,
        );
      },
      [
        applyTaxActionDecided,
        onNetworkGameEventRequest,
        publishTaxAction,
      ],
    );

  const payPendingTax =
    useCallback(() => {
      const settlement =
        pendingSettlementRef.current;

      if (!settlement) {
        setTaxPaymentError(
          "NO_PENDING_TAX",
        );

        return;
      }

      const assessment =
        settlement.assessments[
          settlement.currentIndex
        ];

      if (!assessment) {
        setTaxPaymentError(
          "NO_PENDING_TAX",
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

      const taxpayerExists =
        playersRef.current.some(
          (player) =>
            player.id ===
            assessment.playerId,
        );

      if (!taxpayerExists) {
        setTaxPaymentError(
          "PLAYER_NOT_FOUND",
        );

        return;
      }

      /*
       * publish 전에 예금 인출 등의
       * 상태 변경은 하지 않는다.
       */
      if (
        getPlayerLiquidBalance(
          assessment.playerId,
        ) <
        assessment.totalAmount
      ) {
        setTaxPaymentError(
          "INSUFFICIENT_FUNDS",
        );

        return;
      }

      const actionId = [
        settlement.settlementId,
        assessment.playerId,
        "PAY",
      ].join(":");

      sendAction({
        actionId,

        settlementId:
          settlement.settlementId,

        taxpayerId:
          assessment.playerId,

        settlementTurn:
          settlement.settlementTurn,

        turnSequence:
          settlement.turnSequence,

        action: "PAY",

        totalAmount:
          assessment.totalAmount,
      });
    },
    [
      getPlayerLiquidBalance,
      localPlayerId,
      onNetworkGameEventRequest,
      playersRef,
      sendAction,
      setTaxPaymentError,
    ],
  );

  const sellPropertyForPendingTax =
    useCallback(
      (
        propertyId: string,
      ) => {
        const settlement =
          pendingSettlementRef.current;

        if (!settlement) {
          setTaxLiquidationError(
            "NO_PENDING_TAX",
          );

          return;
        }

        const assessment =
          settlement.assessments[
            settlement.currentIndex
          ];

        if (!assessment) {
          setTaxLiquidationError(
            "NO_PENDING_TAX",
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
          propertyMap.get(
            propertyId,
          );

        if (!property) {
          setTaxLiquidationError(
            "SALE_FAILED",
          );

          return;
        }

        const preview =
          sellPropertyOwnership(
            propertyOwnershipsRef
              .current,

            propertyId,

            assessment.playerId,

            property,

            propertyMarketRef
              .current,

            getPolicyPropertySaleRate(
              activeMayorPolicy,
            ),
          );

        if (!preview.ok) {
          setTaxLiquidationError(
            preview.error ===
              "NOT_OWNER"
              ? "NOT_OWNER"
              : "PROPERTY_NOT_OWNED",
          );

          return;
        }

        const actionId = [
          settlement.settlementId,
          assessment.playerId,
          "SELL_PROPERTY",
          propertyId,
        ].join(":");

        sendAction({
          actionId,

          settlementId:
            settlement.settlementId,

          taxpayerId:
            assessment.playerId,

          settlementTurn:
            settlement.settlementTurn,

          turnSequence:
            settlement.turnSequence,

          action:
            "SELL_PROPERTY",

          propertyId,

          salePrice:
            preview.salePrice,
        });
      },
      [
        activeMayorPolicy,
        localPlayerId,
        onNetworkGameEventRequest,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        sendAction,
        setTaxLiquidationError,
      ],
    );

  const sellStockForPendingTax =
    useCallback(
      (
        companyId: string,
        quantity: number,
      ) => {
        const settlement =
          pendingSettlementRef.current;

        if (!settlement) {
          setTaxLiquidationError(
            "NO_PENDING_TAX",
          );

          return;
        }

        const assessment =
          settlement.assessments[
            settlement.currentIndex
          ];

        if (!assessment) {
          setTaxLiquidationError(
            "NO_PENDING_TAX",
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
          stockCompanyMap.get(
            companyId,
          );

        if (!company) {
          setTaxLiquidationError(
            "COMPANY_NOT_FOUND",
          );

          return;
        }

        const safeQuantity =
          Math.trunc(quantity);

        if (
          safeQuantity <= 0
        ) {
          setTaxLiquidationError(
            "INVALID_STOCK_QUANTITY",
          );

          return;
        }

        const holding =
          getStockHolding(
            stockPortfoliosRef
              .current,

            assessment.playerId,

            companyId,
          );

        if (
          !holding ||
          holding.quantity <
            safeQuantity
        ) {
          setTaxLiquidationError(
            "STOCK_NOT_OWNED",
          );

          return;
        }

        const pricePerShare =
          getStockPrice(
            stockMarketRef.current,
            companyId,
          );

        if (
          pricePerShare <= 0
        ) {
          setTaxLiquidationError(
            "SALE_FAILED",
          );

          return;
        }

        /*
         * 보유량을 actionId에 넣어
         * 같은 종목을 연속으로 여러 번
         * 매도할 수 있게 한다.
         */
        const actionId = [
          settlement.settlementId,
          assessment.playerId,
          "SELL_STOCK",
          companyId,
          holding.quantity,
          safeQuantity,
        ].join(":");

        sendAction({
          actionId,

          settlementId:
            settlement.settlementId,

          taxpayerId:
            assessment.playerId,

          settlementTurn:
            settlement.settlementTurn,

          turnSequence:
            settlement.turnSequence,

          action:
            "SELL_STOCK",

          companyId,

          quantity:
            safeQuantity,

          pricePerShare,
        });
      },
      [
        localPlayerId,
        onNetworkGameEventRequest,
        sendAction,
        setTaxLiquidationError,
        stockCompanyMap,
        stockMarketRef,
        stockPortfoliosRef,
      ],
    );

  const declarePendingTaxBankruptcy =
    useCallback(() => {
      const settlement =
        pendingSettlementRef.current;

      if (!settlement) {
        setTaxLiquidationError(
          "NO_PENDING_TAX",
        );

        return;
      }

      const assessment =
        settlement.assessments[
          settlement.currentIndex
        ];

      if (!assessment) {
        setTaxLiquidationError(
          "NO_PENDING_TAX",
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
          propertyOwnershipsRef
            .current,

          properties,

          assessment.playerId,

          propertyMarketRef
            .current,

          getPolicyPropertySaleRate(
            activeMayorPolicy,
          ),
        );

      const stockAssets =
        getSellableStockAssets(
          stockPortfoliosRef
            .current,

          stockCompanies,

          stockMarketRef.current,

          assessment.playerId,
        );

      if (
        propertyAssets.length >
          0 ||
        stockAssets.length > 0
      ) {
        setTaxLiquidationError(
          "ASSETS_REMAIN",
        );

        return;
      }

      const actionId = [
        settlement.settlementId,
        assessment.playerId,
        "DECLARE_BANKRUPTCY",
      ].join(":");

      sendAction({
        actionId,

        settlementId:
          settlement.settlementId,

        taxpayerId:
          assessment.playerId,

        settlementTurn:
          settlement.settlementTurn,

        turnSequence:
          settlement.turnSequence,

        action:
          "DECLARE_BANKRUPTCY",
      });
    }, [
      activeMayorPolicy,
      localPlayerId,
      onNetworkGameEventRequest,
      properties,
      propertyMarketRef,
      propertyOwnershipsRef,
      sendAction,
      setTaxLiquidationError,
      stockCompanies,
      stockMarketRef,
      stockPortfoliosRef,
    ]);

  const resetTaxSettlementResolution =
    useCallback(() => {
      pendingSettlementRef.current =
        null;

      commitPendingSettlement(
        null,
      );

      setTaxPaymentError(
        null,
      );

      setTaxLiquidationError(
        null,
      );

      appliedSettlementIdsRef
        .current
        .clear();

      processedActionIdsRef
        .current
        .clear();

      publishedSettlementIdRef.current =
        null;

      publishedActionIdsRef
        .current
        .clear();
    }, [
      commitPendingSettlement,
      setTaxLiquidationError,
      setTaxPaymentError,
    ]);

  return {
    canInteractWithPendingTax,

    startTaxSettlementResolution,

    payPendingTax,
    sellPropertyForPendingTax,
    sellStockForPendingTax,
    declarePendingTaxBankruptcy,

    applyTaxSettlementStarted,
    applyTaxActionDecided,

    resetTaxSettlementResolution,
  };
}