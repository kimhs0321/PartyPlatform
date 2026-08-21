import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarblePropertyDevelopmentDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import {
  consumeAuctionItem,
  hasAuctionItem,
} from "../auction/auctionRules";

import type {
  AuctionState,
} from "../auction/auctionTypes";

import {
  consumeCityHallDevelopmentSupport,
} from "../cityHall/cityHallRules";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  isDevelopmentRestricted,
} from "./developmentRestrictionRules";

import type {
  DevelopmentRestrictionMap,
} from "./developmentRestrictionTypes";

import {
  getDevelopmentStageLabel,
  getNextDevelopmentStage,
} from "./propertyDevelopment";

import {
  getPropertyOwnership,
} from "./propertyRules";

import type {
  PendingPropertyDevelopment,
  PropertyDevelopmentError,
  PropertyOwnershipMap,
} from "./propertyTypes";

interface UsePropertyDevelopmentResolutionOptions {
  pendingPropertyDevelopment:
    PendingPropertyDevelopment | null;

  setPendingPropertyDevelopment:
    Dispatch<
      SetStateAction<
        PendingPropertyDevelopment | null
      >
    >;

  setPropertyDevelopmentError:
    Dispatch<
      SetStateAction<
        PropertyDevelopmentError | null
      >
    >;

  pendingDevelopmentCost:
    number | null;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  propertyOwnershipsRef:
    MutableRefObject<
      PropertyOwnershipMap
    >;

  developmentRestrictionsRef:
    MutableRefObject<
      DevelopmentRestrictionMap
    >;

  auctionStateRef:
    MutableRefObject<
      AuctionState
    >;

  cityHallStateRef:
    MutableRefObject<
      CityHallState
    >;

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  withdraw: (
    playerId: string,
    amount: number,
    reason: TransactionReason,
    memo?: string,
  ) => MoneyOperationResult;

  commitAuctionState: (
    state: AuctionState,
  ) => void;

  commitCityHallState: (
    state: CityHallState,
  ) => void;

  commitPropertyOwnerships: (
    ownerships:
      PropertyOwnershipMap,
  ) => void;

  completeTileResolution:
    () => void;
}

export function usePropertyDevelopmentResolution({
  pendingPropertyDevelopment,
  setPendingPropertyDevelopment,
  setPropertyDevelopmentError,

  pendingDevelopmentCost,

  playersRef,
  propertyOwnershipsRef,
  developmentRestrictionsRef,
  auctionStateRef,
  cityHallStateRef,

  localPlayerId,

  turnNumber,
  turnSequence,

  onNetworkGameEventRequest,

  canPlayerAfford,
  withdraw,

  commitAuctionState,
  commitCityHallState,
  commitPropertyOwnerships,

  completeTileResolution,
}: UsePropertyDevelopmentResolutionOptions) {
  const propertyDevelopmentPublishRef =
    useRef<string | null>(null);

  const applyPropertyDevelopmentDecided =
    useCallback(
      (
        payload:
          UlsanMarblePropertyDevelopmentDecidedPayload,
      ): boolean => {
        const pending =
          pendingPropertyDevelopment;

        if (!pending) {
          return false;
        }

        const {
          property,
          propertyId,
          playerId,
        } = pending;

        if (
          playerId !==
            payload.playerId ||
          propertyId !==
            payload.propertyId
        ) {
          return false;
        }

        const currentOwnership =
          getPropertyOwnership(
            propertyOwnershipsRef.current,
            propertyId,
          );

        if (
          !currentOwnership ||
          currentOwnership
            .ownerPlayerId !==
            playerId ||
          currentOwnership.stage !==
            payload.currentStage
        ) {
          return false;
        }

        /*
         * 개발 거절도 서버 이벤트를 받은 뒤
         * 모든 클라이언트에서 동일하게 종료한다.
         */
        if (
          payload.action ===
          "DECLINE"
        ) {
          propertyDevelopmentPublishRef.current =
            null;

          setPropertyDevelopmentError(
            null,
          );

          completeTileResolution();

          return true;
        }

        const expectedNextStage =
          getNextDevelopmentStage(
            currentOwnership.stage,
          );

        if (
          !expectedNextStage ||
          expectedNextStage !==
            payload.nextStage ||
          currentOwnership
            .constructionInvestment !==
            payload.currentConstructionInvestment
        ) {
          return false;
        }

        if (
          payload
            .nextConstructionInvestment !==
          currentOwnership
            .constructionInvestment +
            payload.constructionCost
        ) {
          return false;
        }

        /*
         * 이벤트 발행 시점과 적용 시점의
         * 건설지원 아이템 상태가 같은지 검증한다.
         */
        const hasConstructionSupportItem =
          hasAuctionItem(
            auctionStateRef.current,
            playerId,
            "CONSTRUCTION_SUPPORT",
          );

        if (
          hasConstructionSupportItem !==
          payload
            .usedConstructionSupportItem
        ) {
          return false;
        }

        const consumedConstructionSupport =
          payload
            .usedConstructionSupportItem
            ? consumeAuctionItem(
                auctionStateRef.current,
                playerId,
                "CONSTRUCTION_SUPPORT",
              )
            : null;

        if (
          payload
            .usedConstructionSupportItem &&
          !consumedConstructionSupport
        ) {
          return false;
        }

        /*
         * 시청 개발지원 역시 현재 상태와
         * 발행된 결과가 같은지 검증한다.
         */
        const nextCityHallState =
          consumeCityHallDevelopmentSupport(
            cityHallStateRef.current,
            playerId,
            propertyId,
          );

        const hasCityHallDevelopmentSupport =
          nextCityHallState !==
          cityHallStateRef.current;

        if (
          hasCityHallDevelopmentSupport !==
          payload
            .usedCityHallDevelopmentSupport
        ) {
          return false;
        }

        /*
         * 검증이 모두 끝난 다음 실제 비용을 차감한다.
         */
        const constructionResult =
          withdraw(
            playerId,
            payload.constructionCost,
            "CONSTRUCTION",
            `${property.name} ${getDevelopmentStageLabel(
              payload.nextStage,
            )}`,
          );

        if (!constructionResult.ok) {
          console.error(
            "[UlsanMarble] 동기화된 개발 비용 차감에 실패했습니다.",
            {
              payload,
              error:
                constructionResult.error,
            },
          );

          return false;
        }

        if (
          consumedConstructionSupport
        ) {
          commitAuctionState(
            consumedConstructionSupport
              .state,
          );
        }

        if (
          payload
            .usedCityHallDevelopmentSupport
        ) {
          commitCityHallState(
            nextCityHallState,
          );
        }

        commitPropertyOwnerships({
          ...propertyOwnershipsRef.current,

          [propertyId]: {
            ...currentOwnership,

            stage:
              payload.nextStage,

            constructionInvestment:
              payload
                .nextConstructionInvestment,

            lastDevelopedTurn:
              payload.developedTurn,
          },
        });

        propertyDevelopmentPublishRef.current =
          null;

        setPropertyDevelopmentError(
          null,
        );

        completeTileResolution();

        return true;
      },
      [
        commitAuctionState,
        commitCityHallState,
        commitPropertyOwnerships,
        completeTileResolution,
        pendingPropertyDevelopment,
        propertyOwnershipsRef,
        auctionStateRef,
        cityHallStateRef,
        setPropertyDevelopmentError,
        withdraw,
      ],
    );

  const publishPropertyDevelopmentDecision =
    useCallback(
      (
        payload:
          UlsanMarblePropertyDevelopmentDecidedPayload,
      ): void => {
        const requestKey = [
          turnSequence,
          payload.playerId,
          payload.propertyId,
          payload.currentStage,
          payload.action,
        ].join(":");

        if (
          propertyDevelopmentPublishRef
            .current ===
          requestKey
        ) {
          return;
        }

        propertyDevelopmentPublishRef.current =
          requestKey;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "PROPERTY_DEVELOPMENT_DECIDED",

              payload,
            });
          } catch (error) {
            propertyDevelopmentPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        /*
         * 단독 실행에서는 같은 적용 함수를
         * 직접 호출한다.
         */
        const applied =
          applyPropertyDevelopmentDecided(
            payload,
          );

        if (!applied) {
          propertyDevelopmentPublishRef.current =
            null;
        }
      },
      [
        applyPropertyDevelopmentDecided,
        onNetworkGameEventRequest,
        turnSequence,
      ],
    );

  const buildPendingProperty =
    useCallback((): void => {
      const pending =
        pendingPropertyDevelopment;

      if (!pending) {
        setPropertyDevelopmentError(
          "NO_PENDING_DEVELOPMENT",
        );
        return;
      }

      const {
        playerId,
        propertyId,
      } = pending;

      /*
       * 온라인에서는 해당 개발 선택권을 가진
       * 로컬 플레이어만 발행할 수 있다.
       */
      if (
        onNetworkGameEventRequest &&
        playerId !== localPlayerId
      ) {
        return;
      }

      const currentOwnership =
        getPropertyOwnership(
          propertyOwnershipsRef.current,
          propertyId,
        );

      if (
        !currentOwnership ||
        currentOwnership
          .ownerPlayerId !==
          playerId
      ) {
        setPropertyDevelopmentError(
          "NOT_OWNER",
        );
        return;
      }

      if (
        isDevelopmentRestricted(
          developmentRestrictionsRef.current,
          propertyId,
          turnNumber,
        )
      ) {
        setPropertyDevelopmentError(
          "DEVELOPMENT_RESTRICTED",
        );
        return;
      }

      const nextStage =
        getNextDevelopmentStage(
          currentOwnership.stage,
        );

      if (!nextStage) {
        setPropertyDevelopmentError(
          "MAX_STAGE",
        );
        return;
      }

      const constructionCost =
        pendingDevelopmentCost;

      if (
        constructionCost === null ||
        constructionCost <= 0
      ) {
        setPropertyDevelopmentError(
          "MAX_STAGE",
        );
        return;
      }

      if (
        !canPlayerAfford(
          playerId,
          constructionCost,
        )
      ) {
        setPropertyDevelopmentError(
          "INSUFFICIENT_FUNDS",
        );
        return;
      }

      const usedConstructionSupportItem =
        hasAuctionItem(
          auctionStateRef.current,
          playerId,
          "CONSTRUCTION_SUPPORT",
        );

      const nextCityHallState =
        consumeCityHallDevelopmentSupport(
          cityHallStateRef.current,
          playerId,
          propertyId,
        );

      const usedCityHallDevelopmentSupport =
        nextCityHallState !==
        cityHallStateRef.current;

      const payload:
        UlsanMarblePropertyDevelopmentDecidedPayload =
        {
          action: "BUILD",

          playerId,
          propertyId,

          currentStage:
            currentOwnership.stage,

          nextStage,

          constructionCost,

          currentConstructionInvestment:
            currentOwnership
              .constructionInvestment,

          nextConstructionInvestment:
            currentOwnership
              .constructionInvestment +
            constructionCost,

          developedTurn:
            turnNumber,

          usedConstructionSupportItem,
          usedCityHallDevelopmentSupport,
        };

      setPropertyDevelopmentError(
        null,
      );

      publishPropertyDevelopmentDecision(
        payload,
      );
    }, [
      auctionStateRef,
      canPlayerAfford,
      cityHallStateRef,
      developmentRestrictionsRef,
      localPlayerId,
      onNetworkGameEventRequest,
      pendingDevelopmentCost,
      pendingPropertyDevelopment,
      propertyOwnershipsRef,
      publishPropertyDevelopmentDecision,
      setPropertyDevelopmentError,
      turnNumber,
    ]);

  const declinePendingDevelopment =
    useCallback((): void => {
      const pending =
        pendingPropertyDevelopment;

      if (!pending) {
        setPropertyDevelopmentError(
          "NO_PENDING_DEVELOPMENT",
        );
        return;
      }

      const {
        playerId,
        propertyId,
      } = pending;

      if (
        onNetworkGameEventRequest &&
        playerId !== localPlayerId
      ) {
        return;
      }

      const currentOwnership =
        getPropertyOwnership(
          propertyOwnershipsRef.current,
          propertyId,
        );

      if (
        !currentOwnership ||
        currentOwnership
          .ownerPlayerId !==
          playerId
      ) {
        setPropertyDevelopmentError(
          "NOT_OWNER",
        );
        return;
      }

      const payload:
        UlsanMarblePropertyDevelopmentDecidedPayload =
        {
          action: "DECLINE",

          playerId,
          propertyId,

          currentStage:
            currentOwnership.stage,
        };

      setPropertyDevelopmentError(
        null,
      );

      publishPropertyDevelopmentDecision(
        payload,
      );
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      pendingPropertyDevelopment,
      propertyOwnershipsRef,
      publishPropertyDevelopmentDecision,
      setPropertyDevelopmentError,
    ]);

  const resetPropertyDevelopmentResolution =
    useCallback((): void => {
      propertyDevelopmentPublishRef.current =
        null;

      setPendingPropertyDevelopment(
        null,
      );

      setPropertyDevelopmentError(
        null,
      );
    }, [
      setPendingPropertyDevelopment,
      setPropertyDevelopmentError,
    ]);

  return {
    buildPendingProperty,
    declinePendingDevelopment,

    applyPropertyDevelopmentDecided,
    resetPropertyDevelopmentResolution,
  };
}