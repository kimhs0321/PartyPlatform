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
  UlsanMarbleJailEntryConfirmedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import {
  incarceratePlayer,
} from "./jailRules";

import type {
  JailActionError,
  JailLiquidationError,
  PendingJailEntry,
} from "./jailTypes";

interface StartJailEntryOptions {
  playerId: string;

  entryId: string;
  turnSequence: number;

  forcedPosition?: number;
}

interface UseJailEntryResolutionOptions {
  pendingJailEntry:
    PendingJailEntry | null;

  setPendingJailEntry: Dispatch<
    SetStateAction<
      PendingJailEntry | null
    >
  >;

  setJailActionError: Dispatch<
    SetStateAction<
      JailActionError | null
    >
  >;

  setJailLiquidationError: Dispatch<
    SetStateAction<
      JailLiquidationError | null
    >
  >;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  commitPlayers: (nextPlayers:PlayerTokenData[],) => void;
  jailPosition: number;
  localPlayerId: string;
  turnSequence: number;
  resetDoubleChain: () => void;
  finishTurnAfterStockTrading:(additionallyDisabledPlayerIds?:string[],) => void;
  onNetworkGameEventRequest?: (event:UlsanMarbleGameEventRequest,) => void;
  onNetworkEndTurnRequest?: () => void;
  prepareNetworkTurnAdvance?: () => void;
}

export function useJailEntryResolution({
  pendingJailEntry,
  setPendingJailEntry,
  setJailActionError,
  setJailLiquidationError,
  playersRef,
  commitPlayers,
  jailPosition,
  localPlayerId,
  turnSequence,
  resetDoubleChain,
  finishTurnAfterStockTrading,
  onNetworkEndTurnRequest,
  prepareNetworkTurnAdvance,

  onNetworkGameEventRequest,
}: UseJailEntryResolutionOptions) {
  const startedEntryIdRef =
    useRef<string | null>(null);

  const confirmPublishRef =
    useRef<string | null>(null);

  const startJailEntryResolution =
    useCallback(
      ({
        playerId,
        entryId,
        turnSequence:
          entryTurnSequence,
        forcedPosition,
      }: StartJailEntryOptions): boolean => {
        if (
          entryTurnSequence !==
          turnSequence
        ) {
          return false;
        }

        if (
          pendingJailEntry
        ) {
          return (
            pendingJailEntry.entryId ===
              entryId &&
            pendingJailEntry.playerId ===
              playerId
          );
        }

        if (
          startedEntryIdRef.current
        ) {
          return (
            startedEntryIdRef.current ===
            entryId
          );
        }

        const playerExists =
          playersRef.current.some(
            (player) =>
              player.id === playerId,
          );

        if (!playerExists) {
          return false;
        }

        startedEntryIdRef.current =
          entryId;

        confirmPublishRef.current =
          null;

        resetDoubleChain();

        setJailActionError(null);
        setJailLiquidationError(null);

        commitPlayers(
          playersRef.current.map(
            (player) => {
              if (
                player.id !==
                playerId
              ) {
                return player;
              }

              const jailedPlayer =
                incarceratePlayer(
                  player,
                );

              if (
                forcedPosition ===
                undefined
              ) {
                return jailedPlayer;
              }

              return {
                ...jailedPlayer,
                position:
                  forcedPosition,
              };
            },
          ),
        );

        setPendingJailEntry({
          playerId,
          entryId,

          turnSequence:
            entryTurnSequence,
        });

        return true;
      },
      [
        commitPlayers,
        pendingJailEntry,
        playersRef,
        resetDoubleChain,
        setJailActionError,
        setJailLiquidationError,
        setPendingJailEntry,
        turnSequence,
      ],
    );

  const applyJailEntryConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleJailEntryConfirmedPayload,
      ): boolean => {
        if (
          payload.turnSequence !==
          turnSequence
        ) {
          return false;
        }

        const isTripleDoubleEntry =
          payload.entryId ===
          [
            "JAIL_TRIPLE_DOUBLE",
            payload.turnSequence,
            payload.playerId,
          ].join(":");

        const pending =
          pendingJailEntry;

        if (pending) {
          if (
            pending.playerId !==
              payload.playerId ||
            pending.entryId !==
              payload.entryId ||
            pending.turnSequence !==
              payload.turnSequence
          ) {
            return false;
          }
        } else if (!isTripleDoubleEntry) {
          /*
          * 일반 구치소 진입은 기존처럼
          * pendingJailEntry가 반드시 있어야 한다.
          *
          * 3연속 더블만 네트워크 타이밍 차이로
          * pending 생성보다 CONFIRMED가 먼저
          * 도착할 수 있으므로 복구 적용한다.
          */
          return false;
        }

        const player =
          playersRef.current.find(
            (currentPlayer) =>
              currentPlayer.id ===
              payload.playerId,
          );

        if (!player) {
          return false;
        }

        if (isTripleDoubleEntry) {
          /*
          * 3연속 더블의 CONFIRMED 이벤트 자체를
          * authoritative jail sync로 사용한다.
          *
          * 다른 클라이언트가 아직 로컬에서
          * 3연속 더블 진입 처리를 만들지 못했어도
          * 여기서 동일한 구치소 상태로 맞춘다.
          */
          if (
            !player.isJailed ||
            player.position !==
              jailPosition
          ) {
            commitPlayers(
              playersRef.current.map(
                (currentPlayer) =>
                  currentPlayer.id ===
                  payload.playerId
                    ? {
                        ...incarceratePlayer(
                          currentPlayer,
                        ),
                        position:
                          jailPosition,
                      }
                    : currentPlayer,
              ),
            );
          }

          resetDoubleChain();
        } else if (!player.isJailed) {
          return false;
        }

        startedEntryIdRef.current =
          null;

        confirmPublishRef.current =
          null;

        setPendingJailEntry(null);
        setJailActionError(null);
        setJailLiquidationError(null);

        if (onNetworkEndTurnRequest) {
          prepareNetworkTurnAdvance?.();

          if (
            payload.playerId ===
            localPlayerId
          ) {
            window.setTimeout(() => {
              onNetworkEndTurnRequest();
            }, 0);
          }

          return true;
        }

        finishTurnAfterStockTrading();

        return true;
      },
      [
        commitPlayers,
        finishTurnAfterStockTrading,
        jailPosition,
        localPlayerId,
        onNetworkEndTurnRequest,
        pendingJailEntry,
        playersRef,
        prepareNetworkTurnAdvance,
        resetDoubleChain,
        setJailActionError,
        setJailLiquidationError,
        setPendingJailEntry,
        turnSequence,
      ],
    );

  const confirmJailEntry =
    useCallback((): void => {
      const pending =
        pendingJailEntry;

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

      if (
        pending.turnSequence !==
        turnSequence
      ) {
        return;
      }

      if (
        confirmPublishRef.current ===
        pending.entryId
      ) {
        return;
      }

      const payload:
        UlsanMarbleJailEntryConfirmedPayload =
        {
          playerId:
            pending.playerId,

          entryId:
            pending.entryId,

          turnSequence:
            pending.turnSequence,
        };

      confirmPublishRef.current =
        pending.entryId;

      if (
        onNetworkGameEventRequest
      ) {
        try {
          onNetworkGameEventRequest({
            kind:
              "JAIL_ENTRY_CONFIRMED",

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
        applyJailEntryConfirmed(
          payload,
        );

      if (!applied) {
        confirmPublishRef.current =
          null;
      }
    }, [
      applyJailEntryConfirmed,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingJailEntry,
      turnSequence,
    ]);

  const resetJailEntryResolution =
    useCallback((): void => {
      startedEntryIdRef.current =
        null;

      confirmPublishRef.current =
        null;

      setPendingJailEntry(null);
    }, [
      setPendingJailEntry,
    ]);

  return {
    startJailEntryResolution,
    confirmJailEntry,
    applyJailEntryConfirmed,
    resetJailEntryResolution,
  };
}