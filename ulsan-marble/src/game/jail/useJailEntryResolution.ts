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
        const pending =
          pendingJailEntry;

        if (!pending) {
          return false;
        }

        if (
          pending.playerId !==
            payload.playerId ||
          pending.entryId !==
            payload.entryId ||
          pending.turnSequence !==
            payload.turnSequence ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        const jailedPlayer =
          playersRef.current.find(
            (player) =>
              player.id ===
              payload.playerId,
          );

        if (
          !jailedPlayer ||
          !jailedPlayer.isJailed
        ) {
          return false;
        }

        startedEntryIdRef.current =
          null;

        confirmPublishRef.current =
          null;

        setPendingJailEntry(null);
        setJailActionError(null);

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
            finishTurnAfterStockTrading,
            localPlayerId,
            onNetworkEndTurnRequest,
            pendingJailEntry,
            playersRef,
            prepareNetworkTurnAdvance,
            setJailActionError,
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