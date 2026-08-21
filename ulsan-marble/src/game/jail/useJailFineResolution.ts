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
  UlsanMarbleJailFineActionDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  PropertyData,
} from "../../types";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

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
} from "./jailRules";

import type {
  JailActionError,
  JailLiquidationError,
  PendingJailFine,
} from "./jailTypes";

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

interface UseJailFineResolutionOptions {
  pendingJailFine:
    PendingJailFine | null;

  setPendingJailFine:
    Dispatch<
      SetStateAction<
        PendingJailFine | null
      >
    >;

  setJailActionError:
    Dispatch<
      SetStateAction<
        JailActionError | null
      >
    >;

  setJailLiquidationError:
    Dispatch<
      SetStateAction<
        JailLiquidationError | null
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

  lottoStateRef:
    MutableRefObject<
      LottoState
    >;

  insuranceContractsRef:
    MutableRefObject<
      InsuranceContractMap
    >;

  properties:
    PropertyData[];

  stockCompanies:
    StockCompanyData[];

  activeMayorPolicy:
    Parameters<
      typeof getPolicyPropertySaleRate
    >[0];

  localPlayerId: string;
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

  deposit:
    MoneyOperation;

  withdraw:
    MoneyOperation;

  getPlayerLiquidBalance: (
    playerId: string,
  ) => number;

  prepareMandatoryPayment: (
    playerId: string,
    amount: number,
    memo: string,
  ) => boolean;

  settleBankAssetsForBankruptcy: (
    playerId: string,
    memo: string,
  ) => boolean;

  finishJailTurn: (
    additionallyDisabledPlayerIds?:
      string[],
  ) => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

export function useJailFineResolution({
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

  localPlayerId,
  turnSequence,

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
}: UseJailFineResolutionOptions) {
  const pendingFineRef =
    useRef<
      PendingJailFine | null
    >(pendingJailFine);

  const appliedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  useEffect(() => {
    pendingFineRef.current =
      pendingJailFine;
  }, [
    pendingJailFine,
  ]);

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
      [properties],
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
      [stockCompanies],
    );

  const commitPendingFine =
    useCallback(
      (
        next:
          PendingJailFine | null,
      ) => {
        pendingFineRef.current =
          next;

        setPendingJailFine(
          next,
        );
      },
      [setPendingJailFine],
    );

  const canInteractWithPendingJailFine =
    Boolean(
      pendingJailFine &&
      (
        !onNetworkGameEventRequest ||
        pendingJailFine.playerId ===
          localPlayerId
      )
    );

  const finishAction =
    useCallback(
      (
        payload:
          UlsanMarbleJailFineActionDecidedPayload,
      ) => {
        appliedActionIdsRef.current.add(
          payload.actionId,
        );

        publishedActionIdsRef.current.delete(
          payload.actionId,
        );

        setJailActionError(null);
        setJailLiquidationError(null);
      },
      [
        setJailActionError,
        setJailLiquidationError,
      ],
    );

  const applyJailFineActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleJailFineActionDecidedPayload,
      ): boolean => {
        if (
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        const fine =
          pendingFineRef.current;

        if (
          !fine ||
          fine.fineId !==
            payload.fineId ||
          fine.playerId !==
            payload.playerId ||
          fine.amount !==
            payload.amount ||
          fine.turnSequence !==
            payload.turnSequence
        ) {
          return false;
        }

        if (
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          payload.action ===
          "PAY"
        ) {
          if (
            !prepareMandatoryPayment(
              fine.playerId,
              fine.amount,
              "구치소 강제 출소 벌금 자동 인출",
            )
          ) {
            setJailLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const result =
            withdraw(
              fine.playerId,
              fine.amount,
              "EVENT",
              "구치소 강제 출소 벌금",
            );

          if (!result.ok) {
            setJailLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          commitPlayers(
            playersRef.current.map(
              (candidate) =>
                candidate.id ===
                fine.playerId
                  ? releasePlayerFromJail(
                      candidate,
                    )
                  : candidate,
            ),
          );

          commitPendingFine(null);
          finishAction(payload);
          finishJailTurn();

          return true;
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
            setJailLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const result =
            sellPropertyOwnership(
              propertyOwnershipsRef.current,
              payload.propertyId,
              fine.playerId,
              property,
              propertyMarketRef.current,
              getPolicyPropertySaleRate(
                activeMayorPolicy,
              ),
            );

          if (!result.ok) {
            setJailLiquidationError(
              result.error ===
                "NOT_OWNER"
                ? "NOT_OWNER"
                : "PROPERTY_NOT_OWNED",
            );

            return false;
          }

          if (
            result.salePrice !==
            payload.salePrice
          ) {
            return false;
          }

          const depositResult =
            deposit(
              fine.playerId,
              payload.salePrice,
              "SALE",
              `${property.name} 매각 · 구치소 벌금 정리`,
            );

          if (!depositResult.ok) {
            setJailLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          commitPropertyOwnerships(
            result.ownerships,
          );

          commitInsuranceContracts(
            removeInsuranceContract(
              insuranceContractsRef.current,
              payload.propertyId,
            ),
          );

          finishAction(payload);

          return true;
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
            setJailLiquidationError(
              "COMPANY_NOT_FOUND",
            );

            return false;
          }

          const holding =
            getStockHolding(
              stockPortfoliosRef.current,
              fine.playerId,
              payload.companyId,
            );

          if (
            !holding ||
            holding.quantity !==
              payload.holdingBefore ||
            holding.quantity <
              payload.quantity
          ) {
            setJailLiquidationError(
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

          const depositResult =
            deposit(
              fine.playerId,

              payload.quantity *
                payload.pricePerShare,

              "STOCK_SALE",

              `${company.name} ${payload.quantity}주 · 구치소 벌금 정리`,
            );

          if (!depositResult.ok) {
            setJailLiquidationError(
              "SALE_FAILED",
            );

            return false;
          }

          const nextPortfolios =
            sellStockHolding(
              stockPortfoliosRef.current,
              fine.playerId,
              payload.companyId,
              payload.quantity,
            );

          commitStockPortfolios(
            nextPortfolios,
          );

          finishAction(payload);

          return true;
        }

        const remainingPropertyAssets =
          getSellablePropertyAssets(
            propertyOwnershipsRef.current,
            properties,
            fine.playerId,
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
            fine.playerId,
          );

        if (
          remainingPropertyAssets.length >
            0 ||
          remainingStockAssets.length >
            0
        ) {
          setJailLiquidationError(
            "ASSETS_REMAIN",
          );

          return false;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              fine.playerId,
          );

        if (!player) {
          setJailLiquidationError(
            "SALE_FAILED",
          );

          return false;
        }

        if (
          !settleBankAssetsForBankruptcy(
            player.id,
            "구치소 벌금 미납 예금 정산",
          )
        ) {
          setJailLiquidationError(
            "SALE_FAILED",
          );

          return false;
        }

        const settledPlayer =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              player.id,
          );

        if (!settledPlayer) {
          return false;
        }

        if (
          settledPlayer.money > 0
        ) {
          const result =
            withdraw(
              settledPlayer.id,
              settledPlayer.money,
              "BANKRUPTCY",
              "구치소 벌금 미납 현금 몰수",
            );

          if (!result.ok) {
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
            lottoStateRef.current
              .tickets
              .filter(
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
            (candidate) =>
              candidate.id ===
              player.id
                ? {
                    ...releasePlayerFromJail(
                      candidate,
                    ),

                    money: 0,
                    isBankrupt: true,
                    jailEscapeCards: 0,
                  }
                : candidate,
          ),
        );

        commitPendingFine(null);
        finishAction(payload);

        finishJailTurn([
          player.id,
        ]);

        return true;
      },
      [
        activeMayorPolicy,
        commitInsuranceContracts,
        commitLottoState,
        commitPendingFine,
        commitPlayers,
        commitPropertyOwnerships,
        commitStockPortfolios,
        deposit,
        finishAction,
        finishJailTurn,
        insuranceContractsRef,
        lottoStateRef,
        playersRef,
        prepareMandatoryPayment,
        properties,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        setJailLiquidationError,
        settleBankAssetsForBankruptcy,
        stockCompanies,
        stockCompanyMap,
        stockMarketRef,
        stockPortfoliosRef,
        turnSequence,
        withdraw,
      ],
    );

  const sendAction =
    useCallback(
      (
        payload:
          UlsanMarbleJailFineActionDecidedPayload,
      ) => {
        if (
          publishedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return;
        }

        publishedActionIdsRef.current.add(
          payload.actionId,
        );

        if (
          onNetworkGameEventRequest
        ) {
          onNetworkGameEventRequest({
            kind:
              "JAIL_FINE_ACTION_DECIDED",

            payload,
          });

          return;
        }

        const applied =
          applyJailFineActionDecided(
            payload,
          );

        if (!applied) {
          publishedActionIdsRef.current.delete(
            payload.actionId,
          );
        }
      },
      [
        applyJailFineActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const getOwnedFine =
    useCallback(() => {
      const fine =
        pendingFineRef.current;

      if (!fine) {
        setJailLiquidationError(
          "NO_PENDING_FINE",
        );

        return null;
      }

      if (
        onNetworkGameEventRequest &&
        fine.playerId !==
          localPlayerId
      ) {
        return null;
      }

      return fine;
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      setJailLiquidationError,
    ]);

  const payPendingJailFine =
    useCallback(() => {
      const fine =
        getOwnedFine();

      if (!fine) {
        return;
      }

      if (
        getPlayerLiquidBalance(
          fine.playerId,
        ) <
        fine.amount
      ) {
        setJailLiquidationError(
          "SALE_FAILED",
        );

        return;
      }

      sendAction({
        actionId: [
          fine.fineId,
          "PAY",
        ].join(":"),

        fineId:
          fine.fineId,

        playerId:
          fine.playerId,

        amount:
          fine.amount,

        turnSequence:
          fine.turnSequence,

        action: "PAY",
      });
    }, [
      getOwnedFine,
      getPlayerLiquidBalance,
      sendAction,
      setJailLiquidationError,
    ]);

  const sellPropertyForPendingJailFine =
    useCallback(
      (
        propertyId: string,
      ) => {
        const fine =
          getOwnedFine();

        if (!fine) {
          return;
        }

        const property =
          propertyMap.get(
            propertyId,
          );

        if (!property) {
          setJailLiquidationError(
            "SALE_FAILED",
          );

          return;
        }

        const preview =
          sellPropertyOwnership(
            propertyOwnershipsRef.current,
            propertyId,
            fine.playerId,
            property,
            propertyMarketRef.current,
            getPolicyPropertySaleRate(
              activeMayorPolicy,
            ),
          );

        if (!preview.ok) {
          setJailLiquidationError(
            preview.error ===
              "NOT_OWNER"
              ? "NOT_OWNER"
              : "PROPERTY_NOT_OWNED",
          );

          return;
        }

        sendAction({
          actionId: [
            fine.fineId,
            "SELL_PROPERTY",
            propertyId,
          ].join(":"),

          fineId:
            fine.fineId,

          playerId:
            fine.playerId,

          amount:
            fine.amount,

          turnSequence:
            fine.turnSequence,

          action:
            "SELL_PROPERTY",

          propertyId,

          salePrice:
            preview.salePrice,
        });
      },
      [
        activeMayorPolicy,
        getOwnedFine,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        sendAction,
        setJailLiquidationError,
      ],
    );

  const sellStockForPendingJailFine =
    useCallback(
      (
        companyId: string,
        quantity: number,
      ) => {
        const fine =
          getOwnedFine();

        if (!fine) {
          return;
        }

        const safeQuantity =
          Math.trunc(quantity);

        if (
          safeQuantity <= 0
        ) {
          setJailLiquidationError(
            "INVALID_STOCK_QUANTITY",
          );

          return;
        }

        const holding =
          getStockHolding(
            stockPortfoliosRef.current,
            fine.playerId,
            companyId,
          );

        if (
          !holding ||
          holding.quantity <
            safeQuantity
        ) {
          setJailLiquidationError(
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
          setJailLiquidationError(
            "SALE_FAILED",
          );

          return;
        }

        sendAction({
          actionId: [
            fine.fineId,
            "SELL_STOCK",
            companyId,
            holding.quantity,
            safeQuantity,
          ].join(":"),

          fineId:
            fine.fineId,

          playerId:
            fine.playerId,

          amount:
            fine.amount,

          turnSequence:
            fine.turnSequence,

          action:
            "SELL_STOCK",

          companyId,

          quantity:
            safeQuantity,

          pricePerShare,

          holdingBefore:
            holding.quantity,
        });
      },
      [
        getOwnedFine,
        sendAction,
        setJailLiquidationError,
        stockMarketRef,
        stockPortfoliosRef,
      ],
    );

  const declarePendingJailBankruptcy =
    useCallback(() => {
      const fine =
        getOwnedFine();

      if (!fine) {
        return;
      }

      const remainingPropertyAssets =
        getSellablePropertyAssets(
          propertyOwnershipsRef.current,
          properties,
          fine.playerId,
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
          fine.playerId,
        );

      if (
        remainingPropertyAssets.length >
          0 ||
        remainingStockAssets.length >
          0
      ) {
        setJailLiquidationError(
          "ASSETS_REMAIN",
        );

        return;
      }

      sendAction({
        actionId: [
          fine.fineId,
          "DECLARE_BANKRUPTCY",
        ].join(":"),

        fineId:
          fine.fineId,

        playerId:
          fine.playerId,

        amount:
          fine.amount,

        turnSequence:
          fine.turnSequence,

        action:
          "DECLARE_BANKRUPTCY",
      });
    }, [
      activeMayorPolicy,
      getOwnedFine,
      properties,
      propertyMarketRef,
      propertyOwnershipsRef,
      sendAction,
      setJailLiquidationError,
      stockCompanies,
      stockMarketRef,
      stockPortfoliosRef,
    ]);

  const resetJailFineResolution =
    useCallback(() => {
      pendingFineRef.current =
        null;

      commitPendingFine(null);

      appliedActionIdsRef.current.clear();
      publishedActionIdsRef.current.clear();

      setJailActionError(null);
      setJailLiquidationError(null);
    }, [
      commitPendingFine,
      setJailActionError,
      setJailLiquidationError,
    ]);

  return {
    canInteractWithPendingJailFine,

    payPendingJailFine,

    sellPropertyForPendingJailFine,
    sellStockForPendingJailFine,

    declarePendingJailBankruptcy,

    applyJailFineActionDecided,

    resetJailFineResolution,
  };
}