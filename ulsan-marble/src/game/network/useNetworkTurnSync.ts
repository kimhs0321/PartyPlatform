import {
  useCallback,
  useEffect,
  useRef,
} from "react";

interface NetworkTurnSequenceCursorRef {
  current: number | null;
}

interface UseNetworkTurnSyncOptions {
  turnSequence:
    number | undefined;

  turnPhase: string;

  processedTurnSequenceCursorRef?:
    NetworkTurnSequenceCursorRef;

  completeStockTrading:
    () => boolean;

  shouldCompleteImmediately?:
    () => boolean;

  completeImmediately?:
    () => void;
}

export function useNetworkTurnSync({
  turnSequence,
  turnPhase,
  processedTurnSequenceCursorRef,
  completeStockTrading,
  shouldCompleteImmediately,
  completeImmediately,
}: UseNetworkTurnSyncOptions) {
  const fallbackProcessedTurnSequenceRef =
    useRef<number | null>(
      turnSequence ?? null,
    );

  const processedTurnSequenceRef =
    processedTurnSequenceCursorRef ??
    fallbackProcessedTurnSequenceRef;

  useEffect(() => {
    if (
      turnSequence === undefined
    ) {
      return;
    }

    const processedTurnSequence =
      processedTurnSequenceRef.current;

    /*
     * 최초 서버 상태는 턴 종료 이벤트가 아니다.
     * 현재 값을 기준점으로만 저장한다.
     */
    if (
      processedTurnSequence === null
    ) {
      processedTurnSequenceRef.current =
        turnSequence;

      return;
    }

    if (
      turnSequence <=
      processedTurnSequence
    ) {
      return;
    }

    console.log(
      "[NETWORK TURN SYNC]",
      {
        processedTurnSequence,
        nextTurnSequence:
          turnSequence,
        turnPhase,
      },
    );

    /*
     * 구치소처럼 STOCK_TRADING 단계를
     * 거치지 않는 종료 흐름이다.
     */
    if (
      shouldCompleteImmediately?.()
    ) {
      if (!completeImmediately) {
        console.error(
          "[NETWORK TURN SYNC] 즉시 처리 함수가 없습니다.",
        );

        return;
      }

      completeImmediately();

      processedTurnSequenceRef.current =
        turnSequence;

      return;
    }

    /*
     * 서버의 END_TURN 결과가 로컬 칸 처리가
     * 끝나기 전에 도착할 수 있다.
     *
     * 로컬이 STOCK_TRADING에 도달할 때까지
     * processed 값을 갱신하지 않고 기다린다.
     */
    if (
      turnPhase !==
      "STOCK_TRADING"
    ) {
      console.log(
        "[NETWORK TURN SYNC WAIT]",
        {
          turnSequence,
          turnPhase,
        },
      );

      return;
    }

    const completed =
      completeStockTrading();

    /*
     * 축제 정산 등으로 아직 처리할 수 없으면
     * 시퀀스를 소비하지 않는다.
     *
     * 관련 상태가 변경되어 다시 렌더링되면
     * 동일한 turnSequence를 다시 처리한다.
     */
    if (!completed) {
      console.log(
        "[NETWORK TURN SYNC RETRY]",
        {
          turnSequence,
          turnPhase,
        },
      );

      return;
    }

    processedTurnSequenceRef.current =
      turnSequence;

    console.log(
      "[NETWORK TURN SYNC COMPLETE]",
      {
        turnSequence,
      },
    );
  }, [
    completeImmediately,
    completeStockTrading,
    processedTurnSequenceRef,
    shouldCompleteImmediately,
    turnPhase,
    turnSequence,
  ]);

  const resetNetworkTurnSync =
    useCallback(() => {
      processedTurnSequenceRef.current =
        turnSequence ?? null;
    }, [
      processedTurnSequenceRef,
      turnSequence,
    ]);

  return resetNetworkTurnSync;
}