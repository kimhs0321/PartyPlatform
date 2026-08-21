import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  PendingPropertyPurchase,
} from "../property/propertyTypes";

import type {
  UlsanMarbleNetworkPropertyDecision,
} from "./networkTypes";

interface UseNetworkPropertyDecisionOptions {
  decision?:
    UlsanMarbleNetworkPropertyDecision | null;

  currentArrivalId: string | null;

  pendingPurchase:
    PendingPropertyPurchase | null;

  applyPurchase: () => void;
  applyDecline: () => void;
}

export function useNetworkPropertyDecision({
  decision,
  currentArrivalId,
  pendingPurchase,
  applyPurchase,
  applyDecline,
}: UseNetworkPropertyDecisionOptions): () => void {
  const processedDecisionIdRef =
    useRef(0);

  const applyPurchaseRef =
    useRef(applyPurchase);

  const applyDeclineRef =
    useRef(applyDecline);

  useEffect(() => {
    applyPurchaseRef.current =
      applyPurchase;
  }, [applyPurchase]);

  useEffect(() => {
    applyDeclineRef.current =
      applyDecline;
  }, [applyDecline]);

  useEffect(() => {
    if (!decision) {
      return;
    }

    if (
      processedDecisionIdRef.current >=
      decision.decisionId
    ) {
      return;
    }

    if (
      !currentArrivalId ||
      decision.arrivalId !==
        currentArrivalId
    ) {
      return;
    }

    if (
      !pendingPurchase ||
      !pendingPurchase.arrival
    ) {
      return;
    }

    if (
      pendingPurchase.arrival.arrivalId !==
        decision.arrivalId ||
      pendingPurchase.playerId !==
        decision.playerId ||
      pendingPurchase.property.id !==
        decision.propertyId
    ) {
      return;
    }

    if (decision.action === "BUY") {
      applyPurchaseRef.current();
    } else {
      applyDeclineRef.current();
    }

    /*
     * 실제 적용 함수를 호출한 뒤에만
     * 처리 완료로 기록한다.
     */
    processedDecisionIdRef.current =
      decision.decisionId;
  }, [
    currentArrivalId,
    decision,
    pendingPurchase,
  ]);

  return useCallback(() => {
    processedDecisionIdRef.current = 0;
  }, []);
}