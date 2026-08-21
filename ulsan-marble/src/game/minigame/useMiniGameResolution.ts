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
  UlsanMarbleArrivalContext,
  UlsanMarbleGameEventRequest,
  UlsanMarbleMiniGameActionDecidedPayload,
  UlsanMarbleMiniGameSnapshotPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  DiceValue,
} from "../dice";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  createMiniGameParticipantOrder,
  createPendingMiniGame,
  drawMiniGame,
  getCurrentMiniGamePlayerId,
  MINI_GAME_BET_OPTIONS,
  MINI_GAME_PRIZE_AMOUNT,
  recordHighLowBet,
  recordOddEvenBet,
  recordTimingStopAttempt,
  resolveHighLowMiniGame,
  resolveOddEvenMiniGame,
  rollTargetDiceAttempt,
} from "./minigameRules";

import type {
  HighLowChoice,
  MiniGameError,
  MiniGameState,
  OddEvenChoice,
  PendingMiniGame,
} from "./minigameTypes";

type DepositMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

type WithdrawMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseMiniGameResolutionOptions {
  pendingMiniGame:
    PendingMiniGame | null;

  setPendingMiniGame:
    Dispatch<
      SetStateAction<
        PendingMiniGame | null
      >
    >;

  setMiniGameError:
    Dispatch<
      SetStateAction<
        MiniGameError | null
      >
    >;

  miniGameStateRef:
    MutableRefObject<
      MiniGameState
    >;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  commitMiniGameState: (
    nextState:
      MiniGameState,
  ) => void;

  deposit:
    DepositMoney;

  withdraw:
    WithdrawMoney;

  completeTileResolution:
    () => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createMiniGameId(
  turnSequence: number,
  arrivalPlayerId: string,
  arrivalId?: string,
): string {
  return [
    "MINIGAME",
    turnSequence,
    arrivalPlayerId,
    arrivalId ?? "LOCAL",
  ].join(":");
}

function createActionId(
  miniGameId: string,
  action: string,
): string {
  return [
    miniGameId,
    action,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join(":");
}

/*
 * shared payload와 local PendingMiniGame은
 * 의도적으로 동일한 구조를 사용한다.
 */
function toPayloadGame(
  game: PendingMiniGame,
): UlsanMarbleMiniGameSnapshotPayload {
  return game as unknown as
    UlsanMarbleMiniGameSnapshotPayload;
}

function fromPayloadGame(
  game:
    UlsanMarbleMiniGameSnapshotPayload,
): PendingMiniGame {
  return game as unknown as
    PendingMiniGame;
}

export function useMiniGameResolution({
  pendingMiniGame,
  setPendingMiniGame,
  setMiniGameError,

  miniGameStateRef,
  playersRef,

  localPlayerId,

  turnNumber,
  turnSequence,

  commitMiniGameState,

  deposit,
  withdraw,

  completeTileResolution,

  onNetworkGameEventRequest,
}: UseMiniGameResolutionOptions) {
  const pendingMiniGameRef =
    useRef<
      PendingMiniGame | null
    >(pendingMiniGame);

  pendingMiniGameRef.current =
    pendingMiniGame;

  const miniGameIdRef =
    useRef<string | null>(
      null,
    );

  const processedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedActionIdRef =
    useRef<string | null>(
      null,
    );

  const commitPendingMiniGame =
    useCallback(
      (
        nextGame:
          PendingMiniGame | null,
      ): void => {
        pendingMiniGameRef.current =
          nextGame;

        setPendingMiniGame(
          nextGame,
        );
      },
      [
        setPendingMiniGame,
      ],
    );

  const applyResultPayments =
    useCallback(
      (
        previous:
          PendingMiniGame,

        nextGame:
          PendingMiniGame,
      ): boolean => {
        if (
          previous.stage !==
            "PLAYING" ||
          nextGame.stage !==
            "RESULT"
        ) {
          return true;
        }

        if (
          nextGame.gameId ===
            "TIMING_STOP" ||
          nextGame.gameId ===
            "TARGET_DICE"
        ) {
          if (
            !nextGame.winnerPlayerId
          ) {
            return true;
          }

          const result =
            deposit(
              nextGame
                .winnerPlayerId,

              MINI_GAME_PRIZE_AMOUNT,

              "MINIGAME_PRIZE",

              "미니게임 1등 상금",
            );

          if (!result.ok) {
            setMiniGameError(
              "PAYMENT_FAILED",
            );

            return false;
          }

          return true;
        }

        for (
          const settlement of
          nextGame.settlements
        ) {
          if (
            settlement.payout <= 0
          ) {
            continue;
          }

          const result =
            deposit(
              settlement.playerId,

              settlement.payout,

              "MINIGAME_PRIZE",

              nextGame.gameId ===
                "ODD_EVEN"
                ? "홀짝 주사위 정산"
                : "하이로우 정산",
            );

          if (!result.ok) {
            setMiniGameError(
              "PAYMENT_FAILED",
            );

            return false;
          }
        }

        return true;
      },
      [
        deposit,
        setMiniGameError,
      ],
    );

  const applyMiniGameActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleMiniGameActionDecidedPayload,
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
          processedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        if (
          payload.action ===
          "START"
        ) {
          if (
            pendingMiniGameRef.current &&
            miniGameIdRef.current !==
              payload.miniGameId
          ) {
            return false;
          }

          commitMiniGameState({
            deck: {
              cycle:
                payload.nextDeck
                  .cycle,

              drawPile: [
                ...payload.nextDeck
                  .drawPile,
              ],
            },
          });

          miniGameIdRef.current =
            payload.miniGameId;

          commitPendingMiniGame(
            fromPayloadGame(
              payload.game,
            ),
          );

          setMiniGameError(null);
        } else if (
          payload.action ===
          "CLOSE"
        ) {
          const current =
            pendingMiniGameRef.current;

          if (
            !current ||
            miniGameIdRef.current !==
              payload.miniGameId ||
            current.stage !==
              "RESULT" ||
            current.arrivalPlayerId !==
              payload.playerId
          ) {
            return false;
          }

          processedActionIdsRef.current.add(
            payload.actionId,
          );

          if (
            publishedActionIdRef.current ===
            payload.actionId
          ) {
            publishedActionIdRef.current =
              null;
          }

          miniGameIdRef.current =
            null;

          commitPendingMiniGame(
            null,
          );

          setMiniGameError(null);

          completeTileResolution();

          return true;
        } else {
          const current =
            pendingMiniGameRef.current;

          if (
            !current ||
            miniGameIdRef.current !==
              payload.miniGameId ||
            current.stage !==
              "PLAYING"
          ) {
            return false;
          }

          const currentPlayerId =
            getCurrentMiniGamePlayerId(
              current,
            );

          if (
            !currentPlayerId ||
            currentPlayerId !==
              payload.playerId
          ) {
            return false;
          }

          /*
           * 배팅금은 서버 echo가 왔을 때
           * 모든 클라이언트에서 동일하게 차감.
           */
          if (
            payload.action ===
              "ODD_EVEN_BET" ||
            payload.action ===
              "HIGH_LOW_BET"
          ) {
            const payment =
              withdraw(
                payload.playerId,

                payload.amount,

                "MINIGAME_BET",

                payload.action ===
                  "ODD_EVEN_BET"
                  ? "홀짝 주사위 배팅"
                  : "하이로우 배팅",
              );

            if (!payment.ok) {
              setMiniGameError(
                payment.error ===
                  "INSUFFICIENT_FUNDS"
                  ? "INSUFFICIENT_CASH"
                  : "PAYMENT_FAILED",
              );

              return false;
            }
          }

          const nextGame =
            fromPayloadGame(
              payload.game,
            );

          if (
            !applyResultPayments(
              current,
              nextGame,
            )
          ) {
            return false;
          }

          commitPendingMiniGame(
            nextGame,
          );

          setMiniGameError(null);
        }

        processedActionIdsRef.current.add(
          payload.actionId,
        );

        if (
          publishedActionIdRef.current ===
          payload.actionId
        ) {
          publishedActionIdRef.current =
            null;
        }

        return true;
      },
      [
        applyResultPayments,
        commitMiniGameState,
        commitPendingMiniGame,
        completeTileResolution,
        setMiniGameError,
        turnNumber,
        turnSequence,
        withdraw,
      ],
    );

  const publishOrApply =
    useCallback(
      (
        payload:
          UlsanMarbleMiniGameActionDecidedPayload,
      ): boolean => {
        if (
          publishedActionIdRef.current
        ) {
          return true;
        }

        publishedActionIdRef.current =
          payload.actionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "MINI_GAME_ACTION_DECIDED",

              payload,
            });

            return true;
          } catch (error) {
            publishedActionIdRef.current =
              null;

            throw error;
          }
        }

        const applied =
          applyMiniGameActionDecided(
            payload,
          );

        if (!applied) {
          publishedActionIdRef.current =
            null;
        }

        return applied;
      },
      [
        applyMiniGameActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const startMiniGameResolution =
    useCallback(
      (
        arrivalPlayerId:
          string,

        arrival?:
          UlsanMarbleArrivalContext,
      ): boolean => {
        if (
          pendingMiniGameRef.current ||
          publishedActionIdRef.current
        ) {
          return true;
        }

        if (
          arrival &&
          (
            arrival.playerId !==
              arrivalPlayerId ||
            arrival.turnSequence !==
              turnSequence
          )
        ) {
          return false;
        }

        /*
         * START의 난수:
         * 미니게임 종류,
         * 목표 숫자,
         * 하이로우 기준 숫자.
         *
         * 도착 플레이어만 생성.
         */
        if (
          onNetworkGameEventRequest &&
          arrivalPlayerId !==
            localPlayerId
        ) {
          return true;
        }

        const drawResult =
          drawMiniGame(
            miniGameStateRef.current,
          );

        const participantIds =
          createMiniGameParticipantOrder(
            playersRef.current,
            arrivalPlayerId,
          );

        const nextGame =
          createPendingMiniGame(
            drawResult.gameId,
            arrivalPlayerId,
            participantIds,
          );

        const miniGameId =
          createMiniGameId(
            turnSequence,
            arrivalPlayerId,
            arrival?.arrivalId,
          );

        return publishOrApply({
          action: "START",

          actionId:
            createActionId(
              miniGameId,
              "START",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          game:
            toPayloadGame(
              nextGame,
            ),

          nextDeck: {
            cycle:
              drawResult
                .state.deck.cycle,

            drawPile: [
              ...drawResult
                .state.deck
                .drawPile,
            ],
          },
        });
      },
      [
        localPlayerId,
        miniGameStateRef,
        onNetworkGameEventRequest,
        playersRef,
        publishOrApply,
        turnNumber,
        turnSequence,
      ],
    );

  const getControllingPlayer =
    useCallback(
      (
        game:
          PendingMiniGame,
      ): string | null => {
        const playerId =
          getCurrentMiniGamePlayerId(
            game,
          );

        if (!playerId) {
          setMiniGameError(
            "NOT_CURRENT_PLAYER",
          );

          return null;
        }

        if (
          onNetworkGameEventRequest &&
          playerId !==
            localPlayerId
        ) {
          setMiniGameError(
            "NOT_CURRENT_PLAYER",
          );

          return null;
        }

        return playerId;
      },
      [
        localPlayerId,
        onNetworkGameEventRequest,
        setMiniGameError,
      ],
    );

  const submitTimingStop =
    useCallback(
      (
        distance: number,
        responseMs: number,
      ): void => {
        const game =
          pendingMiniGameRef.current;

        if (!game) {
          setMiniGameError(
            "NO_PENDING_MINIGAME",
          );

          return;
        }

        if (
          game.gameId !==
          "TIMING_STOP"
        ) {
          setMiniGameError(
            "WRONG_GAME",
          );

          return;
        }

        const playerId =
          getControllingPlayer(
            game,
          );

        if (!playerId) {
          return;
        }

        const nextGame =
          recordTimingStopAttempt(
            game,
            playerId,
            distance,
            responseMs,
          );

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action:
            "TIMING_STOP",

          actionId:
            createActionId(
              miniGameId,
              "TIMING_STOP",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId,
          distance,
          responseMs,

          game:
            toPayloadGame(
              nextGame,
            ),
        });
      },
      [
        getControllingPlayer,
        publishOrApply,
        setMiniGameError,
        turnNumber,
        turnSequence,
      ],
    );

  const rollTargetMiniGameDice =
    useCallback(
      (
        values:
          [DiceValue, DiceValue],
      ): void => {
        const game =
          pendingMiniGameRef.current;

        if (!game) {
          setMiniGameError(
            "NO_PENDING_MINIGAME",
          );

          return;
        }

        if (
          game.gameId !==
          "TARGET_DICE"
        ) {
          setMiniGameError(
            "WRONG_GAME",
          );

          return;
        }

        const playerId =
          getControllingPlayer(
            game,
          );

        if (!playerId) {
          return;
        }

        const nextGame =
          rollTargetDiceAttempt(
            game,
            playerId,
            values,
          );

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action:
            "TARGET_DICE",

          actionId:
            createActionId(
              miniGameId,
              "TARGET_DICE",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId,

          diceValues:
            values,

          game:
            toPayloadGame(
              nextGame,
            ),
        });
      },
      [
        getControllingPlayer,
        publishOrApply,
        setMiniGameError,
        turnNumber,
        turnSequence,
      ],
    );

  const submitOddEvenBet =
    useCallback(
      (
        choice:
          OddEvenChoice,

        amount:
          number,
      ): void => {
        const game =
          pendingMiniGameRef.current;

        if (
          !game ||
          game.gameId !==
            "ODD_EVEN"
        ) {
          setMiniGameError(
            game
              ? "WRONG_GAME"
              : "NO_PENDING_MINIGAME",
          );

          return;
        }

        const playerId =
          getControllingPlayer(
            game,
          );

        if (!playerId) {
          return;
        }

        if (
          !MINI_GAME_BET_OPTIONS.includes(
            amount as
              (typeof MINI_GAME_BET_OPTIONS)[number],
          )
        ) {
          setMiniGameError(
            "INVALID_BET",
          );

          return;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              playerId,
          );

        if (
          !player ||
          player.money < amount
        ) {
          setMiniGameError(
            "INSUFFICIENT_CASH",
          );

          return;
        }

        let nextGame =
          recordOddEvenBet(
            game,
            {
              playerId,
              choice,
              amount,
            },
          );

        if (
          nextGame.currentPlayerIndex >=
          nextGame
            .eligiblePlayerIds.length
        ) {
          nextGame =
            resolveOddEvenMiniGame(
              nextGame,
            );
        }

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action:
            "ODD_EVEN_BET",

          actionId:
            createActionId(
              miniGameId,
              "ODD_EVEN_BET",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId,
          choice,
          amount,

          game:
            toPayloadGame(
              nextGame,
            ),
        });
      },
      [
        getControllingPlayer,
        playersRef,
        publishOrApply,
        setMiniGameError,
        turnNumber,
        turnSequence,
      ],
    );

  const submitHighLowBet =
    useCallback(
      (
        choice:
          HighLowChoice,

        amount:
          number,
      ): void => {
        const game =
          pendingMiniGameRef.current;

        if (
          !game ||
          game.gameId !==
            "HIGH_LOW"
        ) {
          setMiniGameError(
            game
              ? "WRONG_GAME"
              : "NO_PENDING_MINIGAME",
          );

          return;
        }

        const playerId =
          getControllingPlayer(
            game,
          );

        if (!playerId) {
          return;
        }

        if (
          !MINI_GAME_BET_OPTIONS.includes(
            amount as
              (typeof MINI_GAME_BET_OPTIONS)[number],
          )
        ) {
          setMiniGameError(
            "INVALID_BET",
          );

          return;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              playerId,
          );

        if (
          !player ||
          player.money < amount
        ) {
          setMiniGameError(
            "INSUFFICIENT_CASH",
          );

          return;
        }

        let nextGame =
          recordHighLowBet(
            game,
            {
              playerId,
              choice,
              amount,
            },
          );

        if (
          nextGame.currentPlayerIndex >=
          nextGame
            .eligiblePlayerIds.length
        ) {
          nextGame =
            resolveHighLowMiniGame(
              nextGame,
            );
        }

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action:
            "HIGH_LOW_BET",

          actionId:
            createActionId(
              miniGameId,
              "HIGH_LOW_BET",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId,
          choice,
          amount,

          game:
            toPayloadGame(
              nextGame,
            ),
        });
      },
      [
        getControllingPlayer,
        playersRef,
        publishOrApply,
        setMiniGameError,
        turnNumber,
        turnSequence,
      ],
    );

  const passMiniGameBet =
    useCallback(
      (): void => {
        const game =
          pendingMiniGameRef.current;

        if (!game) {
          setMiniGameError(
            "NO_PENDING_MINIGAME",
          );

          return;
        }

        const playerId =
          getControllingPlayer(
            game,
          );

        if (!playerId) {
          return;
        }

        let nextGame:
          PendingMiniGame;

        if (
          game.gameId ===
          "ODD_EVEN"
        ) {
          let next =
            recordOddEvenBet(
              game,
              {
                playerId,
                choice: null,
                amount: 0,
              },
            );

          if (
            next.currentPlayerIndex >=
            next
              .eligiblePlayerIds
              .length
          ) {
            next =
              resolveOddEvenMiniGame(
                next,
              );
          }

          nextGame = next;
        } else if (
          game.gameId ===
          "HIGH_LOW"
        ) {
          let next =
            recordHighLowBet(
              game,
              {
                playerId,
                choice: null,
                amount: 0,
              },
            );

          if (
            next.currentPlayerIndex >=
            next
              .eligiblePlayerIds
              .length
          ) {
            next =
              resolveHighLowMiniGame(
                next,
              );
          }

          nextGame = next;
        } else {
          setMiniGameError(
            "WRONG_GAME",
          );

          return;
        }

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action: "PASS",

          actionId:
            createActionId(
              miniGameId,
              "PASS",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId,

          game:
            toPayloadGame(
              nextGame,
            ),
        });
      },
      [
        getControllingPlayer,
        publishOrApply,
        setMiniGameError,
        turnNumber,
        turnSequence,
      ],
    );

  const completePendingMiniGame =
    useCallback(
      (): void => {
        const game =
          pendingMiniGameRef.current;

        if (
          !game ||
          game.stage !==
            "RESULT"
        ) {
          return;
        }

        if (
          onNetworkGameEventRequest &&
          game.arrivalPlayerId !==
            localPlayerId
        ) {
          return;
        }

        const miniGameId =
          miniGameIdRef.current;

        if (!miniGameId) {
          return;
        }

        publishOrApply({
          action: "CLOSE",

          actionId:
            createActionId(
              miniGameId,
              "CLOSE",
            ),

          miniGameId,

          turnNumber,
          turnSequence,

          playerId:
            game.arrivalPlayerId,
        });
      },
      [
        localPlayerId,
        onNetworkGameEventRequest,
        publishOrApply,
        turnNumber,
        turnSequence,
      ],
    );

  const resetMiniGameResolution =
    useCallback(
      (): void => {
        miniGameIdRef.current =
          null;

        pendingMiniGameRef.current =
          null;

        processedActionIdsRef
          .current.clear();

        publishedActionIdRef.current =
          null;

        setPendingMiniGame(
          null,
        );

        setMiniGameError(
          null,
        );
      },
      [
        setMiniGameError,
        setPendingMiniGame,
      ],
    );

  return {
    startMiniGameResolution,

    submitTimingStop,
    rollTargetMiniGameDice,

    submitOddEvenBet,
    submitHighLowBet,
    passMiniGameBet,

    completePendingMiniGame,

    applyMiniGameActionDecided,

    resetMiniGameResolution,
  };
}