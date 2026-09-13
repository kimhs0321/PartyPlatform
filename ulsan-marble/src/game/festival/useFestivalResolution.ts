import {
  useCallback,
  useMemo,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleFestivalAnnouncementConfirmedPayload,
  UlsanMarbleFestivalDevEndedPayload,
  UlsanMarbleFestivalTriggerResolvedPayload,
  UlsanMarbleGameEventRequest,
  UlsanMarbleTouristTurnConfirmedPayload,
  UlsanMarbleTouristTurnResolvedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  BoardTile,
  PropertyData,
} from "../../types";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import type {
  PropertyOwnershipMap,
} from "../property/propertyTypes";

import type {
  PropertyMarketMap,
} from "../market/marketTypes";

import type {
  CityHallState,
} from "../cityHall/cityHallTypes";

import type {
  DisasterState,
} from "../disaster/disasterTypes";

import type {
  ActiveFestival,
  FestivalDeckState,
  FestivalId,
  PendingFestivalAnnouncement,
  PendingTouristTurnResult,
  TouristNpcState,
} from "./festivalTypes";

import {
  advanceTouristNpcOneStep,
  createTouristNpcState,
  getFestivalTollMultiplier,
  getTouristOwnerPayout,
  TOURIST_MOVE_STEP_DELAY_MS,
  tryTriggerFestival,
} from "./festivalRules";

import {
  getFestivalDefinition,
} from "./festivalData";

import {
  createDiceValue,
} from "../dice";

import {
  delay,
} from "../movement";

import {
  getPropertyTollAmount,
} from "../property/propertyToll";

import {
  getPropertyPriceIndex,
} from "../market/propertyMarket";

import {
  getActiveCityHallTerm,
  getCityHallTollMultiplier,
} from "../cityHall/cityHallRules";

import {
  getDisasterTollMultiplier,
} from "../disaster/disasterRules";

import type {
  NetworkGameEventApplyResult,
} from "../network/useNetworkGameEvents";


interface UseFestivalResolutionOptions {
  festivalDeckStateRef:
    MutableRefObject<FestivalDeckState>;

  activeFestivalRef:
    MutableRefObject<
      ActiveFestival | null
    >;

  touristNpcRef:
    MutableRefObject<
      TouristNpcState | null
    >;

  festivalSettlementBusyRef:
    MutableRefObject<boolean>;

  pendingFestivalAnnouncement:
    PendingFestivalAnnouncement | null;

  setPendingFestivalAnnouncement:
    Dispatch<
      SetStateAction<
        PendingFestivalAnnouncement | null
      >
    >;

  pendingTouristTurnResult:
    PendingTouristTurnResult | null;

  setPendingTouristTurnResult:
    Dispatch<
      SetStateAction<
        PendingTouristTurnResult | null
      >
    >;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  propertyOwnershipsRef:
    MutableRefObject<
      PropertyOwnershipMap
    >;

  propertyMarketRef:
    MutableRefObject<
      PropertyMarketMap
    >;

  cityHallStateRef:
    MutableRefObject<
      CityHallState
    >;

  disasterStateRef:
    MutableRefObject<
      DisasterState
    >;

  tiles:
    BoardTile[];

  properties:
    PropertyData[];

  localPlayerId:
    string;

  controllerPlayerId?:
    string;

  /*
   * 로컬 turn lifecycle 값.
   * 이벤트 적용 시 WAIT 판단에 사용한다.
   */
  turnNumber:
    number;

  turnSequence:
    number;

  /*
   * 서버 authoritative turn 값.
   * 이벤트를 발행할 때 사용한다.
   */
  networkTurnNumber?:
    number;

  networkTurnSequence?:
    number;

  canRunDev:
    boolean;

  policyTollMultiplier:
    number;

  economicNewsTollMultiplier:
    number;

  commitFestivalDeckState:
    (
      nextState:
        FestivalDeckState,
    ) => void;

  commitActiveFestival:
    (
      nextFestival:
        ActiveFestival | null,
    ) => void;

  commitTouristNpc:
    (
      nextNpc:
        TouristNpcState | null,
    ) => void;

  commitFestivalSettlementBusy:
    (
      busy: boolean,
    ) => void;

  deposit:
    (
      playerId: string,
      amount: number,
      reason: TransactionReason,
      memo?: string,
    ) => MoneyOperationResult;

  startStockMarketResolution:
    (
      mode:
        | "SCHEDULED"
        | "DEV",
      additionallyDisabledPlayerIds?:
        string[],
    ) => void;

  onNetworkGameEventRequest?:
    (
      event:
        UlsanMarbleGameEventRequest,
    ) => void;
}


function createFestivalActionId(
  prefix: string,
  turnSequence: number,
  playerId: string,
  serial: number,
): string {
  return [
    prefix,
    turnSequence,
    playerId,
    Date.now(),
    serial,
  ].join(":");
}


export function useFestivalResolution({
  festivalDeckStateRef,
  activeFestivalRef,
  touristNpcRef,
  festivalSettlementBusyRef,

  pendingFestivalAnnouncement,
  setPendingFestivalAnnouncement,

  pendingTouristTurnResult,
  setPendingTouristTurnResult,

  playersRef,

  propertyOwnershipsRef,
  propertyMarketRef,

  cityHallStateRef,
  disasterStateRef,

  tiles,
  properties,

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  networkTurnNumber,
  networkTurnSequence,

  canRunDev,

  policyTollMultiplier,
  economicNewsTollMultiplier,

  commitFestivalDeckState,
  commitActiveFestival,
  commitTouristNpc,
  commitFestivalSettlementBusy,

  deposit,

  startStockMarketResolution,

  onNetworkGameEventRequest,
}: UseFestivalResolutionOptions) {
  const propertyMap =
    useMemo(
      () =>
        new Map(
          properties.map(
            (property) => [
              property.id,
              property,
            ],
          ),
        ),
      [properties],
    );

  const actionSerialRef =
    useRef(0);

  /*
   * 현재 진행 중인 축제 발생 판정 ID.
   */
  const festivalResolutionIdRef =
    useRef<string | null>(null);

  /*
   * 현재 진행 중인 관광객 턴 ID.
   */
  const touristTurnIdRef =
    useRef<string | null>(null);

  /*
   * 이벤트 재적용 방지.
   */
  const appliedFestivalResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const confirmedFestivalResolutionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const appliedTouristTurnIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const confirmedTouristTurnIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const appliedFestivalDevEndIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  /*
   * 같은 버튼을 빠르게 여러 번 눌러
   * 이벤트가 중복 발행되는 것을 막는다.
   */
  const publishedFestivalTriggerIdRef =
    useRef<string | null>(null);

  const publishedAnnouncementConfirmIdRef =
    useRef<string | null>(null);

  const publishedTouristTurnIdRef =
    useRef<string | null>(null);

  const publishedTouristConfirmIdRef =
    useRef<string | null>(null);

  const publishedFestivalDevEndIdRef =
    useRef<string | null>(null);


  const isNetworkGame =
    Boolean(
      onNetworkGameEventRequest,
    );

  const eventTurnNumber =
    networkTurnNumber ??
    turnNumber;

  const eventTurnSequence =
    networkTurnSequence ??
    turnSequence;

  const isLocalController =
    controllerPlayerId ===
    localPlayerId;


  const createNextActionId =
    useCallback(
      (
        prefix: string,
      ): string => {
        actionSerialRef.current += 1;

        return createFestivalActionId(
          prefix,
          eventTurnSequence,
          localPlayerId,
          actionSerialRef.current,
        );
      },
      [
        eventTurnSequence,
        localPlayerId,
      ],
    );


  const getApplyTurnState =
    useCallback(
      (
        payloadTurnNumber:
          number,

        payloadTurnSequence:
          number,
      ):
        | NetworkGameEventApplyResult
        | null => {
        const isServerAdvancedWindow =
          isNetworkGame &&
          networkTurnNumber ===
            payloadTurnNumber &&
          networkTurnSequence ===
            payloadTurnSequence &&
          turnNumber + 1 ===
            payloadTurnNumber;

        if (isServerAdvancedWindow) {
          return null;
        }

        if (
          turnSequence <
          payloadTurnSequence
        ) {
          return "WAIT";
        }

        if (
          turnSequence >
          payloadTurnSequence
        ) {
          return "INVALID";
        }

        if (
          turnNumber <
          payloadTurnNumber
        ) {
          return "WAIT";
        }

        if (
          turnNumber >
          payloadTurnNumber
        ) {
          return "INVALID";
        }

        return null;
      },
      [
        isNetworkGame,
        networkTurnNumber,
        networkTurnSequence,
        turnNumber,
        turnSequence,
      ],
    );


  /*
   * 관광객 주사위와 최종 결과는
   * controller 한 명만 계산한다.
   *
   * 여기서는 화면 애니메이션을 하지 않고
   * 최종 authoritative payload만 만든다.
   */
  const createTouristTurnPayload =
    useCallback(
      (
        touristTurnId:
          string,

        additionallyDisabledPlayerIds:
          string[],
      ):
        | UlsanMarbleTouristTurnResolvedPayload
        | null => {
        const festival =
          activeFestivalRef.current;

        const currentNpc =
          touristNpcRef.current;

        if (
          !festival ||
          !currentNpc
        ) {
          return null;
        }

        const firstDice =
          createDiceValue();

        const secondDice =
          createDiceValue();

        const fromPosition =
          currentNpc.position;

        let nextNpc:
          TouristNpcState = {
          ...currentNpc,

          moving: true,

          lastDice: [
            firstDice,
            secondDice,
          ],
        };

        let completedLap =
          false;

        for (
          let stepIndex = 0;
          stepIndex <
          firstDice +
            secondDice;
          stepIndex += 1
        ) {
          const stepResult =
            advanceTouristNpcOneStep(
              nextNpc,
              tiles.length,
            );

          nextNpc =
            stepResult.npc;

          completedLap =
            stepResult.completedLap;

          if (completedLap) {
            break;
          }
        }

        if (completedLap) {
          return {
            touristTurnId,

            controllerPlayerId:
              localPlayerId,

            turnNumber:
              eventTurnNumber,

            turnSequence:
              eventTurnSequence,

            festivalId:
              festival.festivalId,

            diceValues: [
              firstDice,
              secondDice,
            ],

            fromPosition,

            toPosition: 0,

            landedTileName:
              tiles[0]?.name ??
              "출발",

            landingKind:
              "FESTIVAL_END",

            propertyName:
              null,

            ownerPlayerId:
              null,

            ownerName:
              null,

            bankPayout:
              0,

            finalToll:
              0,

            completedLap:
              true,

            additionallyDisabledPlayerIds:
              [
                ...new Set(
                  additionallyDisabledPlayerIds,
                ),
              ],

            nextTouristNpc:
              null,
          };
        }

        nextNpc = {
          ...nextNpc,
          moving: false,
        };

        const landedTile =
          tiles[
            nextNpc.position
          ];

        const landedProperty =
          landedTile?.propertyId
            ? propertyMap.get(
                landedTile
                  .propertyId,
              )
            : undefined;

        const ownership =
          landedProperty
            ? propertyOwnershipsRef
                .current[
                landedProperty.id
              ]
            : undefined;

        let landingKind:
          PendingTouristTurnResult[
            "landingKind"
          ] =
          "SPECIAL_TILE";

        let ownerPlayerId:
          string | null =
          null;

        let ownerName:
          string | null =
          null;

        let bankPayout =
          0;

        let finalToll =
          0;

        if (
          landedProperty &&
          !ownership
        ) {
          landingKind =
            "UNOWNED_PROPERTY";
        }

        if (
          landedProperty &&
          ownership
        ) {
          landingKind =
            "OWNED_PROPERTY";

          ownerPlayerId =
            ownership
              .ownerPlayerId;

          ownerName =
            playersRef.current.find(
              (player) =>
                player.id ===
                ownership.ownerPlayerId,
            )?.name ??
            null;

          finalToll =
            getPropertyTollAmount(
              landedProperty,

              ownership.stage,

              getPropertyPriceIndex(
                propertyMarketRef
                  .current,

                landedProperty.id,
              ),

              policyTollMultiplier *
                getCityHallTollMultiplier(
                  getActiveCityHallTerm(
                    cityHallStateRef
                      .current,

                    turnNumber,
                  ),

                  ownership.stage,
                ) *
                economicNewsTollMultiplier *
                getDisasterTollMultiplier(
                  disasterStateRef
                    .current,

                  landedProperty.id,

                  turnNumber,
                ) *
                getFestivalTollMultiplier(
                  festival,
                  landedProperty,
                ),
            );

          bankPayout =
            getTouristOwnerPayout(
              finalToll,
            );
        }

        return {
          touristTurnId,

          controllerPlayerId:
            localPlayerId,

          turnNumber:
            eventTurnNumber,

          turnSequence:
            eventTurnSequence,

          festivalId:
            festival.festivalId,

          diceValues: [
            firstDice,
            secondDice,
          ],

          fromPosition,

          toPosition:
            nextNpc.position,

          landedTileName:
            landedTile?.name ??
            "알 수 없는 칸",

          landingKind,

          propertyName:
            landedProperty?.name ??
            null,

          ownerPlayerId,

          ownerName,

          bankPayout,

          finalToll,

          completedLap:
            false,

          additionallyDisabledPlayerIds:
            [
              ...new Set(
                additionallyDisabledPlayerIds,
              ),
            ],

          nextTouristNpc: {
            position:
              nextNpc.position,

            travelledSteps:
              nextNpc.travelledSteps,

            moving:
              false,

            lastDice: [
              firstDice,
              secondDice,
            ],
          },
        };
      },
      [
        activeFestivalRef,
        cityHallStateRef,
        disasterStateRef,
        economicNewsTollMultiplier,
        eventTurnNumber,
        eventTurnSequence,
        localPlayerId,
        playersRef,
        policyTollMultiplier,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        tiles,
        touristNpcRef,
        turnNumber,
      ],
    );


  /*
   * authoritative 결과를 받은 뒤
   * 모든 클라이언트가 같은 경로로
   * 관광객 애니메이션을 재생한다.
   */
  const animateTouristTurn =
    useCallback(
      async (
        payload:
          UlsanMarbleTouristTurnResolvedPayload,

        startingNpc:
          TouristNpcState,
      ) => {
        let animatedNpc:
          TouristNpcState = {
          ...startingNpc,

          moving: true,

          lastDice: [
            payload.diceValues[0],
            payload.diceValues[1],
          ],
        };

        commitTouristNpc(
          animatedNpc,
        );

        const moveCount =
          payload.diceValues[0] +
          payload.diceValues[1];

        for (
          let stepIndex = 0;
          stepIndex <
          moveCount;
          stepIndex += 1
        ) {
          await delay(
            TOURIST_MOVE_STEP_DELAY_MS,
          );

          /*
           * reset/dev 종료 등으로
           * 현재 관광객 턴이 바뀌었다면
           * 이전 animation을 중단한다.
           */
          if (
            touristTurnIdRef
              .current !==
            payload.touristTurnId
          ) {
            return;
          }

          const stepResult =
            advanceTouristNpcOneStep(
              animatedNpc,
              tiles.length,
            );

          animatedNpc =
            stepResult.npc;

          commitTouristNpc(
            animatedNpc,
          );

          if (
            stepResult.completedLap
          ) {
            break;
          }
        }

        if (
          touristTurnIdRef
            .current !==
          payload.touristTurnId
        ) {
          return;
        }

        if (
          payload.completedLap
        ) {
          commitActiveFestival(
            null,
          );

          commitTouristNpc(
            null,
          );
        } else if (
          payload.nextTouristNpc
        ) {
          commitTouristNpc({
            position:
              payload
                .nextTouristNpc
                .position,

            travelledSteps:
              payload
                .nextTouristNpc
                .travelledSteps,

            moving:
              false,

            lastDice:
              payload
                .nextTouristNpc
                .lastDice,
          });
        }

        setPendingTouristTurnResult({
          festivalId:
            payload.festivalId,

          diceValues: [
            payload.diceValues[0],
            payload.diceValues[1],
          ],

          fromPosition:
            payload.fromPosition,

          toPosition:
            payload.toPosition,

          landedTileName:
            payload
              .landedTileName,

          landingKind:
            payload
              .landingKind,

          propertyName:
            payload
              .propertyName,

          ownerPlayerId:
            payload
              .ownerPlayerId,

          ownerName:
            payload.ownerName,

          bankPayout:
            payload.bankPayout,

          finalToll:
            payload.finalToll,

          completedLap:
            payload.completedLap,

          continuationDisabledPlayerIds:
            [
              ...new Set(
                payload
                  .additionallyDisabledPlayerIds,
              ),
            ],
        });
      },
      [
        commitActiveFestival,
        commitTouristNpc,
        setPendingTouristTurnResult,
        tiles.length,
      ],
    );


  const applyTouristTurnResolved =
    useCallback(
      (
        payload:
          UlsanMarbleTouristTurnResolvedPayload,
      ):
        NetworkGameEventApplyResult => {
        const turnState =
          getApplyTurnState(
            payload.turnNumber,
            payload.turnSequence,
          );

        if (turnState) {
          return turnState;
        }

        if (
          appliedTouristTurnIdsRef
            .current
            .has(
              payload.touristTurnId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        const festival =
          activeFestivalRef.current;

        const currentNpc =
          touristNpcRef.current;

        if (
          !festival ||
          !currentNpc
        ) {
          return "WAIT";
        }

        if (
          festival.festivalId !==
          payload.festivalId
        ) {
          return "INVALID";
        }

        if (
          currentNpc.position !==
          payload.fromPosition
        ) {
          return "INVALID";
        }

        /*
         * 돈 변경은 ACK 전에 동기적으로 적용한다.
         * 애니메이션 종료를 기다렸다가 적용하면
         * ACK 이후 돈 상태가 달라질 수 있다.
         */
        if (
          payload.bankPayout >
          0
        ) {
          if (
            !payload.ownerPlayerId
          ) {
            return "INVALID";
          }

          const festivalDefinition =
            getFestivalDefinition(
              payload.festivalId,
            );

          const payoutResult =
            deposit(
              payload.ownerPlayerId,

              payload.bankPayout,

              "EVENT",

              `${
                festivalDefinition.name
              } 관광객 · ${
                payload.propertyName ??
                payload.landedTileName
              }`,
            );

          if (
            !payoutResult.ok
          ) {
            return "INVALID";
          }
        }

        touristTurnIdRef.current =
          payload.touristTurnId;

        appliedTouristTurnIdsRef
          .current
          .add(
            payload.touristTurnId,
          );

        if (
          publishedTouristTurnIdRef
            .current ===
          payload.touristTurnId
        ) {
          publishedTouristTurnIdRef
            .current =
            null;
        }

        commitFestivalSettlementBusy(
          true,
        );

        void animateTouristTurn(
          payload,
          currentNpc,
        );

        return "APPLIED";
      },
      [
        activeFestivalRef,
        animateTouristTurn,
        commitFestivalSettlementBusy,
        deposit,
        getApplyTurnState,
        touristNpcRef,
      ],
    );


  const startTouristTurn =
    useCallback(
      (
        continuationDisabledPlayerIds:
          string[] = [],
      ) => {
        const festival =
          activeFestivalRef.current;

        const npc =
          touristNpcRef.current;

        if (
          !festival ||
          !npc
        ) {
          commitFestivalSettlementBusy(
            false,
          );

          startStockMarketResolution(
            "SCHEDULED",
            continuationDisabledPlayerIds,
          );

          return;
        }

        commitFestivalSettlementBusy(
          true,
        );

        /*
         * 네트워크에서는 현재 서버 active player
         * 한 명만 주사위와 결과를 결정한다.
         */
        if (isNetworkGame) {
          if (
            !isLocalController ||
            !onNetworkGameEventRequest
          ) {
            return;
          }

          if (
            publishedTouristTurnIdRef
              .current
          ) {
            return;
          }

          const touristTurnId =
            createNextActionId(
              "TOURIST_TURN",
            );

          const payload =
            createTouristTurnPayload(
              touristTurnId,
              continuationDisabledPlayerIds,
            );

          if (!payload) {
            return;
          }

          publishedTouristTurnIdRef.current =
            touristTurnId;

          onNetworkGameEventRequest({
            kind:
              "TOURIST_TURN_RESOLVED",

            payload,
          });

          return;
        }

        /*
         * 단독 플레이도 같은 apply 경로 사용.
         */
        const touristTurnId =
          createNextActionId(
            "TOURIST_TURN_LOCAL",
          );

        const payload =
          createTouristTurnPayload(
            touristTurnId,
            continuationDisabledPlayerIds,
          );

        if (!payload) {
          return;
        }

        applyTouristTurnResolved(
          payload,
        );
      },
      [
        activeFestivalRef,
        applyTouristTurnResolved,
        commitFestivalSettlementBusy,
        createNextActionId,
        createTouristTurnPayload,
        isLocalController,
        isNetworkGame,
        onNetworkGameEventRequest,
        startStockMarketResolution,
        touristNpcRef,
      ],
    );


  const continueGlobalTurnSettlement =
    useCallback(
      (
        continuationDisabledPlayerIds:
          string[] = [],
      ) => {
        if (
          activeFestivalRef.current &&
          touristNpcRef.current
        ) {
          startTouristTurn(
            continuationDisabledPlayerIds,
          );

          return;
        }

        commitFestivalSettlementBusy(
          false,
        );

        startStockMarketResolution(
          "SCHEDULED",
          continuationDisabledPlayerIds,
        );
      },
      [
        activeFestivalRef,
        commitFestivalSettlementBusy,
        startStockMarketResolution,
        startTouristTurn,
        touristNpcRef,
      ],
    );


  const applyFestivalTriggerResolved =
    useCallback(
      (
        payload:
          UlsanMarbleFestivalTriggerResolvedPayload,
      ):
        NetworkGameEventApplyResult => {
        const turnState =
          getApplyTurnState(
            payload.turnNumber,
            payload.turnSequence,
          );

        if (turnState) {
          return turnState;
        }

        if (
          appliedFestivalResolutionIdsRef
            .current
            .has(
              payload.resolutionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        commitFestivalDeckState({
          drawPile: [
            ...payload
              .nextDeck
              .drawPile,
          ],

          cycle:
            payload
              .nextDeck
              .cycle,
        });

        appliedFestivalResolutionIdsRef
          .current
          .add(
            payload.resolutionId,
          );

        if (
          publishedFestivalTriggerIdRef
            .current ===
          payload.resolutionId
        ) {
          publishedFestivalTriggerIdRef
            .current =
            null;
        }

        if (
          payload.outcome ===
          "SKIP"
        ) {
          continueGlobalTurnSettlement(
            payload
              .additionallyDisabledPlayerIds,
          );

          return "APPLIED";
        }

        const festivalTurnNumber =
          isNetworkGame &&
          payload.mode === "SCHEDULED"
            ? payload.turnNumber - 1
            : payload.turnNumber;

        festivalResolutionIdRef.current =
          payload.resolutionId;

        commitActiveFestival({
          festivalId:
            payload.festivalId,

          startedTurn:
            festivalTurnNumber,
        });

        commitTouristNpc(
          createTouristNpcState(),
        );

        commitFestivalSettlementBusy(
          true,
        );

        setPendingFestivalAnnouncement({
          festivalId:
            payload.festivalId,

          turnNumber:
            festivalTurnNumber,

          continuationDisabledPlayerIds:
            [
              ...new Set(
                payload
                  .additionallyDisabledPlayerIds,
              ),
            ],
        });

        return "APPLIED";
      },
      [
        commitActiveFestival,
        commitFestivalDeckState,
        commitFestivalSettlementBusy,
        commitTouristNpc,
        continueGlobalTurnSettlement,
        getApplyTurnState,
        setPendingFestivalAnnouncement,
      ],
    );


  const applyFestivalAnnouncementConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleFestivalAnnouncementConfirmedPayload,
      ):
        NetworkGameEventApplyResult => {
        const turnState =
          getApplyTurnState(
            payload.turnNumber,
            payload.turnSequence,
          );

        if (turnState) {
          return turnState;
        }

        if (
          confirmedFestivalResolutionIdsRef
            .current
            .has(
              payload.resolutionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        if (
          festivalResolutionIdRef
            .current !==
          payload.resolutionId
        ) {
          return "INVALID";
        }

        /*
         * START 이벤트는 적용됐지만 React state가
         * 아직 다음 render에 반영되기 전이면 WAIT.
         */
        if (
          !pendingFestivalAnnouncement
        ) {
          return "WAIT";
        }

        if (
          pendingFestivalAnnouncement
            .festivalId !==
          payload.festivalId
        ) {
          return "INVALID";
        }

        const continuationDisabledPlayerIds =
          pendingFestivalAnnouncement
            .continuationDisabledPlayerIds;

        confirmedFestivalResolutionIdsRef
          .current
          .add(
            payload.resolutionId,
          );

        if (
          publishedAnnouncementConfirmIdRef
            .current ===
          payload.resolutionId
        ) {
          publishedAnnouncementConfirmIdRef
            .current =
            null;
        }

        setPendingFestivalAnnouncement(
          null,
        );

        startTouristTurn(
          continuationDisabledPlayerIds,
        );

        return "APPLIED";
      },
      [
        getApplyTurnState,
        pendingFestivalAnnouncement,
        setPendingFestivalAnnouncement,
        startTouristTurn,
      ],
    );


  const applyTouristTurnConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleTouristTurnConfirmedPayload,
      ):
        NetworkGameEventApplyResult => {
        const turnState =
          getApplyTurnState(
            payload.turnNumber,
            payload.turnSequence,
          );

        if (turnState) {
          return turnState;
        }

        if (
          confirmedTouristTurnIdsRef
            .current
            .has(
              payload.touristTurnId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        if (
          touristTurnIdRef.current !==
          payload.touristTurnId
        ) {
          return "INVALID";
        }

        /*
         * 다른 클라이언트의 관광객 animation이
         * 아직 끝나지 않았다면 확인 이벤트를 보류.
         */
        if (
          !pendingTouristTurnResult
        ) {
          return "WAIT";
        }

        if (
          pendingTouristTurnResult
            .festivalId !==
          payload.festivalId
        ) {
          return "INVALID";
        }

        const continuationDisabledPlayerIds =
          pendingTouristTurnResult
            .continuationDisabledPlayerIds;

        confirmedTouristTurnIdsRef
          .current
          .add(
            payload.touristTurnId,
          );

        if (
          publishedTouristConfirmIdRef
            .current ===
          payload.touristTurnId
        ) {
          publishedTouristConfirmIdRef
            .current =
            null;
        }

        touristTurnIdRef.current =
          null;

        setPendingTouristTurnResult(
          null,
        );

        commitFestivalSettlementBusy(
          false,
        );

        startStockMarketResolution(
          "SCHEDULED",
          continuationDisabledPlayerIds,
        );

        return "APPLIED";
      },
      [
        commitFestivalSettlementBusy,
        getApplyTurnState,
        pendingTouristTurnResult,
        setPendingTouristTurnResult,
        startStockMarketResolution,
      ],
    );


  const applyFestivalDevEnded =
    useCallback(
      (
        payload:
          UlsanMarbleFestivalDevEndedPayload,
      ):
        NetworkGameEventApplyResult => {
        const turnState =
          getApplyTurnState(
            payload.turnNumber,
            payload.turnSequence,
          );

        if (turnState) {
          return turnState;
        }

        if (
          appliedFestivalDevEndIdsRef
            .current
            .has(
              payload.actionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        const festival =
          activeFestivalRef.current;

        if (
          !festival ||
          festival.festivalId !==
          payload.festivalId
        ) {
          return "INVALID";
        }

        appliedFestivalDevEndIdsRef
          .current
          .add(
            payload.actionId,
          );

        if (
          publishedFestivalDevEndIdRef
            .current ===
          payload.actionId
        ) {
          publishedFestivalDevEndIdRef
            .current =
            null;
        }

        festivalResolutionIdRef.current =
          null;

        touristTurnIdRef.current =
          null;

        setPendingFestivalAnnouncement(
          null,
        );

        setPendingTouristTurnResult(
          null,
        );

        commitActiveFestival(
          null,
        );

        commitTouristNpc(
          null,
        );

        commitFestivalSettlementBusy(
          false,
        );

        return "APPLIED";
      },
      [
        activeFestivalRef,
        commitActiveFestival,
        commitFestivalSettlementBusy,
        commitTouristNpc,
        getApplyTurnState,
        setPendingFestivalAnnouncement,
        setPendingTouristTurnResult,
      ],
    );


  const startFestivalResolution =
    useCallback(
      (
        mode:
          | "SCHEDULED"
          | "DEV",

        additionallyDisabledPlayerIds:
          string[] = [],

        forcedFestivalId?:
          FestivalId,
      ) => {
        if (
          mode === "DEV" &&
          (
            !canRunDev ||
            festivalSettlementBusyRef
              .current ||
            activeFestivalRef.current ||
            !forcedFestivalId
          )
        ) {
          return;
        }

        /*
         * 네트워크에서는 서버 active player만
         * 확률 판정과 덱 draw를 수행한다.
         */
        if (
          isNetworkGame &&
          !isLocalController
        ) {
          return;
        }

        const triggerResult =
          mode === "DEV"
            ? {
                deck:
                  festivalDeckStateRef
                    .current,

                festivalId:
                  forcedFestivalId ??
                  null,
              }
            : tryTriggerFestival(
                festivalDeckStateRef
                  .current,

                activeFestivalRef
                  .current,

                turnNumber,
              );

        const resolutionId =
          createNextActionId(
            mode === "DEV"
              ? "FESTIVAL_DEV"
              : "FESTIVAL",
          );

        const disabledPlayerIds =
          [
            ...new Set(
              additionallyDisabledPlayerIds,
            ),
          ];

        if (
          isNetworkGame &&
          onNetworkGameEventRequest
        ) {
          if (
            publishedFestivalTriggerIdRef
              .current
          ) {
            return;
          }

          publishedFestivalTriggerIdRef.current =
            resolutionId;

          if (
            !triggerResult
              .festivalId
          ) {
            onNetworkGameEventRequest({
              kind:
                "FESTIVAL_TRIGGER_RESOLVED",

              payload: {
                resolutionId,

                controllerPlayerId:
                  localPlayerId,

                mode:
                  "SCHEDULED",

                outcome:
                  "SKIP",

                turnNumber:
                  eventTurnNumber,

                turnSequence:
                  eventTurnSequence,

                additionallyDisabledPlayerIds:
                  disabledPlayerIds,

                nextDeck: {
                  drawPile: [
                    ...triggerResult
                      .deck
                      .drawPile,
                  ],

                  cycle:
                    triggerResult
                      .deck
                      .cycle,
                },
              },
            });

            return;
          }

          onNetworkGameEventRequest({
            kind:
              "FESTIVAL_TRIGGER_RESOLVED",

            payload: {
              resolutionId,

              controllerPlayerId:
                localPlayerId,

              mode,

              outcome:
                "START",

              festivalId:
                triggerResult
                  .festivalId,

              turnNumber:
                eventTurnNumber,

              turnSequence:
                eventTurnSequence,

              additionallyDisabledPlayerIds:
                disabledPlayerIds,

              nextDeck: {
                drawPile: [
                  ...triggerResult
                    .deck
                    .drawPile,
                ],

                cycle:
                  triggerResult
                    .deck
                    .cycle,
              },
            },
          });

          return;
        }

        /*
         * 단독 플레이 역시 동일한 apply 함수 사용.
         */
        if (
          !triggerResult
            .festivalId
        ) {
          applyFestivalTriggerResolved({
            resolutionId,

            controllerPlayerId:
              localPlayerId,

            mode:
              "SCHEDULED",

            outcome:
              "SKIP",

            turnNumber,

            turnSequence,

            additionallyDisabledPlayerIds:
              disabledPlayerIds,

            nextDeck: {
              drawPile: [
                ...triggerResult
                  .deck
                  .drawPile,
              ],

              cycle:
                triggerResult
                  .deck
                  .cycle,
            },
          });

          return;
        }

        applyFestivalTriggerResolved({
          resolutionId,

          controllerPlayerId:
            localPlayerId,

          mode,

          outcome:
            "START",

          festivalId:
            triggerResult
              .festivalId,

          turnNumber,

          turnSequence,

          additionallyDisabledPlayerIds:
            disabledPlayerIds,

          nextDeck: {
            drawPile: [
              ...triggerResult
                .deck
                .drawPile,
            ],

            cycle:
              triggerResult
                .deck
                .cycle,
          },
        });
      },
      [
        activeFestivalRef,
        applyFestivalTriggerResolved,
        canRunDev,
        createNextActionId,
        eventTurnNumber,
        eventTurnSequence,
        festivalDeckStateRef,
        festivalSettlementBusyRef,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );


  const continueAfterPropertyMarket =
    useCallback(
      (
        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        startFestivalResolution(
          "SCHEDULED",
          additionallyDisabledPlayerIds,
        );
      },
      [
        startFestivalResolution,
      ],
    );


  const completeFestivalAnnouncement =
    useCallback(
      () => {
        if (
          !pendingFestivalAnnouncement
        ) {
          return;
        }

        const resolutionId =
          festivalResolutionIdRef
            .current;

        if (!resolutionId) {
          return;
        }

        if (
          isNetworkGame
        ) {
          if (
            !isLocalController ||
            !onNetworkGameEventRequest
          ) {
            return;
          }

          if (
            publishedAnnouncementConfirmIdRef
              .current ===
            resolutionId
          ) {
            return;
          }

          publishedAnnouncementConfirmIdRef.current =
            resolutionId;

          onNetworkGameEventRequest({
            kind:
              "FESTIVAL_ANNOUNCEMENT_CONFIRMED",

            payload: {
              resolutionId,

              festivalId:
                pendingFestivalAnnouncement
                  .festivalId,

              controllerPlayerId:
                localPlayerId,

              turnNumber:
                eventTurnNumber,

              turnSequence:
                eventTurnSequence,
            },
          });

          return;
        }

        applyFestivalAnnouncementConfirmed({
          resolutionId,

          festivalId:
            pendingFestivalAnnouncement
              .festivalId,

          controllerPlayerId:
            localPlayerId,

          turnNumber,

          turnSequence,
        });
      },
      [
        applyFestivalAnnouncementConfirmed,
        eventTurnNumber,
        eventTurnSequence,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingFestivalAnnouncement,
        turnNumber,
        turnSequence,
      ],
    );


  const completePendingTouristTurn =
    useCallback(
      () => {
        if (
          !pendingTouristTurnResult
        ) {
          return;
        }

        const touristTurnId =
          touristTurnIdRef.current;

        if (!touristTurnId) {
          return;
        }

        if (
          isNetworkGame
        ) {
          if (
            !isLocalController ||
            !onNetworkGameEventRequest
          ) {
            return;
          }

          if (
            publishedTouristConfirmIdRef
              .current ===
            touristTurnId
          ) {
            return;
          }

          publishedTouristConfirmIdRef.current =
            touristTurnId;

          onNetworkGameEventRequest({
            kind:
              "TOURIST_TURN_CONFIRMED",

            payload: {
              touristTurnId,

              festivalId:
                pendingTouristTurnResult
                  .festivalId,

              controllerPlayerId:
                localPlayerId,

              turnNumber:
                eventTurnNumber,

              turnSequence:
                eventTurnSequence,
            },
          });

          return;
        }

        applyTouristTurnConfirmed({
          touristTurnId,

          festivalId:
            pendingTouristTurnResult
              .festivalId,

          controllerPlayerId:
            localPlayerId,

          turnNumber,

          turnSequence,
        });
      },
      [
        applyTouristTurnConfirmed,
        eventTurnNumber,
        eventTurnSequence,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingTouristTurnResult,
        turnNumber,
        turnSequence,
      ],
    );


  const devRunFestival =
    useCallback(
      (
        festivalId:
          FestivalId,
      ) => {
        startFestivalResolution(
          "DEV",
          [],
          festivalId,
        );
      },
      [
        startFestivalResolution,
      ],
    );


  const devEndFestival =
    useCallback(
      () => {
        const festival =
          activeFestivalRef.current;

        if (
          !festival ||
          !canRunDev ||
          festivalSettlementBusyRef
            .current
        ) {
          return;
        }

        if (
          isNetworkGame
        ) {
          if (
            !isLocalController ||
            !onNetworkGameEventRequest
          ) {
            return;
          }

          if (
            publishedFestivalDevEndIdRef
              .current
          ) {
            return;
          }

          const actionId =
            createNextActionId(
              "FESTIVAL_DEV_END",
            );

          publishedFestivalDevEndIdRef.current =
            actionId;

          onNetworkGameEventRequest({
            kind:
              "FESTIVAL_DEV_ENDED",

            payload: {
              actionId,

              festivalId:
                festival.festivalId,

              controllerPlayerId:
                localPlayerId,

              turnNumber:
                eventTurnNumber,

              turnSequence:
                eventTurnSequence,
            },
          });

          return;
        }

        const actionId =
          createNextActionId(
            "FESTIVAL_DEV_END_LOCAL",
          );

        applyFestivalDevEnded({
          actionId,

          festivalId:
            festival.festivalId,

          controllerPlayerId:
            localPlayerId,

          turnNumber,

          turnSequence,
        });
      },
      [
        activeFestivalRef,
        applyFestivalDevEnded,
        canRunDev,
        createNextActionId,
        eventTurnNumber,
        eventTurnSequence,
        festivalSettlementBusyRef,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );


  const resetFestivalResolution =
    useCallback(
      () => {
        festivalResolutionIdRef.current =
          null;

        touristTurnIdRef.current =
          null;

        publishedFestivalTriggerIdRef.current =
          null;

        publishedAnnouncementConfirmIdRef.current =
          null;

        publishedTouristTurnIdRef.current =
          null;

        publishedTouristConfirmIdRef.current =
          null;

        publishedFestivalDevEndIdRef.current =
          null;

        appliedFestivalResolutionIdsRef
          .current
          .clear();

        confirmedFestivalResolutionIdsRef
          .current
          .clear();

        appliedTouristTurnIdsRef
          .current
          .clear();

        confirmedTouristTurnIdsRef
          .current
          .clear();

        appliedFestivalDevEndIdsRef
          .current
          .clear();

        setPendingFestivalAnnouncement(
          null,
        );

        setPendingTouristTurnResult(
          null,
        );

        commitActiveFestival(
          null,
        );

        commitTouristNpc(
          null,
        );

        commitFestivalSettlementBusy(
          false,
        );
      },
      [
        commitActiveFestival,
        commitFestivalSettlementBusy,
        commitTouristNpc,
        setPendingFestivalAnnouncement,
        setPendingTouristTurnResult,
      ],
    );


  return {
    startFestivalResolution,

    continueAfterPropertyMarket,
    continueGlobalTurnSettlement,

    completeFestivalAnnouncement,
    completePendingTouristTurn,

    applyFestivalTriggerResolved,
    applyFestivalAnnouncementConfirmed,
    applyTouristTurnResolved,
    applyTouristTurnConfirmed,
    applyFestivalDevEnded,

    devRunFestival,
    devEndFestival,

    resetFestivalResolution,

    canConfirmFestivalAnnouncement:
      !isNetworkGame ||
      isLocalController,

    canConfirmTouristTurn:
      !isNetworkGame ||
      isLocalController,
  };
}