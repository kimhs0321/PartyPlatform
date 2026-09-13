import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  UlsanMarbleBankActionDecidedPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {NetworkGameEventApplyResult,} from "../network/useNetworkGameEvents";

import {
  addGeneralDeposit,
  getGeneralDepositBalance,
  getRecurringSavingsContract,
  getRecurringSavingsProduct,
  openRecurringSavingsContract,
  subtractGeneralDeposit,
} from "./bankRules";

import type {
  BankNoticeData,
  BankShopError,
  BankState,
  PendingBankShop,
  RecurringSavingsProductId,
} from "./bankTypes";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

interface UseBankShopResolutionOptions {
  pendingBankShop:
    PendingBankShop | null;

  setPendingBankShop:
    Dispatch<
      SetStateAction<
        PendingBankShop | null
      >
    >;

  setBankShopError:
    Dispatch<
      SetStateAction<
        BankShopError | null
      >
    >;

  bankStateRef:
    MutableRefObject<BankState>;

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  getPlayerLiquidBalance: (
    playerId: string,
  ) => number;

  prepareMandatoryPayment: (
    playerId: string,
    amount: number,
    memo: string,
  ) => boolean;

  withdraw: (
    playerId: string,
    amount: number,
    reason: TransactionReason,
    memo?: string,
  ) => MoneyOperationResult;

  deposit: (
    playerId: string,
    amount: number,
    reason: TransactionReason,
    memo?: string,
  ) => MoneyOperationResult;

  commitBankState: (
    state: BankState,
  ) => void;

  enqueueBankNotice: (
    title: string,
    message: string,
    tone: BankNoticeData["tone"],
  ) => void;

  completeTileResolution:
    () => void;
}

function createBankActionKey(
  payload:
    UlsanMarbleBankActionDecidedPayload,
): string {
  switch (payload.action) {
    case "DEPOSIT":
    case "WITHDRAW":
      return [
        payload.action,
        payload.turnSequence,
        payload.visitId,
        payload.playerId,
        payload.amount,
      ].join(":");

    case "START_SAVINGS":
      return [
        payload.action,
        payload.turnSequence,
        payload.visitId,
        payload.playerId,
        payload.productId,
        payload.openedTurn,
      ].join(":");

    case "CLOSE":
      return [
        payload.action,
        payload.turnSequence,
        payload.visitId,
        payload.playerId,
      ].join(":");
  }
}

export function useBankShopResolution({
  pendingBankShop,
  setPendingBankShop,
  setBankShopError,

  bankStateRef,

  localPlayerId,

  turnNumber,
  turnSequence,

  onNetworkGameEventRequest,

  canPlayerAfford,
  getPlayerLiquidBalance,
  prepareMandatoryPayment,

  withdraw,
  deposit,

  commitBankState,
  enqueueBankNotice,

  completeTileResolution,
}: UseBankShopResolutionOptions) {
  /*
   * 서버 echo가 돌아오기 전에
   * 다른 은행 요청을 연속 발행하지 않도록 막는다.
   */
  const bankActionPublishRef =
    useRef<string | null>(null);

  const applyBankActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleBankActionDecidedPayload,
      ): NetworkGameEventApplyResult => {

       const pending =
        pendingBankShop;

      /*
      * 서버 이벤트가 로컬 은행 도착 상태보다
      * 먼저 도착할 수 있다.
      */
      if (!pending) {
        console.log(
          "[BANK ACTION WAIT]",
          "action =", payload.action,
          "player =", payload.playerId,
          "visitId =", payload.visitId,
        );

        return "WAIT";
      }

      /*
      * 로컬 턴 lifecycle이 아직 서버 이벤트의
      * 턴까지 도달하지 않았다.
      */
      if (
        payload.turnSequence !==
        turnSequence
      ) {
        console.log(
          "[BANK ACTION WAIT TURN]",
          "payloadSeq =",
          payload.turnSequence,
          "localSeq =",
          turnSequence,
        );

        return "WAIT";
      }

      /*
      * 같은 턴인데 은행 방문 자체가 다르면
      * 실제 상태 불일치다.
      */
      if (
        pending.playerId !==
          payload.playerId ||
        pending.visitId !==
          payload.visitId
      ) {
        console.warn(
          "[BANK ACTION INVALID VISIT]",
          {
            pendingPlayerId:
              pending.playerId,
            payloadPlayerId:
              payload.playerId,
            pendingVisitId:
              pending.visitId,
            payloadVisitId:
              payload.visitId,
          },
        );

        return "INVALID";
      }

        const finishAction = () => {
          bankActionPublishRef.current =
            null;

          setBankShopError(null);
        };

        const failAction = (
          error: BankShopError,
        ): NetworkGameEventApplyResult => {
          bankActionPublishRef.current =
            null;

          setBankShopError(error);

          console.warn(
            "[BANK ACTION INVALID]",
            "action =", payload.action,
            "error =", error,
          );

          return "INVALID";
        };

        switch (payload.action) {
          case "DEPOSIT": {
            const amount =
              Math.trunc(payload.amount);

            if (amount <= 0) {
              return failAction(
                "INVALID_AMOUNT",
              );
            }

            const payment =
              withdraw(
                payload.playerId,
                amount,
                "BANK_DEPOSIT",
                "은행 일반예금 예치",
              );

            if (!payment.ok) {
              return failAction(
                payment.error ===
                  "INSUFFICIENT_FUNDS"
                  ? "INSUFFICIENT_CASH"
                  : "NO_PENDING_BANK",
              );
            }

            commitBankState(
              addGeneralDeposit(
                bankStateRef.current,
                payload.playerId,
                amount,
              ),
            );

            finishAction();
            return "APPLIED";
          }

          case "WITHDRAW": {
            const amount =
              Math.trunc(payload.amount);

            if (amount <= 0) {
              return failAction(
                "INVALID_AMOUNT",
              );
            }

            const nextBankState =
              subtractGeneralDeposit(
                bankStateRef.current,
                payload.playerId,
                amount,
              );

            if (!nextBankState) {
              return failAction(
                "INSUFFICIENT_DEPOSIT",
              );
            }

            const cashResult =
              deposit(
                payload.playerId,
                amount,
                "BANK_WITHDRAWAL",
                "은행 일반예금 인출",
              );

            if (!cashResult.ok) {
              return failAction(
                "NO_PENDING_BANK",
              );
            }

            commitBankState(
              nextBankState,
            );

            finishAction();
            return "APPLIED";
          }

          case "START_SAVINGS": {
            if (
              payload.openedTurn !==
              turnNumber
            ) {
              console.log(
                "[BANK SAVINGS WAIT TURN]",
                "openedTurn =",
                payload.openedTurn,
                "localTurn =",
                turnNumber,
              );

              return "WAIT";
            }

            const playerId =
              payload.playerId;

            if (
              getRecurringSavingsContract(
                bankStateRef.current,
                playerId,
              )
            ) {
              return failAction(
                "ACTIVE_SAVINGS_EXISTS",
              );
            }

            const product =
              getRecurringSavingsProduct(
                payload.productId,
              );

            if (!product) {
              return failAction(
                "UNKNOWN_PRODUCT",
              );
            }

            if (
              getPlayerLiquidBalance(
                playerId,
              ) <
              product.installmentAmount
            ) {
              return failAction(
                "INSUFFICIENT_LIQUID_FUNDS",
              );
            }

            /*
             * 현금이 부족하지만 일반예금까지 합치면
             * 납입 가능한 경우 예금을 현금으로 이동한다.
             */
            const prepared =
              prepareMandatoryPayment(
                playerId,
                product.installmentAmount,
                `${product.name} 가입 1회차 납입 부족분`,
              );

            if (!prepared) {
              return failAction(
                "INSUFFICIENT_LIQUID_FUNDS",
              );
            }

            const payment =
              withdraw(
                playerId,
                product.installmentAmount,
                "SAVINGS_PAYMENT",
                `${product.name} 가입 1회차`,
              );

            if (!payment.ok) {
              return failAction(
                "INSUFFICIENT_LIQUID_FUNDS",
              );
            }

            commitBankState(
              openRecurringSavingsContract(
                bankStateRef.current,
                playerId,
                product,
                payload.openedTurn,
              ),
            );

            enqueueBankNotice(
              `${product.name} 가입`,
              `1/${product.installmentCount}회 · ${product.installmentAmount.toLocaleString(
                "ko-KR",
              )}만원 납입`,
              "NEUTRAL",
            );

            finishAction();
            return "APPLIED";
          }

          case "CLOSE": {
            bankActionPublishRef.current =
              null;

            setPendingBankShop(null);
            setBankShopError(null);

            completeTileResolution();

            return "APPLIED";
          }
        }
      },
      [
        bankStateRef,
        commitBankState,
        completeTileResolution,
        deposit,
        enqueueBankNotice,
        getPlayerLiquidBalance,
        pendingBankShop,
        prepareMandatoryPayment,
        setBankShopError,
        setPendingBankShop,
        turnNumber,
        turnSequence,
        withdraw,
      ],
    );

  const publishBankAction =
    useCallback(
      (
        payload:
          UlsanMarbleBankActionDecidedPayload,
      ): void => {
        /*
         * 은행에서는 한 방문 중 여러 번 거래할 수 있지만
         * 한 번에 하나의 요청만 처리한다.
         */
        if (
          bankActionPublishRef.current
        ) {
          return;
        }

        const requestKey =
          createBankActionKey(payload);

        bankActionPublishRef.current =
          requestKey;

        if (onNetworkGameEventRequest) {
          try {
            onNetworkGameEventRequest({
              kind:
                "BANK_ACTION_DECIDED",
              payload,
            });
          } catch (error) {
            bankActionPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        const result =
          applyBankActionDecided(
            payload,
          );

        if (
          result !== "APPLIED" &&
          result !== "ALREADY_APPLIED"
        ) {
          bankActionPublishRef.current =
            null;
        }
      },
      [
        applyBankActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const depositPendingBank =
    useCallback(
      (amount: number): void => {
        const pending =
          pendingBankShop;

        if (!pending) {
          setBankShopError(
            "NO_PENDING_BANK",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          pending.playerId !==
            localPlayerId
        ) {
          return;
        }

        const safeAmount =
          Math.trunc(amount);

        if (safeAmount <= 0) {
          setBankShopError(
            "INVALID_AMOUNT",
          );
          return;
        }

        if (
          !canPlayerAfford(
            pending.playerId,
            safeAmount,
          )
        ) {
          setBankShopError(
            "INSUFFICIENT_CASH",
          );
          return;
        }

        setBankShopError(null);

        publishBankAction({
          action: "DEPOSIT",

          playerId:
            pending.playerId,

          visitId:
            pending.visitId,

          turnSequence,

          amount:
            safeAmount,
        });
      },
      [
        canPlayerAfford,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingBankShop,
        publishBankAction,
        setBankShopError,
        turnSequence,
      ],
    );

  const withdrawPendingBank =
    useCallback(
      (amount: number): void => {
        const pending =
          pendingBankShop;

        if (!pending) {
          setBankShopError(
            "NO_PENDING_BANK",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          pending.playerId !==
            localPlayerId
        ) {
          return;
        }

        const safeAmount =
          Math.trunc(amount);

        if (safeAmount <= 0) {
          setBankShopError(
            "INVALID_AMOUNT",
          );
          return;
        }

        if (
          getGeneralDepositBalance(
            bankStateRef.current,
            pending.playerId,
          ) < safeAmount
        ) {
          setBankShopError(
            "INSUFFICIENT_DEPOSIT",
          );
          return;
        }

        setBankShopError(null);

        publishBankAction({
          action: "WITHDRAW",

          playerId:
            pending.playerId,

          visitId:
            pending.visitId,

          turnSequence,

          amount:
            safeAmount,
        });
      },
      [
        bankStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingBankShop,
        publishBankAction,
        setBankShopError,
        turnSequence,
      ],
    );

  const startPendingSavings =
    useCallback(
      (
        productId:
          RecurringSavingsProductId,
      ): void => {
        const pending =
          pendingBankShop;

        if (!pending) {
          setBankShopError(
            "NO_PENDING_BANK",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          pending.playerId !==
            localPlayerId
        ) {
          return;
        }

        const playerId =
          pending.playerId;

        if (
          getRecurringSavingsContract(
            bankStateRef.current,
            playerId,
          )
        ) {
          setBankShopError(
            "ACTIVE_SAVINGS_EXISTS",
          );
          return;
        }

        const product =
          getRecurringSavingsProduct(
            productId,
          );

        if (!product) {
          setBankShopError(
            "UNKNOWN_PRODUCT",
          );
          return;
        }

        if (
          getPlayerLiquidBalance(
            playerId,
          ) <
          product.installmentAmount
        ) {
          setBankShopError(
            "INSUFFICIENT_LIQUID_FUNDS",
          );
          return;
        }

        setBankShopError(null);

        publishBankAction({
          action:
            "START_SAVINGS",

          playerId,

          visitId:
            pending.visitId,

          turnSequence,

          productId,

          openedTurn:
            turnNumber,
        });
      },
      [
        bankStateRef,
        getPlayerLiquidBalance,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingBankShop,
        publishBankAction,
        setBankShopError,
        turnNumber,
        turnSequence,
      ],
    );

  const closeBankShop =
    useCallback((): void => {
      const pending =
        pendingBankShop;

      if (!pending) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        pending.playerId !==
          localPlayerId
      ) {
        return;
      }

      setBankShopError(null);

      publishBankAction({
        action: "CLOSE",

        playerId:
          pending.playerId,

        visitId:
          pending.visitId,

        turnSequence,
      });
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      pendingBankShop,
      publishBankAction,
      setBankShopError,
      turnSequence,
    ]);

  const resetBankShopResolution =
    useCallback((): void => {
      bankActionPublishRef.current =
        null;

      setPendingBankShop(null);
      setBankShopError(null);
    }, [
      setBankShopError,
      setPendingBankShop,
    ]);

  return {
    depositPendingBank,
    withdrawPendingBank,
    startPendingSavings,
    closeBankShop,

    applyBankActionDecided,
    resetBankShopResolution,
  };
}