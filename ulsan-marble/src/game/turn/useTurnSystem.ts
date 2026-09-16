import {
  useCallback,
  useMemo,
  useReducer,
} from "react";

import {
  INITIAL_TURN_STATE,
  turnReducer,
} from "./turnUtils";

import type {
  TurnPhase,
  TurnState,
} from "./turnTypes";

interface UseTurnSystemOptions {
  playerIds: string[];
  disabledPlayerIds?: string[];

  initialSnapshot?:
    TurnRestoreSnapshot | null;
}

interface TurnAdvancePreview {
  nextPlayerIndex: number;
  completedGlobalTurn: boolean;
}

export interface TurnRestoreSnapshot {
  turnNumber: number;
  turnSequence: number;
  activePlayerId: string;
  phase: TurnPhase;
}

function findNextEligiblePlayer(
  playerIds: string[],
  currentIndex: number,
  disabledPlayerIds: Set<string>,
): { index: number; wrapped: boolean } {
  if (playerIds.length === 0) {
    return { index: 0, wrapped: false };
  }

  for (let offset = 1; offset <= playerIds.length; offset += 1) {
    const rawIndex = currentIndex + offset;
    const candidateIndex = rawIndex % playerIds.length;
    const candidateId = playerIds[candidateIndex];

    if (!disabledPlayerIds.has(candidateId)) {
      return {
        index: candidateIndex,
        wrapped: rawIndex >= playerIds.length,
      };
    }
  }

  return { index: currentIndex, wrapped: true };
}

export function useTurnSystem({
  playerIds,
  disabledPlayerIds = [],
  initialSnapshot = null,
}: UseTurnSystemOptions) {
  const initialTurnState =
    useMemo<TurnState>(() => {
      if (!initialSnapshot) {
        return INITIAL_TURN_STATE;
      }

      const playerIndex =
        playerIds.indexOf(
          initialSnapshot.activePlayerId,
        );

      if (playerIndex < 0) {
        return INITIAL_TURN_STATE;
      }

      return {
        turnNumber: Math.max(
          1,
          Math.trunc(
            initialSnapshot.turnNumber,
          ),
        ),

        activePlayerIndex:
          playerIndex,

        phase:
          initialSnapshot.phase,

        sequence: Math.max(
          0,
          Math.trunc(
            initialSnapshot.turnSequence,
          ),
        ),
      };
    }, [
      initialSnapshot,
      playerIds,
    ]);

  const [state, dispatch] =
    useReducer(
      turnReducer,
      initialTurnState,
    );

  const disabledPlayerIdSet = useMemo(
    () => new Set(disabledPlayerIds),
    [disabledPlayerIds],
  );

  const activePlayerId =
    playerIds[state.activePlayerIndex] ?? playerIds[0] ?? "";
  const eligiblePlayerCount = playerIds.filter(
    (playerId) => !disabledPlayerIdSet.has(playerId),
  ).length;
  const activePlayerDisabled = disabledPlayerIdSet.has(activePlayerId);
  const canRoll =
    state.phase === "WAITING_FOR_ROLL" &&
    eligiblePlayerCount > 0 &&
    !activePlayerDisabled;
  const isBusy = !canRoll;

  const movementPhase = useMemo(() => {
    if (state.phase === "MOVING") return "MOVING" as const;
    if (state.phase === "ARRIVED") return "ARRIVED" as const;
    return "IDLE" as const;
  }, [state.phase]);

  const previewTurnAdvance = (
    additionallyDisabledPlayerIds: string[] = [],
  ): TurnAdvancePreview => {
    const disabledForAdvance = new Set([
      ...disabledPlayerIds,
      ...additionallyDisabledPlayerIds,
    ]);
    const next = findNextEligiblePlayer(
      playerIds,
      state.activePlayerIndex,
      disabledForAdvance,
    );

    return {
      nextPlayerIndex: next.index,
      completedGlobalTurn: next.wrapped,
    };
  };

  const completeTurn = (additionallyDisabledPlayerIds: string[] = []) => {
    const preview = previewTurnAdvance(additionallyDisabledPlayerIds);

    dispatch({
      type: "COMPLETE_TURN",
      nextPlayerIndex: preview.nextPlayerIndex,
      completedGlobalTurn: preview.completedGlobalTurn,
    });
  };

  const restoreTurnState =
    useCallback(
      (
        snapshot:
          TurnRestoreSnapshot,
      ): boolean => {
        const playerIndex =
          playerIds.indexOf(
            snapshot.activePlayerId,
          );

        if (playerIndex < 0) {
          return false;
        }

        dispatch({
          type: "RESTORE_STATE",
          state: {
            turnNumber:
              snapshot.turnNumber,

            activePlayerIndex:
              playerIndex,

            phase:
              snapshot.phase,

            sequence:
              snapshot.turnSequence,
          },
        });

        return true;
      },
      [playerIds],
    );

  return {
    turnNumber: state.turnNumber,
    turnSequence: state.sequence,
    activePlayerIndex: state.activePlayerIndex,
    activePlayerId,
    phase: state.phase,
    movementPhase,
    canRoll,
    isBusy,

    startDiceRoll: () => dispatch({ type: "START_DICE_ROLL" }),
    startJailResolution: () =>
      dispatch({ type: "START_JAIL_RESOLUTION" }),
    startMovement: () => dispatch({ type: "START_MOVEMENT" }),
    startForcedJailResolution: () =>
      dispatch({ type: "START_FORCED_JAIL_RESOLUTION" }),
    markArrived: () => dispatch({ type: "MARK_ARRIVED" }),
    startTileResolution: () =>
      dispatch({ type: "START_TILE_RESOLUTION" }),
    startStockTrading: () =>
      dispatch({ type: "START_STOCK_TRADING" }),
    startTaxSettlement: () =>
      dispatch({ type: "START_TAX_SETTLEMENT" }),
    startMarketSettlement: () =>
      dispatch({ type: "START_MARKET_SETTLEMENT" }),
    startStockMarketSettlement: () =>
      dispatch({ type: "START_STOCK_MARKET_SETTLEMENT" }),
    startPortSettlement: () =>
      dispatch({ type: "START_PORT_SETTLEMENT" }),
    startLottoDraw: () => dispatch({ type: "START_LOTTO_DRAW" }),
    startMayorElection: () =>
      dispatch({ type: "START_MAYOR_ELECTION" }),
    startEconomicNews: () =>
      dispatch({ type: "START_ECONOMIC_NEWS" }),
    startDisaster: () => dispatch({ type: "START_DISASTER" }),
    grantExtraRoll: () => dispatch({ type: "GRANT_EXTRA_ROLL" }),
    previewTurnAdvance,
    completeTurn,
    completeTaxSettlement: completeTurn,
    completeMarketSettlement: completeTurn,
    completeStockMarketSettlement: completeTurn,
    completePortSettlement: completeTurn,
    completeLottoDraw: completeTurn,
    completeMayorElection: completeTurn,
    completeEconomicNews: completeTurn,
    completeDisaster: completeTurn,
    cancelCurrentAction: () =>
      dispatch({
        type: "CANCEL_CURRENT_ACTION",
      }),

    restoreTurnState,

    resetTurnSystem: () =>
      dispatch({ type: "RESET" }),

    overrideActivePlayer: (playerId: string) => {
      if (disabledPlayerIdSet.has(playerId)) return;

      const playerIndex = playerIds.indexOf(playerId);
        if (playerIndex < 0) return;

      dispatch({
        type: "OVERRIDE_ACTIVE_PLAYER",
        playerIndex,
        playerCount: playerIds.length,
      });
    },

    overrideTurnNumber: (turnNumber: number) =>
      dispatch({
        type: "OVERRIDE_TURN_NUMBER",
        turnNumber,
      }),

    startForcedMovement: () =>
      dispatch({
        type: "START_FORCED_MOVEMENT",
      }),

    startForcedTileResolution: () =>
      dispatch({
        type: "START_FORCED_TILE_RESOLUTION",
    }),
  };
}
