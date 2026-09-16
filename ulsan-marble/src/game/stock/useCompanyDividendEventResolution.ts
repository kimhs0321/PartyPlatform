import {
  useCallback,
  useRef,
  useState,
} from "react";

import type {
  MutableRefObject,
} from "react";

import type {
  UlsanMarbleCompanyDividendEventResolvedPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  MacroEconomyState,
} from "../economy/macroEconomyTypes";

import {
  resolveCompanyDividendEvent,
} from "./companyDividendEventRules";

import {
  applyCompanyDividendEvent,
} from "./companyDividendRules";

import type {
  CompanyDividendModifierMap,
} from "./companyDividendTypes";

import type {
  StockCompanyData,
} from "./stockTypes";


type StockMarketResolutionMode =
  | "SCHEDULED"
  | "DEV";


interface UseCompanyDividendEventResolutionOptions {
  companyDividendModifiersRef:
    MutableRefObject<
      CompanyDividendModifierMap
    >;

  macroEconomyStateRef:
    MutableRefObject<
      MacroEconomyState
    >;

  stockCompanies:
    StockCompanyData[];

  localPlayerId:
    string;

  controllerPlayerId?:
    string;

  turnNumber:
    number;

  turnSequence:
    number;

  initialPendingCompanyDividendEvent?:
    UlsanMarbleCompanyDividendEventResolvedPayload["event"]
    | null;

  startStockMarketResolution: (
    mode:
      StockMarketResolutionMode,

    additionallyDisabledPlayerIds?:
      string[],

    macroStockMarketBias?:
      number,
  ) => boolean;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}


function createResolutionId(
  turnSequence: number,
  turnNumber: number,
): string {
  return [
    "COMPANY_DIVIDEND",
    turnSequence,
    turnNumber,
  ].join(":");
}


export function useCompanyDividendEventResolution({
  companyDividendModifiersRef,
  macroEconomyStateRef,

  stockCompanies,

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  initialPendingCompanyDividendEvent,

  startStockMarketResolution,

  onNetworkGameEventRequest,
}: UseCompanyDividendEventResolutionOptions) {
  const appliedResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedResolutionIdRef =
    useRef<string | null>(
      null,
    );

  const [
    pendingCompanyDividendEvent,
    setPendingCompanyDividendEvent,
  ] = useState<
    UlsanMarbleCompanyDividendEventResolvedPayload["event"]
    | null
  >(
    () =>
      initialPendingCompanyDividendEvent ??
      null,
  );

  const applyCompanyDividendEventResolved =
    useCallback(
      (
        payload:
          UlsanMarbleCompanyDividendEventResolvedPayload,
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
          controllerPlayerId &&
          payload.controllerPlayerId !==
            controllerPlayerId
        ) {
          return false;
        }

        if (
          appliedResolutionIdsRef
            .current
            .has(
              payload.resolutionId,
            )
        ) {
          return true;
        }

        const beforeModifiers =
          companyDividendModifiersRef.current;

        companyDividendModifiersRef.current =
          applyCompanyDividendEvent(
            beforeModifiers,
            payload.event,
          );

        console.log(
          "[COMPANY DIVIDEND EVENT]",
          {
            turnNumber,
            event: payload.event,
            before:
              beforeModifiers[
                payload.event.companyId
              ],
            after:
              companyDividendModifiersRef
                .current[
                  payload.event.companyId
                ],
          },
        );

        setPendingCompanyDividendEvent(
          payload.event,
        );

        appliedResolutionIdsRef
          .current
          .add(
            payload.resolutionId,
          );

        if (
          publishedResolutionIdRef
            .current ===
          payload.resolutionId
        ) {
          publishedResolutionIdRef.current =
            null;
        }

        /*
         * 모든 클라이언트가 modifier를
         * 먼저 적용한 뒤 주식시장으로 진행한다.
         *
         * 실제 STOCK 이벤트 발행은
         * startStockMarketResolution 내부의
         * controller gate가 담당한다.
         */
        startStockMarketResolution(
          "SCHEDULED",
          payload
            .additionallyDisabledPlayerIds,
          payload
            .macroStockMarketBias,
        );

        return true;
      },
      [
        companyDividendModifiersRef,
        controllerPlayerId,
        startStockMarketResolution,
        turnNumber,
        turnSequence,
      ],
    );


  const startCompanyDividendEventResolution =
    useCallback(
      (
        mode:
          StockMarketResolutionMode,

        additionallyDisabledPlayerIds:
          string[] = [],

        macroStockMarketBias:
          number = 0,
      ): boolean => {
        /*
         * DEV 정산은 회사 이벤트를
         * 거치지 않는다.
         */
        if (
          mode !== "SCHEDULED"
        ) {
          return startStockMarketResolution(
            mode,
            additionallyDisabledPlayerIds,
            macroStockMarketBias,
          );
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        /*
         * 네트워크 난수는
         * 고정 controller만 소비한다.
         */
        if (
          isNetworkGame &&
          controllerPlayerId !==
            localPlayerId
        ) {
          return true;
        }

        if (
          publishedResolutionIdRef
            .current
        ) {
          return true;
        }

        const event =
          resolveCompanyDividendEvent(
            stockCompanies,
            companyDividendModifiersRef.current,
            turnNumber,
            macroEconomyStateRef
              .current
              .regime,
          );

        /*
         * 12% 추첨 실패.
         *
         * 별도 GAME_EVENT 없이
         * 바로 주식시장 정산으로 진행.
         */
        if (!event) {
          return startStockMarketResolution(
            "SCHEDULED",
            additionallyDisabledPlayerIds,
            macroStockMarketBias,
          );
        }

        const resolutionId =
          createResolutionId(
            turnSequence,
            turnNumber,
          );

        const resolvedControllerPlayerId =
          controllerPlayerId ??
          localPlayerId;

        const payload:
          UlsanMarbleCompanyDividendEventResolvedPayload = {
            resolutionId,

            controllerPlayerId:
              resolvedControllerPlayerId,

            turnNumber,
            turnSequence,

            event,

            macroStockMarketBias,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],
          };

        publishedResolutionIdRef.current =
          resolutionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "COMPANY_DIVIDEND_EVENT_RESOLVED",

              payload,
            });

            return true;
          } catch (error) {
            publishedResolutionIdRef.current =
              null;

            throw error;
          }
        }

        const applied =
          applyCompanyDividendEventResolved(
            payload,
          );

        if (!applied) {
          publishedResolutionIdRef.current =
            null;
        }

        return applied;
      },
      [
        applyCompanyDividendEventResolved,
        companyDividendModifiersRef,
        controllerPlayerId,
        localPlayerId,
        macroEconomyStateRef,
        onNetworkGameEventRequest,
        startStockMarketResolution,
        stockCompanies,
        turnNumber,
        turnSequence,
      ],
    );


  const resetCompanyDividendEventResolution =
    useCallback(
      () => {
        appliedResolutionIdsRef
          .current
          .clear();

        publishedResolutionIdRef.current =
          null;

        setPendingCompanyDividendEvent(
          null,
        );  
      },
      [],
    );

  const dismissCompanyDividendEvent =
    useCallback(
      () => {
        setPendingCompanyDividendEvent(
          null,
        );
      },
      [],
    );

  return {
  pendingCompanyDividendEvent,

  startCompanyDividendEventResolution,

  applyCompanyDividendEventResolved,

  dismissCompanyDividendEvent,

  resetCompanyDividendEventResolution,
};
}