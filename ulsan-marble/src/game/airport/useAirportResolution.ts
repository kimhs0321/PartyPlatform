import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type {
  UlsanMarbleAirportTravelDecidedPayload,
  UlsanMarbleArrivalContext,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  BoardTile,
} from "../../types";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  AIRPORT_TICKET_PRICE,
  isAirportDestinationEligible,
} from "./airportRules";

import type {
  AirportFlightState,
  AirportTravelError,
  PendingAirportTravel,
} from "./airportTypes";

interface UseAirportResolutionOptions {
  pendingAirportTravel:
    PendingAirportTravel | null;

  setPendingAirportTravel:
    Dispatch<
      SetStateAction<
        PendingAirportTravel | null
      >
    >;

  setAirportTravelError:
    Dispatch<
      SetStateAction<
        AirportTravelError | null
      >
    >;

  airportFlight:
    AirportFlightState | null;

  setAirportFlight:
    Dispatch<
      SetStateAction<
        AirportFlightState | null
      >
    >;

  playersRef:
    MutableRefObject<PlayerTokenData[]>;

  tiles: BoardTile[];

  localPlayerId: string;

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

  commitPlayers: (
    players: PlayerTokenData[],
  ) => void;

  completeTileResolution:
    () => void;

  resolveArrivalTile: (
    position: number,
    playerId: string,
    arrival?:
      UlsanMarbleArrivalContext,
  ) => void;
}

function createAirportActionId(
  visitId: string,
  action:
    "TRAVEL" | "CANCEL",
  destinationPosition?: number,
): string {
  return [
    visitId,
    action,
    destinationPosition ??
      "NONE",
  ].join(":");
}

function createAirportArrivalId(
  visitId: string,
  destinationPosition: number,
): string {
  return [
    visitId,
    "TRAVEL",
    destinationPosition,
  ].join(":");
}

export function useAirportResolution({
  pendingAirportTravel,
  setPendingAirportTravel,

  setAirportTravelError,

  airportFlight,
  setAirportFlight,

  playersRef,
  tiles,

  localPlayerId,

  onNetworkGameEventRequest,

  canPlayerAfford,
  withdraw,
  commitPlayers,

  completeTileResolution,
  resolveArrivalTile,
}: UseAirportResolutionOptions) {
  /*
   * React state 렌더 타이밍과 관계없이
   * 현재 공항 방문을 즉시 확인하기 위한 ref.
   */
  const pendingAirportTravelRef =
    useRef<
      PendingAirportTravel | null
    >(
      pendingAirportTravel,
    );

  pendingAirportTravelRef.current =
    pendingAirportTravel;

  /*
   * 서버 echo를 기다리는 동안
   * 같은 버튼을 여러 번 눌러
   * 중복 이벤트를 발행하지 않게 한다.
   */
  const publishingActionIdRef =
    useRef<string | null>(
      null,
    );

  /*
   * 같은 서버 이벤트가 다시 들어와도
   * 결제나 completeTileResolution을
   * 중복 실행하지 않는다.
   */
  const appliedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const applyAirportTravelDecided =
    useCallback(
      (
        payload:
          UlsanMarbleAirportTravelDecidedPayload,
      ): boolean => {
        if (
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        const pending =
          pendingAirportTravelRef.current;

        /*
         * 아직 상대 클라이언트가
         * 공항 도착 상태를 만들기 전이면
         * 이벤트를 소비하지 않고 재시도한다.
         */
        if (!pending) {
          return false;
        }

        /*
         * player + 위치만 보는 것이 아니라
         * 정확히 동일한 공항 방문인지 확인한다.
         */
        if (
          pending.playerId !==
            payload.playerId ||
          pending.airportPosition !==
            payload.fromPosition ||
          pending.visitId !==
            payload.visitId ||
          pending.turnSequence !==
            payload.turnSequence
        ) {
          return false;
        }

        /*
         * 공항 미이용
         */
        if (
          payload.action ===
            "CANCEL"
        ) {
          appliedActionIdsRef.current.add(
            payload.actionId,
          );

          publishingActionIdRef.current =
            null;

          pendingAirportTravelRef.current =
            null;

          setPendingAirportTravel(
            null,
          );

          setAirportTravelError(
            null,
          );

          completeTileResolution();

          return true;
        }

        /*
         * 공항 이용
         */
        const destinationTile =
          tiles[
            payload.destinationPosition
          ];

        if (
          !destinationTile ||
          !isAirportDestinationEligible(
            destinationTile,
            payload.fromPosition,
          )
        ) {
          return false;
        }

        const expectedArrivalId =
          createAirportArrivalId(
            payload.visitId,
            payload.destinationPosition,
          );

        if (
          payload.arrivalId !==
            expectedArrivalId
        ) {
          return false;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              payload.playerId,
          );

        if (
          !player ||
          player.position !==
            payload.fromPosition
        ) {
          return false;
        }

        /*
         * 돈은 선택 순간이 아니라
         * 서버 echo를 받은 순간
         * 양쪽에서 동일하게 차감한다.
         */
        const paymentResult =
          withdraw(
            payload.playerId,
            AIRPORT_TICKET_PRICE,
            "AIRPORT_TICKET",
            `울산공항 → ${destinationTile.name}`,
          );

        if (!paymentResult.ok) {
          setAirportTravelError(
            paymentResult.error ===
              "INSUFFICIENT_FUNDS"
              ? "INSUFFICIENT_FUNDS"
              : "PAYMENT_FAILED",
          );

          publishingActionIdRef.current =
            null;

          console.error(
            "[UlsanMarble] 공항 이동 동기화 적용 실패",
            {
              payload,

              paymentError:
                paymentResult.error,
            },
          );

          return false;
        }

        appliedActionIdsRef.current.add(
          payload.actionId,
        );

        publishingActionIdRef.current =
          null;

        pendingAirportTravelRef.current =
          null;

        setPendingAirportTravel(
          null,
        );

        setAirportTravelError(
          null,
        );

        setAirportFlight({
          id:
            payload.arrivalId,

          arrivalId:
            payload.arrivalId,

          turnSequence:
            payload.turnSequence,

          playerId:
            payload.playerId,

          fromPosition:
            payload.fromPosition,

          destinationPosition:
            payload.destinationPosition,

          destinationName:
            destinationTile.name,
        });

        return true;
      },
      [
        completeTileResolution,
        playersRef,
        setAirportFlight,
        setAirportTravelError,
        setPendingAirportTravel,
        tiles,
        withdraw,
      ],
    );

  const publishAirportTravelDecision =
    useCallback(
      (
        payload:
          UlsanMarbleAirportTravelDecidedPayload,
      ): void => {
        if (
          publishingActionIdRef.current ===
            payload.actionId ||
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return;
        }

        publishingActionIdRef.current =
          payload.actionId;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "AIRPORT_TRAVEL_DECIDED",

              payload,
            });
          } catch (error) {
            publishingActionIdRef.current =
              null;

            throw error;
          }

          return;
        }

        const applied =
          applyAirportTravelDecided(
            payload,
          );

        if (!applied) {
          publishingActionIdRef.current =
            null;
        }
      },
      [
        applyAirportTravelDecided,
        onNetworkGameEventRequest,
      ],
    );

  const travelFromAirport =
    useCallback(
      (
        destinationPosition:
          number,
      ): void => {
        const pending =
          pendingAirportTravelRef.current;

        if (!pending) {
          setAirportTravelError(
            "NO_PENDING_AIRPORT",
          );

          return;
        }

        if (
          onNetworkGameEventRequest &&
          pending.playerId !==
            localPlayerId
        ) {
          return;
        }

        const destinationTile =
          tiles[
            destinationPosition
          ];

        if (
          !destinationTile ||
          !isAirportDestinationEligible(
            destinationTile,
            pending.airportPosition,
          )
        ) {
          setAirportTravelError(
            "INVALID_DESTINATION",
          );

          return;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              pending.playerId,
          );

        if (!player) {
          setAirportTravelError(
            "PLAYER_NOT_FOUND",
          );

          return;
        }

        if (
          player.position !==
            pending.airportPosition
        ) {
          setAirportTravelError(
            "NO_PENDING_AIRPORT",
          );

          return;
        }

        if (
          !canPlayerAfford(
            pending.playerId,
            AIRPORT_TICKET_PRICE,
          )
        ) {
          setAirportTravelError(
            "INSUFFICIENT_FUNDS",
          );

          return;
        }

        const actionId =
          createAirportActionId(
            pending.visitId,
            "TRAVEL",
            destinationPosition,
          );

        const arrivalId =
          createAirportArrivalId(
            pending.visitId,
            destinationPosition,
          );

        const payload:
          UlsanMarbleAirportTravelDecidedPayload = {
            action:
              "TRAVEL",

            actionId,

            playerId:
              pending.playerId,

            visitId:
              pending.visitId,

            fromPosition:
              pending.airportPosition,

            destinationPosition,

            turnSequence:
              pending.turnSequence,

            arrivalId,
          };

        setAirportTravelError(
          null,
        );

        publishAirportTravelDecision(
          payload,
        );
      },
      [
        canPlayerAfford,
        localPlayerId,
        onNetworkGameEventRequest,
        playersRef,
        publishAirportTravelDecision,
        setAirportTravelError,
        tiles,
      ],
    );

  const completeAirportFlight =
    useCallback((): void => {
      const flight =
        airportFlight;

      if (!flight) {
        return;
      }

      const player =
        playersRef.current.find(
          (candidate) =>
            candidate.id ===
            flight.playerId,
        );

      if (!player) {
        setAirportFlight(null);

        completeTileResolution();

        return;
      }

      const movedPlayers =
        playersRef.current.map(
          (currentPlayer) =>
            currentPlayer.id ===
              flight.playerId
              ? {
                  ...currentPlayer,

                  position:
                    flight.destinationPosition,
                }
              : currentPlayer,
        );

      commitPlayers(
        movedPlayers,
      );

      setAirportFlight(
        null,
      );

      const arrival:
        UlsanMarbleArrivalContext = {
          arrivalId:
            flight.arrivalId,

          cause:
            "AIRPORT",

          playerId:
            flight.playerId,

          position:
            flight.destinationPosition,

          turnSequence:
            flight.turnSequence,
        };

      resolveArrivalTile(
        flight.destinationPosition,
        flight.playerId,
        arrival,
      );
    }, [
      airportFlight,
      commitPlayers,
      completeTileResolution,
      playersRef,
      resolveArrivalTile,
      setAirportFlight,
    ]);

  /*
   * 공항 미이용
   */
  const closeAirportTravel =
    useCallback((): void => {
      const pending =
        pendingAirportTravelRef.current;

      if (!pending) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        pending.playerId !==
          localPlayerId
      ) {
        return;
      }

      const actionId =
        createAirportActionId(
          pending.visitId,
          "CANCEL",
        );

      const payload:
        UlsanMarbleAirportTravelDecidedPayload = {
          action:
            "CANCEL",

          actionId,

          playerId:
            pending.playerId,

          visitId:
            pending.visitId,

          fromPosition:
            pending.airportPosition,

          turnSequence:
            pending.turnSequence,
        };

      setAirportTravelError(
        null,
      );

      publishAirportTravelDecision(
        payload,
      );
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      publishAirportTravelDecision,
      setAirportTravelError,
    ]);

  const resetAirportTravelResolution =
    useCallback((): void => {
      publishingActionIdRef.current =
        null;

      appliedActionIdsRef.current.clear();

      pendingAirportTravelRef.current =
        null;

      setPendingAirportTravel(
        null,
      );

      setAirportTravelError(
        null,
      );

      setAirportFlight(
        null,
      );
    }, [
      setAirportFlight,
      setAirportTravelError,
      setPendingAirportTravel,
    ]);

  return {
    travelFromAirport,

    completeAirportFlight,

    closeAirportTravel,

    applyAirportTravelDecided,

    resetAirportTravelResolution,
  };
}