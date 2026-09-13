import {
  useCallback,
  useRef,
} from "react";

import type {
  Dispatch,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleLottoDrawConfirmedPayload,
  UlsanMarbleLottoDrawResolvedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  createLottoDraw,
} from "./lotteryRules";

import type {
  LottoDrawResolutionMode,
  LottoState,
  PendingLottoDrawResolution,
} from "./lotteryTypes";

type DepositMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseLottoDrawResolutionOptions {
  pendingLottoDrawResolution:
    PendingLottoDrawResolution | null;

  setPendingLottoDrawResolution:
    Dispatch<
      SetStateAction<
        PendingLottoDrawResolution | null
      >
    >;

  lottoStateRef: {
    current: LottoState;
  };

  playersRef: {
    current: PlayerTokenData[];
  };

  localPlayerId: string;
  controllerPlayerId?: string;

  turnNumber: number;
  turnSequence: number;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;

  commitLottoState: (
    nextState: LottoState,
  ) => void;

  deposit: DepositMoney;

  startLottoDrawPhase: () => void;

  continueAfterLottoDraw: (
    mode: LottoDrawResolutionMode,
    additionallyDisabledPlayerIds:
      string[],
  ) => void;
}

function createLottoDrawId(
  turnSequence: number,
  drawNumber: number,
  mode: LottoDrawResolutionMode,
): string {
  return [
    "LOTTO_DRAW",
    turnSequence,
    drawNumber,
    mode,
  ].join(":");
}

export function useLottoDrawResolution({
  pendingLottoDrawResolution,
  setPendingLottoDrawResolution,

  lottoStateRef,
  playersRef,

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  onNetworkGameEventRequest,

  commitLottoState,
  deposit,

  startLottoDrawPhase,
  continueAfterLottoDraw,
}: UseLottoDrawResolutionOptions) {
  const drawPublishRef =
    useRef<string | null>(null);

  const confirmPublishRef =
    useRef<string | null>(null);

  const applyLottoDrawResolved =
    useCallback(
      (
        payload:
          UlsanMarbleLottoDrawResolvedPayload,
      ): boolean => {
        /*
         * 이미 같은 추첨이 적용된 상태라면
         * 중복 지급 없이 이벤트를 소비한다.
         */
        if (
          pendingLottoDrawResolution
        ) {
          return (
            pendingLottoDrawResolution
              .drawId ===
            payload.drawId
          );
        }

        if (payload.turnSequence !== turnSequence) {
          return false;
}
        const currentState =
          lottoStateRef.current;

        if (
          currentState.drawNumber !==
            payload.result.drawNumber ||
          currentState.jackpot !==
            payload.result.jackpotBefore
        ) {
          return false;
        }

        if (
          payload.nextState.drawNumber !==
            payload.result.drawNumber + 1 ||
          payload.nextState.jackpot !==
            payload.result.jackpotAfter
        ) {
          return false;
        }

        /*
         * 당첨금 지급 대상이 존재하는지
         * 실제 상태 변경 전에 검증한다.
         */
        const allPrizePlayersExist =
          payload.result.playerPrizes.every(
            (prize) =>
              playersRef.current.some(
                (player) =>
                  player.id ===
                  prize.playerId,
              ),
          );

        if (!allPrizePlayersExist) {
          return false;
        }

        commitLottoState(
          payload.nextState,
        );

        /*
         * 이벤트에는 이미 합산된
         * 플레이어별 당첨금이 들어 있다.
         */
        for (
          const playerPrize of
          payload.result.playerPrizes
        ) {
          if (
            playerPrize.prizeAmount <= 0
          ) {
            continue;
          } 

          const result =
            deposit(
              playerPrize.playerId,
              playerPrize.prizeAmount,
              "LOTTERY_PRIZE",
              `${payload.result.drawNumber}회 로또 당첨 · ${playerPrize.winningTicketCount}장`,
            );

          if (!result.ok) {
            /*
             * 이 시점에는 플레이어 존재 여부와
             * 금액 검증이 끝났으므로 정상적으로는
             * 실패하지 않는다. 재시도하면 중복 지급될
             * 수 있으므로 이벤트 자체는 소비한다.
             */
            console.error(
              "[UlsanMarble] 로또 당첨금 지급 실패",
              {
                drawId:
                  payload.drawId,
                playerPrize,
                error:
                  result.error,
              },
            );
          }
        }

        setPendingLottoDrawResolution({
          drawId: payload.drawId,
          turnNumber: payload.turnNumber,
          turnSequence: payload.turnSequence,
          result: payload.result,
          mode: payload.mode,
          additionallyDisabledPlayerIds: [...payload.additionallyDisabledPlayerIds],
        });

        drawPublishRef.current =
          null;

        startLottoDrawPhase();

        return true;
      },
      [
        commitLottoState,
        deposit,
        lottoStateRef,
        pendingLottoDrawResolution,
        playersRef,
        setPendingLottoDrawResolution,
        startLottoDrawPhase,
        turnNumber,
        turnSequence,
      ],
    );

  const publishLottoDrawResolved =
    useCallback(
      (
        payload:
          UlsanMarbleLottoDrawResolvedPayload,
      ): void => {
        if (
          drawPublishRef.current ===
          payload.drawId
        ) {
          return;
        }

        drawPublishRef.current =
          payload.drawId;

        if (onNetworkGameEventRequest) {
          try {
            onNetworkGameEventRequest({
              kind:
                "LOTTO_DRAW_RESOLVED",
              payload,
            });
          } catch (error) {
            drawPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        const applied =
          applyLottoDrawResolved(
            payload,
          );

        if (!applied) {
          drawPublishRef.current =
            null;
        }
      },
      [
        applyLottoDrawResolved,
        onNetworkGameEventRequest,
      ],
    );

  const startLottoDrawResolution =
    useCallback(
      (
        mode:
          LottoDrawResolutionMode,

        additionallyDisabledPlayerIds:
          string[] = [],
      ): void => {
        if (
          pendingLottoDrawResolution
        ) {
          return;
        }

        /*
         * 온라인에서는 서버의 현재 플레이어만
         * 추첨 결과를 생성한다.
         *
         * 나머지 클라이언트는
         * LOTTO_DRAW_RESOLVED echo를 기다린다.
         */
        if (
          onNetworkGameEventRequest &&
          controllerPlayerId !==
            localPlayerId
        ) {
          return;
        }

        const currentState =
          lottoStateRef.current;

        const {
          nextState,
          result,
        } = createLottoDraw(
          currentState,
        );

        const drawId =
          createLottoDrawId(
            turnSequence,
            result.drawNumber,
            mode,
          );

        const payload:
          UlsanMarbleLottoDrawResolvedPayload =
          {
            drawId,

            turnNumber,
            turnSequence,

            mode,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

            nextState,
            result,
          };

        publishLottoDrawResolved(
          payload,
        );
      },
      [
        controllerPlayerId,
        localPlayerId,
        lottoStateRef,
        onNetworkGameEventRequest,
        pendingLottoDrawResolution,
        publishLottoDrawResolved,
        turnNumber,
        turnSequence,
      ],
    );

  const applyLottoDrawConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleLottoDrawConfirmedPayload,
      ): boolean => {
        const pending =
          pendingLottoDrawResolution;

        if (!pending) {
          return false;
        }

        if (
          pending.drawId !== payload.drawId ||
          pending.turnNumber !== payload.turnNumber ||
          pending.turnSequence !== payload.turnSequence ||
          payload.turnSequence !== turnSequence
        ) {
          return false;
        }

        confirmPublishRef.current =
          null;

        setPendingLottoDrawResolution(
          null,
        );

        continueAfterLottoDraw(
          pending.mode,
          pending
            .additionallyDisabledPlayerIds,
        );

        return true;
      },
      [
        continueAfterLottoDraw,
        pendingLottoDrawResolution,
        setPendingLottoDrawResolution,
        turnSequence,
      ],
    );

  const confirmLottoDraw =
    useCallback((): void => {
      const pending =
        pendingLottoDrawResolution;

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

      const payload: UlsanMarbleLottoDrawConfirmedPayload = {
        drawId: pending.drawId,
        turnNumber: pending.turnNumber,
        turnSequence: pending.turnSequence,
      };

      if (
        confirmPublishRef.current ===
        pending.drawId
      ) {
        return;
      }

      confirmPublishRef.current =
        pending.drawId;

      if (onNetworkGameEventRequest) {
        try {
          onNetworkGameEventRequest({
            kind:
              "LOTTO_DRAW_CONFIRMED",
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
        applyLottoDrawConfirmed(
          payload,
        );

      if (!applied) {
        confirmPublishRef.current =
          null;
      }
    }, [
      controllerPlayerId,
      applyLottoDrawConfirmed,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingLottoDrawResolution,
      turnNumber,
      turnSequence,
    ]);

  const canConfirmLottoDraw =
    Boolean(pendingLottoDrawResolution) &&
    (!onNetworkGameEventRequest || controllerPlayerId === localPlayerId);

  const resetLottoDrawResolution =
    useCallback((): void => {
      drawPublishRef.current =
        null;

      confirmPublishRef.current =
        null;

      setPendingLottoDrawResolution(
        null,
      );
    }, [
      setPendingLottoDrawResolution,
    ]);

  return {
    startLottoDrawResolution,
    confirmLottoDraw,
    canConfirmLottoDraw,

    applyLottoDrawResolved,
    applyLottoDrawConfirmed,

    resetLottoDrawResolution,
  };
}