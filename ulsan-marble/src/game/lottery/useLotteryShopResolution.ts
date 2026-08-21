import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleLotteryActionDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  getPolicyLottoJackpotContribution,
  getPolicyScratchWinProbabilityBonus,
} from "../election/policyEffects";

import {
  createLottoTickets,
  createScratchLotteryResult,
  LOTTO_JACKPOT_CONTRIBUTION,
  LOTTO_TICKET_PRICE,
  MAX_LOTTO_PURCHASES_PER_VISIT,
  MAX_SCRATCH_PURCHASES_PER_VISIT,
  SCRATCH_TICKET_PRICE,
} from "./lotteryRules";

import type {
  LottoState,
  LotteryShopError,
  PendingLotteryShop,
} from "./lotteryTypes";

type MoneyAction = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseLotteryShopResolutionOptions {
  pendingLotteryShop:
    PendingLotteryShop | null;

  setPendingLotteryShop: Dispatch<
    SetStateAction<
      PendingLotteryShop | null
    >
  >;

  setLotteryShopError: Dispatch<
    SetStateAction<
      LotteryShopError | null
    >
  >;

  lottoStateRef:
    MutableRefObject<LottoState>;

  commitLottoState: (
    nextState: LottoState,
  ) => void;

  activeMayorPolicy:
    Parameters<
      typeof getPolicyScratchWinProbabilityBonus
    >[0];

  turnNumber: number;
  turnSequence: number;

  localPlayerId: string;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  withdraw: MoneyAction;
  deposit: MoneyAction;

  completeTileResolution: () => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createRequestKey(
  payload:
    UlsanMarbleLotteryActionDecidedPayload,
): string {
  switch (payload.action) {
    case "BUY_SCRATCH":
      return [
        payload.visitId,
        payload.action,
        payload.expectedPurchaseCount,
        payload.result.id,
      ].join(":");

    case "BUY_LOTTO":
      return [
        payload.visitId,
        payload.action,
        payload.expectedPurchaseCount,
        ...payload.tickets.map(
          (ticket) => ticket.id,
        ),
      ].join(":");

    case "CLOSE":
      return [
        payload.visitId,
        payload.action,
      ].join(":");
  }
}

export function useLotteryShopResolution({
  pendingLotteryShop,
  setPendingLotteryShop,
  setLotteryShopError,
  lottoStateRef,
  commitLottoState,
  activeMayorPolicy,
  turnNumber,
  turnSequence,
  localPlayerId,
  canPlayerAfford,
  withdraw,
  deposit,
  completeTileResolution,
  onNetworkGameEventRequest,
}: UseLotteryShopResolutionOptions) {
  const lotteryActionPublishRef =
    useRef<string | null>(null);

  /*
   * 새 방문이 시작되면
   * 이전 요청 잠금은 무조건 해제한다.
   */
  useEffect(() => {
    lotteryActionPublishRef.current =
      null;
  }, [
    pendingLotteryShop?.visitId,
  ]);

  const applyLotteryActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleLotteryActionDecidedPayload,
      ): boolean => {
        const shop =
          pendingLotteryShop;

        /*
         * 상대 화면이 아직 복권판매소
         * 도착 처리를 끝내지 못한 경우다.
         * 이벤트를 소비하지 않고 재시도한다.
         */
        if (!shop) {
          return false;
        }

        if (
          shop.playerId !==
            payload.playerId ||
          shop.visitId !==
            payload.visitId ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (payload.action === "CLOSE") {
          lotteryActionPublishRef.current =
            null;

          setPendingLotteryShop(null);
          setLotteryShopError(null);
          completeTileResolution();

          return true;
        }

        if (
          payload.action ===
          "BUY_SCRATCH"
        ) {
          /*
           * 이미 같은 결과가 반영돼 있다면
           * 중복 차감 없이 소비한다.
           */
          if (
            shop.scratchPurchaseCount ===
              payload.expectedPurchaseCount +
                1 &&
            shop.latestScratchResult?.id ===
              payload.result.id
          ) {
            lotteryActionPublishRef.current =
              null;

            return true;
          }

          if (
            shop.scratchPurchaseCount !==
              payload.expectedPurchaseCount ||
            shop.scratchPurchaseCount >=
              MAX_SCRATCH_PURCHASES_PER_VISIT
          ) {
            return false;
          }

          const purchaseResult =
            withdraw(
              payload.playerId,
              SCRATCH_TICKET_PRICE,
              "LOTTERY_PURCHASE",
              "즉석복권 1장",
            );

          if (!purchaseResult.ok) {
            console.error(
              "[UlsanMarble] 동기화된 즉석복권 구매금 차감 실패",
              {
                payload,
                error:
                  purchaseResult.error,
              },
            );

            return false;
          }

          if (
            payload.result.prizeAmount > 0
          ) {
            const prizeResult =
              deposit(
                payload.playerId,
                payload.result.prizeAmount,
                "LOTTERY_PRIZE",
                `즉석복권 ${payload.result.label}`,
              );

            if (!prizeResult.ok) {
              console.error(
                "[UlsanMarble] 동기화된 즉석복권 당첨금 지급 실패",
                {
                  payload,
                  error:
                    prizeResult.error,
                },
              );

              return false;
            }
          }

          setPendingLotteryShop(
            (current) => {
              if (
                !current ||
                current.visitId !==
                  payload.visitId ||
                current
                  .scratchPurchaseCount !==
                  payload
                    .expectedPurchaseCount
              ) {
                return current;
              }

              return {
                ...current,

                scratchPurchaseCount:
                  current
                    .scratchPurchaseCount +
                  1,

                latestScratchResult:
                  payload.result,
              };
            },
          );

          lotteryActionPublishRef.current =
            null;

          setLotteryShopError(null);

          return true;
        }

        /*
         * BUY_LOTTO
         */
        if (
          payload.tickets.length <= 0 ||
          shop.lottoPurchaseCount !==
            payload.expectedPurchaseCount ||
          shop.lottoPurchaseCount +
            payload.tickets.length >
            MAX_LOTTO_PURCHASES_PER_VISIT ||
          lottoStateRef.current
            .drawNumber !==
            payload.drawNumber
        ) {
          return false;
        }

        const purchaseCost =
          payload.tickets.length *
          LOTTO_TICKET_PRICE;

        const purchaseResult =
          withdraw(
            payload.playerId,
            purchaseCost,
            "LOTTERY_PURCHASE",
            `${payload.drawNumber}회 로또 ${payload.tickets.length}장`,
          );

        if (!purchaseResult.ok) {
          console.error(
            "[UlsanMarble] 동기화된 로또 구매금 차감 실패",
            {
              payload,
              error:
                purchaseResult.error,
            },
          );

          return false;
        }

        commitLottoState({
          ...lottoStateRef.current,

          jackpot:
            lottoStateRef.current.jackpot +
            payload.jackpotContribution,

          tickets: [
            ...lottoStateRef.current.tickets,
            ...payload.tickets,
          ],
        });

        setPendingLotteryShop(
          (current) => {
            if (
              !current ||
              current.visitId !==
                payload.visitId ||
              current.lottoPurchaseCount !==
                payload.expectedPurchaseCount
            ) {
              return current;
            }

            return {
              ...current,

              lottoPurchaseCount:
                current.lottoPurchaseCount +
                payload.tickets.length,
            };
          },
        );

        lotteryActionPublishRef.current =
          null;

        setLotteryShopError(null);

        return true;
      },
      [
        commitLottoState,
        completeTileResolution,
        deposit,
        lottoStateRef,
        pendingLotteryShop,
        setLotteryShopError,
        setPendingLotteryShop,
        turnSequence,
        withdraw,
      ],
    );

  const publishLotteryAction =
    useCallback(
      (
        payload:
          UlsanMarbleLotteryActionDecidedPayload,
      ): void => {
        const requestKey =
          createRequestKey(payload);

        if (
          lotteryActionPublishRef.current ===
          requestKey
        ) {
          return;
        }

        lotteryActionPublishRef.current =
          requestKey;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "LOTTERY_ACTION_DECIDED",
              payload,
            });
          } catch (error) {
            lotteryActionPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        const applied =
          applyLotteryActionDecided(
            payload,
          );

        if (!applied) {
          lotteryActionPublishRef.current =
            null;
        }
      },
      [
        applyLotteryActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const buyScratchTicket =
    useCallback(() => {
      const shop =
        pendingLotteryShop;

      if (!shop) {
        setLotteryShopError(
          "NO_PENDING_SHOP",
        );
        return;
      }

      if (
        onNetworkGameEventRequest &&
        shop.playerId !== localPlayerId
      ) {
        return;
      }

      if (
        shop.scratchPurchaseCount >=
        MAX_SCRATCH_PURCHASES_PER_VISIT
      ) {
        setLotteryShopError(
          "SCRATCH_LIMIT_REACHED",
        );
        return;
      }

      if (
        !canPlayerAfford(
          shop.playerId,
          SCRATCH_TICKET_PRICE,
        )
      ) {
        setLotteryShopError(
          "INSUFFICIENT_FUNDS",
        );
        return;
      }

      /*
       * 난수 결과는 구매자 화면에서
       * 단 한 번만 생성한다.
       */
      const result =
        createScratchLotteryResult(
          Math.random(),

          getPolicyScratchWinProbabilityBonus(
            activeMayorPolicy,
          ),
        );

      const payload:
        UlsanMarbleLotteryActionDecidedPayload =
        {
          action: "BUY_SCRATCH",
          playerId: shop.playerId,
          visitId: shop.visitId,
          turnSequence,

          expectedPurchaseCount:
            shop.scratchPurchaseCount,

          result,
        };

      setLotteryShopError(null);
      publishLotteryAction(payload);
    }, [
      activeMayorPolicy,
      canPlayerAfford,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingLotteryShop,
      publishLotteryAction,
      setLotteryShopError,
      turnSequence,
    ]);

  const buyLottoTickets =
    useCallback(
      (quantity: number) => {
        const shop =
          pendingLotteryShop;

        if (!shop) {
          setLotteryShopError(
            "NO_PENDING_SHOP",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          shop.playerId !==
            localPlayerId
        ) {
          return;
        }

        const safeQuantity =
          Math.trunc(quantity);

        if (safeQuantity <= 0) {
          setLotteryShopError(
            "INVALID_QUANTITY",
          );
          return;
        }

        const remainingCount =
          MAX_LOTTO_PURCHASES_PER_VISIT -
          shop.lottoPurchaseCount;

        if (
          safeQuantity >
          remainingCount
        ) {
          setLotteryShopError(
            "LOTTO_LIMIT_REACHED",
          );
          return;
        }

        const purchaseCost =
          safeQuantity *
          LOTTO_TICKET_PRICE;

        if (
          !canPlayerAfford(
            shop.playerId,
            purchaseCost,
          )
        ) {
          setLotteryShopError(
            "INSUFFICIENT_FUNDS",
          );
          return;
        }

        const drawNumber =
          lottoStateRef.current
            .drawNumber;

        /*
         * 번호와 티켓 ID도
         * 구매자 화면에서 한 번만 생성한다.
         */
        const tickets =
          createLottoTickets(
            shop.playerId,
            drawNumber,
            safeQuantity,
            turnNumber,
          );

        const jackpotContribution =
          safeQuantity *
          getPolicyLottoJackpotContribution(
            LOTTO_JACKPOT_CONTRIBUTION,
            activeMayorPolicy,
          );

        const payload:
          UlsanMarbleLotteryActionDecidedPayload =
          {
            action: "BUY_LOTTO",
            playerId: shop.playerId,
            visitId: shop.visitId,
            turnSequence,

            expectedPurchaseCount:
              shop.lottoPurchaseCount,

            drawNumber,
            jackpotContribution,
            tickets,
          };

        setLotteryShopError(null);
        publishLotteryAction(payload);
      },
      [
        activeMayorPolicy,
        canPlayerAfford,
        localPlayerId,
        lottoStateRef,
        onNetworkGameEventRequest,
        pendingLotteryShop,
        publishLotteryAction,
        setLotteryShopError,
        turnNumber,
        turnSequence,
      ],
    );

  const closeLotteryShop =
    useCallback(() => {
      const shop =
        pendingLotteryShop;

      if (!shop) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        shop.playerId !== localPlayerId
      ) {
        return;
      }

      const payload:
        UlsanMarbleLotteryActionDecidedPayload =
        {
          action: "CLOSE",
          playerId: shop.playerId,
          visitId: shop.visitId,
          turnSequence,
        };

      setLotteryShopError(null);
      publishLotteryAction(payload);
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      pendingLotteryShop,
      publishLotteryAction,
      setLotteryShopError,
      turnSequence,
    ]);

  return {
    applyLotteryActionDecided,
    buyScratchTicket,
    buyLottoTickets,
    closeLotteryShop,
  };
}