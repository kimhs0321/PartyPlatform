import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { PropertyData } from "../../types";
import type {
  UlsanMarbleCityHallActionDecidedPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import {
  isMaxDevelopmentStage,
} from "../property/propertyDevelopment";
import {
  removeDevelopmentRestriction,
} from "../property/developmentRestrictionRules";
import type {
  DevelopmentRestrictionMap,
} from "../property/developmentRestrictionTypes";
import type {
  PropertyOwnershipMap,
} from "../property/propertyTypes";

import { CITY_HALL_PROJECTS } from "./cityHallProjects";
import {
  activateRandomCityHallProject,
  applyResolvedCityHallProjectTerm,
  grantCityHallDevelopmentSupport,
  grantCityHallPropertyTaxSupport,
} from "./cityHallRules";
import type {
  CityHallApplicationType,
  CityHallProjectTerm,
  CityHallState,
  PendingCityHallSelection,
} from "./cityHallTypes";
import type {NetworkGameEventApplyResult,} from "../network/useNetworkGameEvents";

type ValueRef<T> = {
  current: T;
};

interface StartCityHallVisitInput {
  playerId: string;
  visitId: string;
  turnSequence: number;
}

interface UseCityHallResolutionOptions {
  pendingCityHallSelection: PendingCityHallSelection | null;

  setPendingCityHallSelection: Dispatch<
    SetStateAction<PendingCityHallSelection | null>
  >;

  cityHallStateRef: ValueRef<CityHallState>;
  developmentRestrictionsRef: ValueRef<DevelopmentRestrictionMap>;
  propertyOwnershipsRef: ValueRef<PropertyOwnershipMap>;

  properties: PropertyData[];
  stockIndustryIds: string[];

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;
  isTileResolutionReady: boolean;

  commitCityHallState: (state: CityHallState) => void;
  commitDevelopmentRestrictions: (
    restrictions: DevelopmentRestrictionMap,
  ) => void;

  completeTileResolution: () => void;

  onNetworkGameEventRequest?: (
    event: UlsanMarbleGameEventRequest,
  ) => void;
}

export function useCityHallResolution({
  pendingCityHallSelection,
  setPendingCityHallSelection,

  cityHallStateRef,
  developmentRestrictionsRef,
  propertyOwnershipsRef,

  properties,
  stockIndustryIds,

  localPlayerId,

  turnNumber,
  turnSequence,

  commitCityHallState,
  commitDevelopmentRestrictions,

  completeTileResolution,
  isTileResolutionReady,
  onNetworkGameEventRequest,
}: UseCityHallResolutionOptions) {
  const pendingRef = useRef<PendingCityHallSelection | null>(
    pendingCityHallSelection,
  );

  const publishingActionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pendingRef.current = pendingCityHallSelection;
  }, [pendingCityHallSelection]);

  const commitPending = useCallback(
    (next: PendingCityHallSelection | null) => {
      pendingRef.current = next;
      setPendingCityHallSelection(next);
    },
    [setPendingCityHallSelection],
  );

  const applyCityHallActionDecided = useCallback(
    (payload: UlsanMarbleCityHallActionDecidedPayload,): NetworkGameEventApplyResult => {
      if (
        payload.turnSequence !==
        turnSequence
      ) {
        if (
          turnSequence <
          payload.turnSequence
        ) {
          return "WAIT";
        }

        return "INVALID";
      }

      if (
        payload.turnNumber !==
        turnNumber
      ) {
        if (
          turnNumber <
          payload.turnNumber
        ) {
          return "WAIT";
        }

        return "INVALID";
      }

      if (payload.action === "START") {
        const currentPending = pendingRef.current;

        if (
          currentPending?.visitId === payload.visitId &&
          currentPending.turnSequence === payload.turnSequence
        ) {
          publishingActionIdsRef.current.delete(payload.actionId);
          return "ALREADY_APPLIED";
        }

        const project = CITY_HALL_PROJECTS.find(
          (candidate) => candidate.id === payload.projectId,
        );
        if (!project) return "INVALID";

        if (
          payload.selectedTurn !== payload.turnNumber ||
          payload.activeFromTurn !== payload.selectedTurn ||
          payload.expiresAfterTurn !==
            payload.activeFromTurn + project.durationTurns - 1
        ) {
          return "INVALID";
        }

        if (
          project.targetType === "NONE" &&
          payload.targetIndustryId !== null
        ) {
          return "INVALID";
        }

        if (
          project.targetType === "STOCK_INDUSTRY" &&
          payload.targetIndustryId !== null &&
          !stockIndustryIds.includes(payload.targetIndustryId)
        ) {
          return "INVALID";
        }

        const term: CityHallProjectTerm = {
          instanceId: payload.instanceId,
          project,
          selectedByPlayerId: payload.playerId,
          selectedTurn: payload.selectedTurn,
          activeFromTurn: payload.activeFromTurn,
          expiresAfterTurn: payload.expiresAfterTurn,
          targetIndustryId: payload.targetIndustryId,
          oneTimeEffectConsumed: false,
        };

        commitCityHallState(
          applyResolvedCityHallProjectTerm(
            cityHallStateRef.current,
            term,
          ),
        );

        commitPending({
          playerId: payload.playerId,
          visitId: payload.visitId,
          turnSequence: payload.turnSequence,
          activatedTerm: term,
          stage: "APPLICATION",
          applicationType: null,
          propertyId: null,
          resultText: null,
        });

        publishingActionIdsRef.current.delete(payload.actionId);
        return "APPLIED";
      }

      const currentPending = pendingRef.current;

      if (
        !currentPending ||
        currentPending.playerId !== payload.playerId ||
        currentPending.visitId !== payload.visitId ||
        currentPending.turnSequence !== payload.turnSequence
      ) {
        return "INVALID";
      }

      if (payload.action === "APPLY") {
        if (currentPending.stage !== "APPLICATION") return "INVALID";

        const ownership =
          propertyOwnershipsRef.current[payload.propertyId];

        if (
          !ownership ||
          ownership.ownerPlayerId !== payload.playerId
        ) {
          return "INVALID";
        }

        const property = properties.find(
          (candidate) => candidate.id === payload.propertyId,
        );
        if (!property) return "INVALID";

        const applicationType =
          payload.applicationType as CityHallApplicationType;

        let resultText: string;

        if (applicationType === "DEVELOPMENT_PERMIT") {
          if (!developmentRestrictionsRef.current[payload.propertyId]) {
            return "INVALID";
          }

          commitDevelopmentRestrictions(
            removeDevelopmentRestriction(
              developmentRestrictionsRef.current,
              payload.propertyId,
            ),
          );

          resultText =
            `${property.name} 개발 제한 해제 승인`;
        } else if (applicationType === "DEVELOPMENT_SUPPORT") {
          if (isMaxDevelopmentStage(ownership.stage)) {
            return "INVALID";
          }

          commitCityHallState(
            grantCityHallDevelopmentSupport(
              cityHallStateRef.current,
              payload.playerId,
              payload.propertyId,
              payload.turnNumber,
            ),
          );

          resultText =
            `${property.name} 다음 개발비 30% 지원 승인`;
        } else if (applicationType === "PROPERTY_TAX_SUPPORT") {
          commitCityHallState(
            grantCityHallPropertyTaxSupport(
              cityHallStateRef.current,
              payload.playerId,
              payload.propertyId,
              payload.turnNumber,
            ),
          );

          resultText =
            `${property.name} 다음 부동산세 30% 지원 승인`;
        } else {
          return "INVALID";
        }

        commitPending({
          ...currentPending,
          stage: "COMPLETED",
          applicationType,
          propertyId: payload.propertyId,
          resultText,
        });

        publishingActionIdsRef.current.delete(payload.actionId);
        return "APPLIED";
      }

      if (payload.action === "CLOSE") {
        if (!isTileResolutionReady) {
          console.log(
            "[CITY HALL CLOSE WAIT TILE]",
            "visitId =",
            payload.visitId,
          );

          return "WAIT";
        }

        commitPending(null);
        publishingActionIdsRef.current.delete(payload.actionId);

        completeTileResolution();

        return "APPLIED";
      }

      return "INVALID";
    },
    [
      cityHallStateRef,
      commitCityHallState,
      commitDevelopmentRestrictions,
      commitPending,
      completeTileResolution,
      developmentRestrictionsRef,
      properties,
      propertyOwnershipsRef,
      stockIndustryIds,
      turnNumber,
      turnSequence,
      isTileResolutionReady,
    ],
  );

  const publishAction = useCallback(
    (
      payload: UlsanMarbleCityHallActionDecidedPayload,
    ): boolean => {
      if (publishingActionIdsRef.current.has(payload.actionId)) {
        return true;
      }

      publishingActionIdsRef.current.add(payload.actionId);

      if (onNetworkGameEventRequest) {
        onNetworkGameEventRequest({
          kind: "CITY_HALL_ACTION_DECIDED",
          payload,
        });
        return true;
      }

      const result =
        applyCityHallActionDecided(payload);

      if (
        result === "WAIT" ||
        result === "INVALID"
      ) {
        publishingActionIdsRef.current.delete(
          payload.actionId,
        );

        return false;
      }

      return true;
    },
    [applyCityHallActionDecided, onNetworkGameEventRequest],
  );

  const startCityHallVisit = useCallback(
    ({
      playerId,
      visitId,
      turnSequence: visitTurnSequence,
    }: StartCityHallVisitInput): boolean => {
      if (visitTurnSequence !== turnSequence) return false;

      if (
        onNetworkGameEventRequest &&
        playerId !== localPlayerId
      ) {
        return true;
      }

      const existing = pendingRef.current;

      if (
        existing?.visitId === visitId &&
        existing.turnSequence === visitTurnSequence
      ) {
        return true;
      }

      const activation = activateRandomCityHallProject(
        cityHallStateRef.current,
        playerId,
        turnNumber,
        stockIndustryIds,
      );

      const term = activation.term;

      return publishAction({
        actionId: `${visitId}:START`,
        action: "START",

        playerId,
        visitId,

        turnNumber,
        turnSequence: visitTurnSequence,

        projectId: term.project.id,
        instanceId: term.instanceId,

        selectedTurn: term.selectedTurn,
        activeFromTurn: term.activeFromTurn,
        expiresAfterTurn: term.expiresAfterTurn,

        targetIndustryId: term.targetIndustryId,
      });
    },
    [
      cityHallStateRef,
      localPlayerId,
      onNetworkGameEventRequest,
      publishAction,
      stockIndustryIds,
      turnNumber,
      turnSequence,
    ],
  );

  const submitPendingCityHallApplication = useCallback(
    (
      applicationType: CityHallApplicationType,
      propertyId: string,
    ): void => {
      const pending = pendingRef.current;

      if (!pending || pending.stage !== "APPLICATION") return;

      if (
        onNetworkGameEventRequest &&
        pending.playerId !== localPlayerId
      ) {
        return;
      }

      const ownership =
        propertyOwnershipsRef.current[propertyId];

      if (
        !ownership ||
        ownership.ownerPlayerId !== pending.playerId
      ) {
        return;
      }

      if (
        applicationType === "DEVELOPMENT_PERMIT" &&
        !developmentRestrictionsRef.current[propertyId]
      ) {
        return;
      }

      if (
        applicationType === "DEVELOPMENT_SUPPORT" &&
        isMaxDevelopmentStage(ownership.stage)
      ) {
        return;
      }

      publishAction({
        actionId: [
          pending.visitId,
          "APPLY",
          applicationType,
          propertyId,
        ].join(":"),

        action: "APPLY",

        playerId: pending.playerId,
        visitId: pending.visitId,

        turnNumber: pending.activatedTerm.selectedTurn,
        turnSequence: pending.turnSequence,

        applicationType,
        propertyId,
      });
    },
    [
      developmentRestrictionsRef,
      localPlayerId,
      onNetworkGameEventRequest,
      propertyOwnershipsRef,
      publishAction,
    ],
  );

  const closePendingCityHallApplication = useCallback((): void => {
    const pending = pendingRef.current;
    if (!pending) return;

    if (
      onNetworkGameEventRequest &&
      pending.playerId !== localPlayerId
    ) {
      return;
    }

    publishAction({
      actionId: `${pending.visitId}:CLOSE`,
      action: "CLOSE",

      playerId: pending.playerId,
      visitId: pending.visitId,

      turnNumber: pending.activatedTerm.selectedTurn,
      turnSequence: pending.turnSequence,
    });
  }, [
    localPlayerId,
    onNetworkGameEventRequest,
    publishAction,
  ]);

  const resetCityHallResolution = useCallback(() => {
    publishingActionIdsRef.current.clear();
    commitPending(null);
  }, [commitPending]);

  const canInteractWithCityHall =
    Boolean(pendingCityHallSelection) &&
    (
      !onNetworkGameEventRequest ||
      pendingCityHallSelection?.playerId === localPlayerId
    );

  return {
    startCityHallVisit,
    submitPendingCityHallApplication,
    closePendingCityHallApplication,

    canInteractWithCityHall,

    applyCityHallActionDecided,
    resetCityHallResolution,
  };
}