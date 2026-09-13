import {
  useCallback,
  useRef,
} from "react";

import type {
  MutableRefObject,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleMacroEconomyResolvedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import {
  resolveMacroEconomyTurn,
} from "./macroEconomyRules";

import type {
  MacroEconomyState,
} from "./macroEconomyTypes";

interface UseMacroEconomyResolutionOptions {
  macroEconomyStateRef:
    MutableRefObject<
      MacroEconomyState
    >;

  commitMacroEconomyState: (
    nextState:
      MacroEconomyState,
  ) => void;

  localPlayerId: string;

  controllerPlayerId?:
    string;

  turnNumber: number;
  turnSequence: number;

  startStockMarketResolution: (
    mode:
      | "SCHEDULED"
      | "DEV",

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
    "MACRO_ECONOMY",
    turnSequence,
    turnNumber,
  ].join(":");
}

export function useMacroEconomyResolution({
  macroEconomyStateRef,
  commitMacroEconomyState,

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  startStockMarketResolution,

  onNetworkGameEventRequest,
}: UseMacroEconomyResolutionOptions) {
  const appliedResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const publishedResolutionIdRef =
    useRef<string | null>(
      null,
    );

  const applyMacroEconomyResolved =
    useCallback(
      (
        payload:
          UlsanMarbleMacroEconomyResolvedPayload,
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

        const nextState:
          MacroEconomyState = {
            ...payload.nextState,

            pendingReports:
              payload.nextState
                .pendingReports
                .map(
                  (report) => ({
                    ...report,
                  }),
                ),

            reportHistory:
              payload.nextState
                .reportHistory
                .map(
                  (report) => ({
                    ...report,
                  }),
                ),
          };

        commitMacroEconomyState(
          nextState,
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
          publishedResolutionIdRef
            .current =
            null;
        }

        /*
         * 경기 국면 적용이 끝난 뒤
         * 같은 정산 턴의 주식시장으로
         * 바로 이어진다.
         *
         * 실제 주식 결과 계산/발행은
         * stock hook의 controller gate가
         * 다시 보장한다.
         */
        startStockMarketResolution(
          "SCHEDULED",

          payload
            .additionallyDisabledPlayerIds,

          payload.stockMarketBias,
        );

        return true;
      },
      [
        commitMacroEconomyState,
        controllerPlayerId,
        startStockMarketResolution,
        turnNumber,
        turnSequence,
      ],
    );

  const startMacroEconomyResolution =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ): boolean => {
        const resolutionId =
          createResolutionId(
            turnSequence,
            turnNumber,
          );

        /*
         * 동일 턴의 macro 정산이 이미
         * 적용됐거나 발행 중이면
         * 다시 난수를 뽑지 않는다.
         */
        if (
          appliedResolutionIdsRef
            .current
            .has(resolutionId)
        ) {
          return true;
        }

        if (
          publishedResolutionIdRef
            .current ===
          resolutionId
        ) {
          return true;
        }

        const isNetworkGame =
          Boolean(
            onNetworkGameEventRequest,
          );

        const resolvedControllerPlayerId =
          controllerPlayerId ??
          localPlayerId;

        /*
         * 멀티에서는 고정 controller만
         * 실제 경기 난수를 계산한다.
         */
        if (
          isNetworkGame &&
          resolvedControllerPlayerId !==
            localPlayerId
        ) {
          return true;
        }

        const result =
          resolveMacroEconomyTurn(
            macroEconomyStateRef.current,
            turnNumber,
          );

        const payload:
          UlsanMarbleMacroEconomyResolvedPayload =
          {
            resolutionId,

            controllerPlayerId:
              resolvedControllerPlayerId,

            turnNumber,
            turnSequence,

            nextState:
              result.state,

            regimeChanged:
              result.regimeChanged,

            previousRegime:
              result.previousRegime,

            currentRegime:
              result.currentRegime,

            interestRateChanged:
              result.interestRateChanged,

            previousInterestRateLevel:
              result
                .previousInterestRateLevel,

            currentInterestRateLevel:
              result
                .currentInterestRateLevel,

            publishedReports:
              result.publishedReports,

            stockMarketBias:
              result.stockMarketBias,

            additionallyDisabledPlayerIds: [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],
          };

        publishedResolutionIdRef
          .current =
          resolutionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "MACRO_ECONOMY_RESOLVED",

              payload,
            });

            return true;
          } catch (error) {
            publishedResolutionIdRef
              .current =
              null;

            throw error;
          }
        }

        const applied =
          applyMacroEconomyResolved(
            payload,
          );

        if (!applied) {
          publishedResolutionIdRef
            .current =
            null;
        }

        return applied;
      },
      [
        applyMacroEconomyResolved,
        controllerPlayerId,
        localPlayerId,
        macroEconomyStateRef,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );

  const resetMacroEconomyResolution =
    useCallback(
      (): void => {
        appliedResolutionIdsRef
          .current
          .clear();

        publishedResolutionIdRef
          .current =
          null;
      },
      [],
    );

  return {
    startMacroEconomyResolution,
    applyMacroEconomyResolved,
    resetMacroEconomyResolution,
  };
}