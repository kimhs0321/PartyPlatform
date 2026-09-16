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

interface NetworkDiceRollCursorRef {
  current: number;
}

interface UseNetworkDiceRollOptions {
  diceRoll?:
    UlsanMarbleNetworkDiceRoll | null;

  activePlayerId: string;
  canRoll: boolean;

  processedRollCursorRef?:
    NetworkDiceRollCursorRef;

  runDiceRoll: RunDiceRoll;
}

export function useNetworkDiceRoll({
  diceRoll,
  activePlayerId,
  canRoll,
  processedRollCursorRef,
  runDiceRoll,
}: UseNetworkDiceRollOptions): () => void {
  const fallbackProcessedRollIdRef =
    useRef(0);

  const processedRollIdRef =
    processedRollCursorRef ??
    fallbackProcessedRollIdRef;

  const inFlightRollIdRef =
    useRef<number | null>(
      null,
    );

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

    /*
    * 이미 다른 주사위 처리가 진행 중이면
    * 중복 실행하지 않는다.
    */
    if (
      inFlightRollIdRef.current !==
      null
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

    const rollId =
      diceRoll.rollId;

    const values =
      diceRoll.values;

    /*
    * processed가 아니라
    * in-flight만 먼저 기록한다.
    *
    * F5가 여기서 발생하면
    * 이 값은 메모리와 함께 사라지고,
    * snapshot의 processed cursor는
    * 이전 안전 지점 그대로 남는다.
    */
    inFlightRollIdRef.current =
      rollId;

    void (async () => {
      try {
        await runDiceRollRef.current(
          values,
          false,
        );

        /*
        * 이동/도착 처리가 정상 완료된 뒤에만
        * 실제 처리 완료 cursor를 올린다.
        */
        processedRollIdRef.current =
          Math.max(
            processedRollIdRef.current,
            rollId,
          );
      } catch (error) {
        console.error(
          "[NETWORK DICE ROLL FAILED]",
          error,
        );
      } finally {
        if (
          inFlightRollIdRef.current ===
          rollId
        ) {
          inFlightRollIdRef.current =
            null;
        }
      }
    })();
  }, [
    activePlayerId,
    canRoll,
    diceRoll,
    processedRollIdRef,
  ]);

    const resetProcessedRoll =
      useCallback(() => {
        processedRollIdRef.current = 0;
        inFlightRollIdRef.current = null;
      }, [processedRollIdRef]);

  return resetProcessedRoll;
}