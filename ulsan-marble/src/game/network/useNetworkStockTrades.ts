import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  UlsanMarbleNetworkStockTrade,
} from "./networkTypes";

type ApplyStockTrade = (
  playerId: string,
  companyId: string,
  quantity: number,
  pricePerShare: number,
) => void;

interface UseNetworkStockTradesOptions {
  trades?:
    UlsanMarbleNetworkStockTrade[];

  activePlayerId: string;
  turnPhase: string;

  applyBuyStock:
    ApplyStockTrade;

  applySellStock:
    ApplyStockTrade;
}

export function useNetworkStockTrades({
  trades,
  activePlayerId,
  turnPhase,
  applyBuyStock,
  applySellStock,
}: UseNetworkStockTradesOptions): () => void {
  const processedTradeIdRef =
    useRef(0);

  const applyBuyStockRef =
    useRef(applyBuyStock);

  const applySellStockRef =
    useRef(applySellStock);

  useEffect(() => {
    applyBuyStockRef.current =
      applyBuyStock;
  }, [applyBuyStock]);

  useEffect(() => {
    applySellStockRef.current =
      applySellStock;
  }, [applySellStock]);

  useEffect(() => {
    if (
      !trades ||
      trades.length === 0
    ) {
      return;
    }

    /*
     * 서버 거래가 먼저 도착해도
     * 로컬이 주식 거래 단계에
     * 진입할 때까지 기다린다.
     */
    if (
      turnPhase !==
      "STOCK_TRADING"
    ) {
      return;
    }

    const pendingTrades =
      trades
        .filter(
          (trade) =>
            trade.tradeId >
            processedTradeIdRef.current,
        )
        .sort(
          (first, second) =>
            first.tradeId -
            second.tradeId,
        );

    for (const trade of pendingTrades) {
      /*
       * 실시간 정상 진행에서는
       * 현재 플레이어의 거래만 적용한다.
       *
       * 다른 턴의 과거 거래는 적용하지 않고
       * 처리 ID만 넘긴다.
       */
      if (
        trade.playerId ===
        activePlayerId
      ) {
        if (
          trade.action === "BUY"
        ) {
          applyBuyStockRef.current(
            trade.playerId,
            trade.companyId,
            trade.quantity,
            trade.pricePerShare,
          );
        } else {
          applySellStockRef.current(
            trade.playerId,
            trade.companyId,
            trade.quantity,
            trade.pricePerShare,
          );
        }
      }

      processedTradeIdRef.current =
        trade.tradeId;
    }
  }, [
    activePlayerId,
    trades,
    turnPhase,
  ]);

  return useCallback(() => {
    processedTradeIdRef.current = 0;
  }, []);
}