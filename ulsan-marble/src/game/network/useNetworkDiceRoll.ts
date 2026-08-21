import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  UlsanMarbleNetworkDiceRoll,
} from "./networkTypes";

type RunDiceRoll = (
  forcedDice:
    UlsanMarbleNetworkDiceRoll["values"],
  allowRerollPrompt?: boolean,
) => Promise<void>;

interface UseNetworkDiceRollOptions {
  diceRoll?:
    UlsanMarbleNetworkDiceRoll | null;

  activePlayerId: string;
  canRoll: boolean;

  runDiceRoll: RunDiceRoll;
}

export function useNetworkDiceRoll({
  diceRoll,
  activePlayerId,
  canRoll,
  runDiceRoll,
}: UseNetworkDiceRollOptions): () => void {
  const processedRollIdRef =
    useRef(0);

  const runDiceRollRef =
    useRef(runDiceRoll);

  useEffect(() => {
    runDiceRollRef.current =
      runDiceRoll;
  }, [runDiceRoll]);

  useEffect(() => {
    if (!diceRoll) {
      return;
    }

    if (
      processedRollIdRef.current >=
      diceRoll.rollId
    ) {
      return;
    }

    if (!canRoll) {
      return;
    }

    if (
      activePlayerId !==
      diceRoll.playerId
    ) {
      return;
    }

    processedRollIdRef.current =
      diceRoll.rollId;

    void runDiceRollRef.current(
      diceRoll.values,
      false,
    );
  }, [
    activePlayerId,
    canRoll,
    diceRoll,
  ]);

  const resetProcessedRoll =
    useCallback(() => {
      processedRollIdRef.current = 0;
    }, []);

  return resetProcessedRoll;
}