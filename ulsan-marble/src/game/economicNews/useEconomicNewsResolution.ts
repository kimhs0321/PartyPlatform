import { useCallback, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type {
  UlsanMarbleEconomicNewsAppliedPayload,
  UlsanMarbleEconomicNewsConfirmedPayload,
  UlsanMarbleEconomicNewsDrawDecidedPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type { PropertyData } from "../../types";
import type { PropertyOwnershipMap } from "../property/propertyTypes";
import type { DevelopmentRestrictionMap } from "../property/developmentRestrictionTypes";

import {
  applyDevelopmentRestriction,
  createDevelopmentRestriction,
} from "../property/developmentRestrictionRules";

import { isMaxDevelopmentStage } from "../property/propertyDevelopment";

import type {
  EconomicNewsDefinition,
  EconomicNewsState,
  PendingEconomicNewsResolution,
} from "./economicNewsTypes";

import {
  applyResolvedEconomicNewsActivation,
  drawEconomicNews,
  recordRandomEconomicNewsPublication,
  shouldTriggerRandomEconomicNews,
} from "./economicNewsRules";

interface Options {
  pendingEconomicNews: PendingEconomicNewsResolution | null;
  setPendingEconomicNews: Dispatch<SetStateAction<PendingEconomicNewsResolution | null>>;
  economicNewsStateRef: MutableRefObject<EconomicNewsState>;
  economicNewsPool: EconomicNewsDefinition[];
  propertyOwnershipsRef: MutableRefObject<PropertyOwnershipMap>;
  developmentRestrictionsRef: MutableRefObject<DevelopmentRestrictionMap>;
  properties: PropertyData[];
  localPlayerId: string;
  activePlayerId: string;
  turnNumber: number;
  turnSequence: number;

  commitEconomicNewsState: (state: EconomicNewsState) => void;
  commitDevelopmentRestrictions: (state: DevelopmentRestrictionMap) => void;

  completeTileResolution: () => void;
  startEconomicNewsPhase: () => void;
  cancelCurrentAction: () => void;
  startDisasterResolution: (mode: "SCHEDULED" | "DEV", disabledIds?: string[]) => void;
  onNetworkGameEventRequest?: (event: UlsanMarbleGameEventRequest) => void;
}

function createResolutionId(
  turnSequence: number,
  source: "NEWSPAPER" | "RANDOM" | "DEV",
  playerId: string,
): string {
  return ["ECONOMIC_NEWS", turnSequence, source, playerId].join(":");
}

export function useEconomicNewsResolution({
  pendingEconomicNews,
  setPendingEconomicNews,
  economicNewsStateRef,
  economicNewsPool,
  propertyOwnershipsRef,
  developmentRestrictionsRef,
  properties,
  localPlayerId,
  activePlayerId,
  turnNumber,
  turnSequence,
  commitEconomicNewsState,
  commitDevelopmentRestrictions,
  completeTileResolution,
  startEconomicNewsPhase,
  cancelCurrentAction,
  startDisasterResolution,
  onNetworkGameEventRequest,
}: Options) {
  const publishedDrawIdRef = useRef<string | null>(null);
  const publishedApplyIdRef = useRef<string | null>(null);
  const publishedConfirmIdRef = useRef<string | null>(null);

  const articleMap = new Map(economicNewsPool.map((article) => [article.id, article]));

  const applyDrawDecided = useCallback(
    (
      payload:
        UlsanMarbleEconomicNewsDrawDecidedPayload,
    ): boolean => {if ( payload.turnSequence !== turnSequence
    ) {
      return false;
    }


      if (payload.outcome === "SKIP") {
        publishedDrawIdRef.current = null;

        startDisasterResolution(
          "SCHEDULED",
          payload.additionallyDisabledPlayerIds,
        );

        return true;
      }

      const article = articleMap.get(payload.articleId);
      if (!article) return false;

      const current = economicNewsStateRef.current;

      commitEconomicNewsState({
        ...current,
        drawPile: [...payload.nextDeck.drawPile],
        discardPile: [...payload.nextDeck.discardPile],
        cycle: payload.nextDeck.cycle,
        lastRandomPublishedTurn: payload.nextDeck.lastRandomPublishedTurn,
      });

      setPendingEconomicNews({
        resolutionId: payload.resolutionId,
        controllerPlayerId: payload.controllerPlayerId,
        playerId: payload.playerId,
        article,
        source: payload.source,
        turnNumber: payload.turnNumber,
        turnSequence: payload.turnSequence,
        stage: "DRAWN",
        resultText: null,
        additionallyDisabledPlayerIds: [...payload.additionallyDisabledPlayerIds],
      });

      publishedDrawIdRef.current = null;

      if (payload.source !== "NEWSPAPER") {
        startEconomicNewsPhase();
      }

      return true;
    },
    [
      articleMap,
      commitEconomicNewsState,
      economicNewsStateRef,
      setPendingEconomicNews,
      startDisasterResolution,
      startEconomicNewsPhase,
      turnSequence,
    ]
  );

  const publishDraw = useCallback(
    (payload: UlsanMarbleEconomicNewsDrawDecidedPayload) => {
      if (publishedDrawIdRef.current === payload.resolutionId) return;
      publishedDrawIdRef.current = payload.resolutionId;

      if (onNetworkGameEventRequest) {
        onNetworkGameEventRequest({ kind: "ECONOMIC_NEWS_DRAW_DECIDED", payload });
        return;
      }

      if (!applyDrawDecided(payload)) publishedDrawIdRef.current = null;
    },
    [applyDrawDecided, onNetworkGameEventRequest],
  );

  const startNewspaperEconomicNews = useCallback(
    (playerId: string) => {
      if (onNetworkGameEventRequest && playerId !== localPlayerId) return;

      const drawResult = drawEconomicNews(economicNewsStateRef.current, economicNewsPool);
      const resolutionId = createResolutionId(turnSequence, "NEWSPAPER", playerId);

      publishDraw({
        resolutionId,
        controllerPlayerId: playerId,
        outcome: "DRAWN",
        source: "NEWSPAPER",
        playerId,
        articleId: drawResult.article.id,
        turnNumber,
        turnSequence,
        additionallyDisabledPlayerIds: [],
        nextDeck: {
          drawPile: [...drawResult.state.drawPile],
          discardPile: [...drawResult.state.discardPile],
          cycle: drawResult.state.cycle,
          lastRandomPublishedTurn: drawResult.state.lastRandomPublishedTurn,
        },
      });
    },
    [
      economicNewsPool,
      economicNewsStateRef,
      localPlayerId,
      onNetworkGameEventRequest,
      publishDraw,
      turnNumber,
      turnSequence,
    ],
  );

  const startRandomEconomicNewsResolution =
    useCallback(
      (
        mode: "SCHEDULED" | "DEV",
        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        if (
          onNetworkGameEventRequest &&
          activePlayerId !== localPlayerId
        ) {
          return;
        }

        const source =
          mode === "DEV"
            ? "DEV"
            : "RANDOM";

        const resolutionId =
          createResolutionId(
            turnSequence,
            source,
            activePlayerId,
          );

        const disabledIds = [
          ...new Set(
            additionallyDisabledPlayerIds,
          ),
        ];

        const shouldStart =
          mode === "DEV" ||
          shouldTriggerRandomEconomicNews(
            economicNewsStateRef.current,
            turnNumber,
          );

        if (!shouldStart) {
          publishDraw({
            resolutionId,
            controllerPlayerId:
              activePlayerId,
            outcome: "SKIP",
            source: "RANDOM",
            turnNumber,
            turnSequence,
            additionallyDisabledPlayerIds:
              disabledIds,
          });

          return;
        }

        const drawResult =
          drawEconomicNews(
            economicNewsStateRef.current,
            economicNewsPool,
          );

        const nextState =
          mode === "DEV"
            ? drawResult.state
            : recordRandomEconomicNewsPublication(
                drawResult.state,
                turnNumber,
              );

        publishDraw({
          resolutionId,
          controllerPlayerId:
            activePlayerId,
          outcome: "DRAWN",
          source,

          playerId:
            mode === "DEV"
              ? activePlayerId
              : null,

          articleId:
            drawResult.article.id,

          turnNumber,
          turnSequence,

          additionallyDisabledPlayerIds:
            disabledIds,

          nextDeck: {
            drawPile: [
              ...nextState.drawPile,
            ],
            discardPile: [
              ...nextState.discardPile,
            ],
            cycle:
              nextState.cycle,
            lastRandomPublishedTurn:
              nextState.lastRandomPublishedTurn,
          },
        });
      },
      [
        activePlayerId,
        economicNewsPool,
        economicNewsStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        publishDraw,
        turnNumber,
        turnSequence,
      ],
    );

  const applyEconomicNewsApplied = useCallback(
    (payload: UlsanMarbleEconomicNewsAppliedPayload): boolean => {
      const pending = pendingEconomicNews;

      if (
        !pending ||
        pending.resolutionId !== payload.resolutionId ||
        pending.turnSequence !== payload.turnSequence ||
        pending.article.id !== payload.articleId
      ) {
        return false;
      }

      const nextNewsState = applyResolvedEconomicNewsActivation(
        economicNewsStateRef.current,
        pending.article,
        payload.turnNumber,
        pending.source,
        payload.activeFromTurn,
        payload.instanceId,
      );

      commitEconomicNewsState(nextNewsState);

      if (payload.developmentRestrictionPropertyId) {
        const restriction = createDevelopmentRestriction(
          payload.developmentRestrictionPropertyId,
          payload.turnNumber,
          pending.article.effect.type === "DEVELOPMENT_RESTRICTION"
            ? pending.article.effect.durationTurns
            : 0,
          "ECONOMIC_NEWS",
        );

        commitDevelopmentRestrictions(
          applyDevelopmentRestriction(developmentRestrictionsRef.current, restriction),
        );
      }

      setPendingEconomicNews({
        ...pending,
        playerId: payload.affectedPlayerId,
        stage: "APPLIED",
        resultText: payload.resultText,
      });

      publishedApplyIdRef.current = null;
      return true;
    },
    [
      commitDevelopmentRestrictions,
      commitEconomicNewsState,
      developmentRestrictionsRef,
      economicNewsStateRef,
      pendingEconomicNews,
      setPendingEconomicNews,
    ],
  );

  const applyPendingEconomicNews = useCallback(() => {
    const pending = pendingEconomicNews;
    if (!pending || pending.stage !== "DRAWN") return;

    if (onNetworkGameEventRequest && pending.controllerPlayerId !== localPlayerId) return;

    const article = pending.article;
    const activationDelay = 1 + Math.floor(Math.random() * 3);
    const activeFromTurn = pending.turnNumber + activationDelay;
    const instanceId =
      `news-${article.id}-${pending.turnNumber}-${pending.turnSequence}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    let affectedPlayerId = pending.playerId;
    let developmentRestrictionPropertyId: string | null = null;
    let resultText = `${article.effectDescription} 관련 뉴스가 시장에 반영될 예정입니다.`;

    if (article.effect.type === "DEVELOPMENT_RESTRICTION") {
      const candidates = Object.values(propertyOwnershipsRef.current).filter((ownership) => {
        const existing = developmentRestrictionsRef.current[ownership.propertyId];

        return (
          !isMaxDevelopmentStage(ownership.stage) &&
          (!existing || existing.expiresAfterTurn < pending.turnNumber) &&
          properties.some((property) => property.id === ownership.propertyId)
        );
      });

      const target =
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : null;

      if (target) {
        const property = properties.find((item) => item.id === target.propertyId);

        developmentRestrictionPropertyId = target.propertyId;
        affectedPlayerId = target.ownerPlayerId;

        resultText = property
          ? `${property.name}에 다음 턴부터 ${article.effect.durationTurns}턴간 개발 제한이 적용됩니다.`
          : `선정된 부동산에 다음 턴부터 ${article.effect.durationTurns}턴간 개발 제한이 적용됩니다.`;
      } else {
        resultText = "개발 가능한 보유 부동산이 없어 개발 제한 명령이 취소되었습니다.";
      }
    }

    const payload: UlsanMarbleEconomicNewsAppliedPayload = {
      resolutionId: pending.resolutionId,
      controllerPlayerId: pending.controllerPlayerId,
      source: pending.source,
      articleId: article.id,
      affectedPlayerId,
      turnNumber: pending.turnNumber,
      turnSequence: pending.turnSequence,
      activeFromTurn,
      instanceId,
      developmentRestrictionPropertyId,
      resultText,
      additionallyDisabledPlayerIds: [...pending.additionallyDisabledPlayerIds],
    };

    if (publishedApplyIdRef.current === pending.resolutionId) return;
    publishedApplyIdRef.current = pending.resolutionId;

    if (onNetworkGameEventRequest) {
      onNetworkGameEventRequest({ kind: "ECONOMIC_NEWS_APPLIED", payload });
      return;
    }

    if (!applyEconomicNewsApplied(payload)) publishedApplyIdRef.current = null;
  }, [
    applyEconomicNewsApplied,
    developmentRestrictionsRef,
    localPlayerId,
    onNetworkGameEventRequest,
    pendingEconomicNews,
    properties,
    propertyOwnershipsRef,
  ]);

  const applyEconomicNewsConfirmed = useCallback(
    (payload: UlsanMarbleEconomicNewsConfirmedPayload): boolean => {
      const pending = pendingEconomicNews;

      if (
        !pending ||
        pending.stage !== "APPLIED" ||
        pending.resolutionId !== payload.resolutionId ||
        pending.turnSequence !== payload.turnSequence
      ) {
        return false;
      }

      setPendingEconomicNews(null);
      publishedConfirmIdRef.current = null;

      if (pending.source === "NEWSPAPER") {
        completeTileResolution();
      } else if (pending.source === "DEV") {
        cancelCurrentAction();
      } else {
        startDisasterResolution("SCHEDULED", pending.additionallyDisabledPlayerIds);
      }

      return true;
    },
    [
      cancelCurrentAction,
      completeTileResolution,
      pendingEconomicNews,
      setPendingEconomicNews,
      startDisasterResolution,
    ],
  );

  const closePendingEconomicNews = useCallback(() => {
    const pending = pendingEconomicNews;
    if (!pending || pending.stage !== "APPLIED") return;

    if (onNetworkGameEventRequest && pending.controllerPlayerId !== localPlayerId) return;
    if (publishedConfirmIdRef.current === pending.resolutionId) return;

    const payload: UlsanMarbleEconomicNewsConfirmedPayload = {
      resolutionId: pending.resolutionId,
      controllerPlayerId: pending.controllerPlayerId,
      source: pending.source,
      turnNumber: pending.turnNumber,
      turnSequence: pending.turnSequence,
      additionallyDisabledPlayerIds: [...pending.additionallyDisabledPlayerIds],
    };

    publishedConfirmIdRef.current = pending.resolutionId;

    if (onNetworkGameEventRequest) {
      onNetworkGameEventRequest({ kind: "ECONOMIC_NEWS_CONFIRMED", payload });
      return;
    }

    if (!applyEconomicNewsConfirmed(payload)) publishedConfirmIdRef.current = null;
  }, [
    applyEconomicNewsConfirmed,
    localPlayerId,
    onNetworkGameEventRequest,
    pendingEconomicNews,
  ]);

  const canInteractWithEconomicNews =
    Boolean(pendingEconomicNews) &&
    (!onNetworkGameEventRequest ||
      pendingEconomicNews?.controllerPlayerId === localPlayerId);

  const resetEconomicNewsResolution = useCallback(() => {
    publishedDrawIdRef.current = null;
    publishedApplyIdRef.current = null;
    publishedConfirmIdRef.current = null;
    setPendingEconomicNews(null);
  }, [setPendingEconomicNews]);

  return {
    startNewspaperEconomicNews,
    startRandomEconomicNewsResolution,

    applyPendingEconomicNews,
    closePendingEconomicNews,

    applyEconomicNewsDrawDecided: applyDrawDecided,
    applyEconomicNewsApplied,
    applyEconomicNewsConfirmed,

    canInteractWithEconomicNews,
    resetEconomicNewsResolution,
  };
}