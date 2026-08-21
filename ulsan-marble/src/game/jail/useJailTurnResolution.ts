import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleJailTurnActionDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import {
  createDiceValue,
  type DiceValue,
} from "../dice";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  DICE_RESULT_DELAY_MS,
  DICE_TO_MOVEMENT_DELAY_MS,
  delay,
} from "../movement";

import {
  JAIL_BAIL_AMOUNT,
  JAIL_FORCED_RELEASE_FINE,
  JAIL_MAX_FAILED_DOUBLE_ATTEMPTS,
  releasePlayerFromJail,
} from "./jailRules";

import type {
  JailActionError,
  JailLiquidationError,
  PendingJailFine,
} from "./jailTypes";

const JAIL_DICE_ANIMATION_DURATION_MS =
  2350;

interface UseJailTurnResolutionOptions {
  playersRef:
    MutableRefObject<PlayerTokenData[]>;

  commitPlayers: (
    players: PlayerTokenData[],
  ) => void;

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

  activePlayerId: string;
  localPlayerId: string;
  turnSequence: number;
  canRoll: boolean;

  isDiceAnimating: boolean;

  setIsDiceAnimating:
    Dispatch<SetStateAction<boolean>>;

  setIsDiceVisible:
    Dispatch<SetStateAction<boolean>>;

  setDiceValues:
    Dispatch<
      SetStateAction<
        [DiceValue, DiceValue]
      >
    >;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  withdraw: (
    playerId: string,
    amount: number,
    reason: TransactionReason,
    memo?: string,
  ) => MoneyOperationResult;

  startJailResolution: () => void;

  cancelCurrentAction: () => void;

  prepareNetworkTurnAdvance: (
    additionallyDisabledPlayerIds?:
      string[],
  ) => void;

  onNetworkEndTurnRequest?:
    () => void;

  moveActivePlayer: (
    steps: number,
  ) => Promise<void>;

  finishJailTurn: (
    additionallyDisabledPlayerIds?:
      string[],
  ) => void;

  runLocalDiceRoll: (
    forcedDice?:
      [DiceValue, DiceValue],
    allowRerollPrompt?: boolean,
  ) => Promise<void>;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createJailTurnActionId(
  turnSequence: number,
  playerId: string,
  action:
    UlsanMarbleJailTurnActionDecidedPayload["action"],
): string {
  return [
    "JAIL_TURN",
    turnSequence,
    playerId,
    action,
  ].join(":");
}

function createAuthoritativeDice():
  [DiceValue, DiceValue] {
  return [
    createDiceValue(),
    createDiceValue(),
  ];
}

export function useJailTurnResolution({
  playersRef,
  commitPlayers,

  setPendingJailFine,
  setJailActionError,
  setJailLiquidationError,

  activePlayerId,
  localPlayerId,
  turnSequence,
  canRoll,

  isDiceAnimating,
  setIsDiceAnimating,
  setIsDiceVisible,
  setDiceValues,

  canPlayerAfford,
  withdraw,

  startJailResolution,
  cancelCurrentAction,

  prepareNetworkTurnAdvance,
  onNetworkEndTurnRequest,

  moveActivePlayer,
  finishJailTurn,
  runLocalDiceRoll,

  onNetworkGameEventRequest,
}: UseJailTurnResolutionOptions) {
  const [
    isJailTurnActionPending,
    setIsJailTurnActionPending,
  ] = useState(false);

  const publishingActionIdRef =
    useRef<string | null>(null);

  const appliedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const applyJailTurnActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleJailTurnActionDecidedPayload,
      ): boolean => {
        if (
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        if (
          payload.playerId !==
            activePlayerId ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              payload.playerId,
          );

        if (!player?.isJailed) {
          return false;
        }

        const diceValues:
          [DiceValue, DiceValue] = [
            payload.diceValues[0],
            payload.diceValues[1],
          ];

        const finishApply = () => {
          appliedActionIdsRef.current.add(
            payload.actionId,
          );

          if (
            publishingActionIdRef.current ===
            payload.actionId
          ) {
            publishingActionIdRef.current =
              null;
          }

          setIsJailTurnActionPending(false);
          setJailActionError(null);
          setJailLiquidationError(null);
        };

        if (
          payload.action ===
          "PAY_BAIL"
        ) {
          const paymentResult =
            withdraw(
              player.id,
              JAIL_BAIL_AMOUNT,
              "EVENT",
              "구치소 보석금",
            );

          if (!paymentResult.ok) {
            setJailActionError(
              paymentResult.error ===
                "INSUFFICIENT_FUNDS"
                ? "INSUFFICIENT_FUNDS"
                : "NO_ACTIVE_PRISONER",
            );

            return false;
          }

          commitPlayers(
            playersRef.current.map(
              (candidate) =>
                candidate.id ===
                player.id
                  ? releasePlayerFromJail(
                      candidate,
                    )
                  : candidate,
            ),
          );

          finishApply();

          void runLocalDiceRoll(
            diceValues,
            false,
          );

          return true;
        }

        if (
          payload.action ===
          "USE_ESCAPE_CARD"
        ) {
          if (
            payload.escapeCardsBefore <= 0
          ) {
            return false;
          }

          commitPlayers(
            playersRef.current.map(
              (candidate) =>
                candidate.id ===
                player.id
                  ? {
                      ...releasePlayerFromJail(
                        candidate,
                      ),
                      jailEscapeCards:
                        Math.max(
                          0,
                          payload
                            .escapeCardsBefore -
                            1,
                        ),
                    }
                  : candidate,
            ),
          );

          finishApply();

          void runLocalDiceRoll(
            diceValues,
            false,
          );

          return true;
        }

        if (
          payload.failedAttemptsBefore <
            0 ||
          payload.failedAttemptsBefore >=
            JAIL_MAX_FAILED_DOUBLE_ATTEMPTS
        ) {
          return false;
        }

        const isDouble =
          diceValues[0] ===
          diceValues[1];

        const nextFailedAttempts =
          Math.min(
            JAIL_MAX_FAILED_DOUBLE_ATTEMPTS,
            payload.failedAttemptsBefore +
              (isDouble ? 0 : 1),
          );

        const isFinalFailure =
          !isDouble &&
          nextFailedAttempts >=
            JAIL_MAX_FAILED_DOUBLE_ATTEMPTS;

        /*
         * 일반 실패는 이 행동이 끝난 뒤
         * 서버 턴이 넘어간다.
         *
         * 네트워크 turnSequence가 먼저 바뀌어도
         * 원격 클라이언트가 즉시 턴 종료를
         * 적용할 수 있도록 애니메이션 전에
         * turn advance 대기 상태를 만든다.
         */
        if (
          !isDouble &&
          !isFinalFailure &&
          onNetworkGameEventRequest
        ) {
          prepareNetworkTurnAdvance();
        }

        finishApply();

        startJailResolution();

        setDiceValues(diceValues);
        setIsDiceAnimating(true);
        setIsDiceVisible(true);

        void (async () => {
          try {
            await delay(
              JAIL_DICE_ANIMATION_DURATION_MS,
            );

            setIsDiceAnimating(false);

            await delay(
              DICE_RESULT_DELAY_MS,
            );

            setIsDiceVisible(false);

            if (isDouble) {
              commitPlayers(
                playersRef.current.map(
                  (candidate) =>
                    candidate.id ===
                    player.id
                      ? releasePlayerFromJail(
                          candidate,
                        )
                      : candidate,
                ),
              );

              await delay(
                DICE_TO_MOVEMENT_DELAY_MS,
              );

              await moveActivePlayer(
                diceValues[0] +
                  diceValues[1],
              );

              return;
            }

            commitPlayers(
              playersRef.current.map(
                (candidate) =>
                  candidate.id ===
                  player.id
                    ? {
                        ...candidate,
                        isJailed: true,
                        jailFailedAttempts:
                          nextFailedAttempts,
                      }
                    : candidate,
              ),
            );

            if (isFinalFailure) {
              setPendingJailFine({
                fineId: [
                  "JAIL_FINE",
                  payload.turnSequence,
                  player.id,
                ].join(":"),

                playerId:
                  player.id,

                amount:
                  JAIL_FORCED_RELEASE_FINE,

                turnSequence:
                  payload.turnSequence,
              });
              return;
            }

            if (
              onNetworkGameEventRequest
            ) {
              if (
                localPlayerId ===
                activePlayerId
              ) {
                onNetworkEndTurnRequest?.();
              }

              return;
            }

            finishJailTurn();
          } catch (error) {
            cancelCurrentAction();

            console.error(
              "[UlsanMarble] 구치소 더블 도전 적용 실패",
              error,
            );
          } finally {
            setIsDiceAnimating(false);
            setIsDiceVisible(false);
          }
        })();

        return true;
      },
      [
        activePlayerId,
        cancelCurrentAction,
        commitPlayers,
        finishJailTurn,
        localPlayerId,
        moveActivePlayer,
        onNetworkEndTurnRequest,
        onNetworkGameEventRequest,
        playersRef,
        prepareNetworkTurnAdvance,
        runLocalDiceRoll,
        setDiceValues,
        setIsDiceAnimating,
        setIsDiceVisible,
        setJailActionError,
        setJailLiquidationError,
        setPendingJailFine,
        startJailResolution,
        turnSequence,
        withdraw,
      ],
    );

  const publishAction =
    useCallback(
      (
        payload:
          UlsanMarbleJailTurnActionDecidedPayload,
      ) => {
        if (
          publishingActionIdRef.current
        ) {
          setJailActionError(
            "ACTION_IN_PROGRESS",
          );

          return;
        }

        publishingActionIdRef.current =
          payload.actionId;

        setIsJailTurnActionPending(true);
        setJailActionError(null);

        if (
          onNetworkGameEventRequest
        ) {
          onNetworkGameEventRequest({
            kind:
              "JAIL_TURN_ACTION_DECIDED",

            payload,
          });

          return;
        }

        const applied =
          applyJailTurnActionDecided(
            payload,
          );

        if (!applied) {
          publishingActionIdRef.current =
            null;

          setIsJailTurnActionPending(
            false,
          );
        }
      },
      [
        applyJailTurnActionDecided,
        onNetworkGameEventRequest,
        setJailActionError,
      ],
    );

  const getActivePrisoner =
    useCallback(() => {
      if (
        !canRoll ||
        isDiceAnimating ||
        isJailTurnActionPending
      ) {
        setJailActionError(
          isDiceAnimating ||
            isJailTurnActionPending
            ? "ACTION_IN_PROGRESS"
            : "NO_ACTIVE_PRISONER",
        );

        return null;
      }

      if (
        onNetworkGameEventRequest &&
        localPlayerId !==
          activePlayerId
      ) {
        setJailActionError(
          "NO_ACTIVE_PRISONER",
        );

        return null;
      }

      const player =
        playersRef.current.find(
          (candidate) =>
            candidate.id ===
            activePlayerId,
        );

      if (!player?.isJailed) {
        setJailActionError(
          "NO_ACTIVE_PRISONER",
        );

        return null;
      }

      return player;
    }, [
      activePlayerId,
      canRoll,
      isDiceAnimating,
      isJailTurnActionPending,
      localPlayerId,
      onNetworkGameEventRequest,
      playersRef,
      setJailActionError,
    ]);

  const payJailBail =
    useCallback(() => {
      const player =
        getActivePrisoner();

      if (!player) {
        return;
      }

      if (
        !canPlayerAfford(
          player.id,
          JAIL_BAIL_AMOUNT,
        )
      ) {
        setJailActionError(
          "INSUFFICIENT_FUNDS",
        );

        return;
      }

      const diceValues =
        createAuthoritativeDice();

      publishAction({
        actionId:
          createJailTurnActionId(
            turnSequence,
            player.id,
            "PAY_BAIL",
          ),

        action: "PAY_BAIL",

        playerId: player.id,
        turnSequence,
        diceValues,
      });
    }, [
      canPlayerAfford,
      getActivePrisoner,
      publishAction,
      setJailActionError,
      turnSequence,
    ]);

  const useJailEscapeCard =
    useCallback(() => {
      const player =
        getActivePrisoner();

      if (!player) {
        return;
      }

      const escapeCards =
        Math.max(
          0,
          player.jailEscapeCards ?? 0,
        );

      if (escapeCards <= 0) {
        setJailActionError(
          "NO_ESCAPE_CARD",
        );

        return;
      }

      const diceValues =
        createAuthoritativeDice();

      publishAction({
        actionId:
          createJailTurnActionId(
            turnSequence,
            player.id,
            "USE_ESCAPE_CARD",
          ),

        action:
          "USE_ESCAPE_CARD",

        playerId: player.id,
        turnSequence,
        diceValues,

        escapeCardsBefore:
          escapeCards,
      });
    }, [
      getActivePrisoner,
      publishAction,
      setJailActionError,
      turnSequence,
    ]);

  const attemptJailDouble =
    useCallback(() => {
      const player =
        getActivePrisoner();

      if (!player) {
        return;
      }

      const failedAttemptsBefore =
        Math.max(
          0,
          Math.min(
            JAIL_MAX_FAILED_DOUBLE_ATTEMPTS -
              1,

            Math.trunc(
              player.jailFailedAttempts ??
                0,
            ),
          ),
        );

      const diceValues =
        createAuthoritativeDice();

      publishAction({
        actionId:
          createJailTurnActionId(
            turnSequence,
            player.id,
            "TRY_DOUBLE",
          ),

        action:
          "TRY_DOUBLE",

        playerId: player.id,
        turnSequence,
        diceValues,

        failedAttemptsBefore,
      });
    }, [
      getActivePrisoner,
      publishAction,
      turnSequence,
    ]);

  const resetJailTurnResolution =
    useCallback(() => {
      publishingActionIdRef.current =
        null;

      appliedActionIdsRef.current =
        new Set();

      setIsJailTurnActionPending(
        false,
      );
    }, []);

  return {
    payJailBail,
    useJailEscapeCard,
    attemptJailDouble,

    applyJailTurnActionDecided,

    isJailTurnActionPending,

    resetJailTurnResolution,
  };
}