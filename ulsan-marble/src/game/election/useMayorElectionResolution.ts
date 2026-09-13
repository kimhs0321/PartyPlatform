import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleMayorCandidateId,
  UlsanMarbleMayorElectionResultConfirmedPayload,
  UlsanMarbleMayorElectionResultResolvedPayload,
  UlsanMarbleMayorElectionStartedPayload,
  UlsanMarbleMayorElectionVoteCastPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import {
  MAYOR_CANDIDATES,
  getCandidatePolicy,
} from "./candidatePool";

import {
  createMayorElectionCandidates,
  resolveMayorElection,
} from "./electionRules";

import type {
  MayorCandidate,
  MayorElectionResult,
  MayorTerm,
  PendingMayorElection,
} from "./electionTypes";

import type {
  NetworkGameEventApplyResult,
} from "../network/useNetworkGameEvents";


interface UseMayorElectionResolutionOptions {
  pendingMayorElection:
    PendingMayorElection | null;

  setPendingMayorElection:
    Dispatch<
      SetStateAction<
        PendingMayorElection | null
      >
    >;

  currentMayorTermRef:
    MutableRefObject<
      MayorTerm | null
    >;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  localPlayerId: string;

  controllerPlayerId?: string;

  /*
   * 로컬 lifecycle.
   * 이벤트 apply의 WAIT 판단에 사용한다.
   */
  turnNumber: number;
  turnSequence: number;

  /*
   * 서버 authoritative 값.
   * 네트워크 이벤트 발행에 사용한다.
   */
  networkTurnNumber?: number;
  networkTurnSequence?: number;

  canRunDev: boolean;

  commitMayorTerm:
    (
      nextTerm:
        MayorTerm | null,
    ) => void;

  startMayorElectionPhase:
    () => void;

  /*
   * 투표 가능자가 0명인 극단적 상황에서
   * 기존 turn system의 선거 완료 경로를 사용한다.
   */
  completeMayorElectionPhase:
    (
      additionallyDisabledPlayerIds?:
        string[],
    ) => void;

  cancelCurrentAction:
    () => void;

  startRandomEconomicNewsResolution:
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


const MAYOR_CANDIDATE_MAP =
  new Map<
    string,
    MayorCandidate
  >(
    MAYOR_CANDIDATES.map(
      (candidate) => [
        candidate.id,
        candidate,
      ],
    ),
  );


function toProtocolCandidateId(
  candidateId: string,
):
  UlsanMarbleMayorCandidateId | null {
  if (
    !MAYOR_CANDIDATE_MAP.has(
      candidateId,
    )
  ) {
    return null;
  }

  return candidateId as
    UlsanMarbleMayorCandidateId;
}


function createElectionActionId(
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


export function useMayorElectionResolution({
  pendingMayorElection,
  setPendingMayorElection,

  currentMayorTermRef,
  playersRef,

  localPlayerId,
  controllerPlayerId,

  turnNumber,
  turnSequence,

  networkTurnNumber,
  networkTurnSequence,

  canRunDev,

  commitMayorTerm,

  startMayorElectionPhase,
  completeMayorElectionPhase,

  cancelCurrentAction,

  startRandomEconomicNewsResolution,

  onNetworkGameEventRequest,
}: UseMayorElectionResolutionOptions) {
  /*
   * React state 반영 전 다음 GAME_EVENT가
   * 도착하는 경우까지 처리하기 위한 ref.
   */
  const pendingElectionRef =
    useRef<
      PendingMayorElection | null
    >(
      pendingMayorElection,
    );

  useEffect(() => {
    pendingElectionRef.current =
      pendingMayorElection;
  }, [
    pendingMayorElection,
  ]);


  const commitPendingElection =
    useCallback(
      (
        nextElection:
          PendingMayorElection | null,
      ) => {
        pendingElectionRef.current =
          nextElection;

        setPendingMayorElection(
          nextElection,
        );
      },
      [
        setPendingMayorElection,
      ],
    );


  const currentElectionIdRef =
    useRef<string | null>(
      null,
    );

  const actionSerialRef =
    useRef(0);


  /*
   * apply 중복 방지.
   */
  const appliedElectionStartIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const appliedVoteKeysRef =
    useRef<Set<string>>(
      new Set(),
    );

  const appliedElectionResultIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const confirmedElectionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );


  /*
   * 동일 UI 액션 연타에 의한
   * 중복 publish 방지.
   */
  const publishedElectionStartIdRef =
    useRef<string | null>(
      null,
    );

  const publishedVoteKeyRef =
    useRef<string | null>(
      null,
    );

  const publishedElectionResultIdRef =
    useRef<string | null>(
      null,
    );

  const publishedElectionConfirmIdRef =
    useRef<string | null>(
      null,
    );


  const isNetworkGame =
    Boolean(
      onNetworkGameEventRequest,
    );

  const isLocalController =
    controllerPlayerId ===
    localPlayerId;

  const eventTurnNumber =
    networkTurnNumber ??
    turnNumber;

  const eventTurnSequence =
    networkTurnSequence ??
    turnSequence;


  const createNextActionId =
    useCallback(
      (
        prefix: string,
      ): string => {
        actionSerialRef.current +=
          1;

        return createElectionActionId(
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
        payloadTurnNumber: number,
        payloadTurnSequence: number,
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

  const applyMayorElectionStarted =
    useCallback(
      (
        payload:
          UlsanMarbleMayorElectionStartedPayload,
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
          appliedElectionStartIdsRef
            .current
            .has(
              payload.electionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        const existingElection =
          pendingElectionRef.current;

        if (existingElection) {
          if (
            currentElectionIdRef
              .current ===
            payload.electionId
          ) {
            return "ALREADY_APPLIED";
          }

          return "INVALID";
        }

        const candidates:
          MayorCandidate[] = [];

        for (
          const candidateId of
          payload.candidateIds
        ) {
          const candidate =
            MAYOR_CANDIDATE_MAP.get(
              candidateId,
            );

          if (!candidate) {
            return "INVALID";
          }

          candidates.push(
            candidate,
          );
        }

        if (
          candidates.length !== 3
        ) {
          return "INVALID";
        }

        const eligibleVoterIds =
          [
            ...payload
              .eligibleVoterIds,
          ];

        if (
          eligibleVoterIds.length ===
          0
        ) {
          return "INVALID";
        }

        currentElectionIdRef.current =
          payload.electionId;

        appliedElectionStartIdsRef
          .current
          .add(
            payload.electionId,
          );

        if (
          publishedElectionStartIdRef
            .current ===
          payload.electionId
        ) {
          publishedElectionStartIdRef
            .current =
            null;
        }

        commitPendingElection({
          electionTurn:
            payload.mode === "SCHEDULED"
              ? payload.turnNumber - 1
              : payload.turnNumber,

          mode:
            payload.mode,

          candidates,

          eligibleVoterIds,

          currentVoterIndex:
            0,

          votes: {},

          result: null,

          additionallyDisabledPlayerIds:
            [
              ...payload
                .additionallyDisabledPlayerIds,
            ],
        });

        startMayorElectionPhase();

        return "APPLIED";
      },
      [
        commitPendingElection,
        getApplyTurnState,
        startMayorElectionPhase,
      ],
    );


  /*
   * RESULT 이벤트를 실제 로컬 상태에 반영한다.
   *
   * 이 함수가 VOTE apply보다 먼저 선언되는 이유는
   * 마지막 투표 직후 동일한 apply 경로로
   * 결과를 확정하기 위해서다.
   */
  const applyMayorElectionResultResolved =
    useCallback(
      (
        payload:
          UlsanMarbleMayorElectionResultResolvedPayload,
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
          appliedElectionResultIdsRef
            .current
            .has(
              payload.electionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        const election =
          pendingElectionRef.current;

        if (!election) {
          return "WAIT";
        }

        if (
          currentElectionIdRef
            .current !==
          payload.electionId
        ) {
          return "INVALID";
        }

        if (election.result) {
          return "ALREADY_APPLIED";
        }

        if (
          election.currentVoterIndex <
          election
            .eligibleVoterIds
            .length
        ) {
          /*
           * 마지막 VOTE 이벤트가 먼저
           * 로컬 상태에 반영되어야 한다.
           */
          return "WAIT";
        }

        const winner =
          election.candidates.find(
            (candidate) =>
              candidate.id ===
              payload
                .winnerCandidateId,
          );

        if (!winner) {
          return "INVALID";
        }

        /*
         * 클라이언트에서도 득표수를 한 번 더 확인한다.
         */
        const localVoteCounts:
          Record<
            string,
            number
          > =
            Object.fromEntries(
              election.candidates.map(
                (candidate) => [
                  candidate.id,
                  0,
                ],
              ),
            );

        for (
          const candidateId of
          Object.values(
            election.votes,
          )
        ) {
          if (
            candidateId in
            localVoteCounts
          ) {
            localVoteCounts[
              candidateId
            ] += 1;
          }
        }

        for (
          const candidate of
          election.candidates
        ) {
          if (
            localVoteCounts[
              candidate.id
            ] !==
            payload.voteCounts[
              candidate.id
            ]
          ) {
            return "INVALID";
          }
        }

        const result:
          MayorElectionResult = {
          winnerCandidateId:
            payload
              .winnerCandidateId,

          voteCounts: {
            ...payload
              .voteCounts,
          },

          tiedCandidateIds: [
            ...payload
              .tiedCandidateIds,
          ],

          wasTieBreak:
            payload.wasTieBreak,
        };

        commitMayorTerm({
          candidate:
            winner,

          policy:
            getCandidatePolicy(
              winner,
            ),

          electedTurn:
            election
              .electionTurn,

          activeFromTurn:
            election
              .electionTurn + 1,

          expiresAfterTurn:
            election
              .electionTurn + 10,
        });

        commitPendingElection({
          ...election,

          result,
        });

        appliedElectionResultIdsRef
          .current
          .add(
            payload.electionId,
          );

        if (
          publishedElectionResultIdRef
            .current ===
          payload.electionId
        ) {
          publishedElectionResultIdRef
            .current =
            null;
        }

        return "APPLIED";
      },
      [
        commitMayorTerm,
        commitPendingElection,
        getApplyTurnState,
      ],
    );


  /*
   * 모든 표가 들어온 뒤
   * 고정 controller 한 명만
   * random tie-break까지 결정한다.
   */
  const resolveAndPublishElectionResult =
    useCallback(
      (
        election:
          PendingMayorElection,
      ) => {
        if (
          election.result
        ) {
          return;
        }

        const electionId =
          currentElectionIdRef
            .current;

        if (!electionId) {
          return;
        }

        if (
          isNetworkGame &&
          !isLocalController
        ) {
          return;
        }

        if (
          publishedElectionResultIdRef
            .current ===
          electionId
        ) {
          return;
        }

        const result =
          resolveMayorElection(
            election.candidates,
            election.votes,
          );

        const winnerCandidateId =
          toProtocolCandidateId(
            result.winnerCandidateId,
          );

        if (
          !winnerCandidateId
        ) {
          return;
        }

        const tiedCandidateIds:
          UlsanMarbleMayorCandidateId[] =
            [];

        for (
          const candidateId of
          result.tiedCandidateIds
        ) {
          const protocolId =
            toProtocolCandidateId(
              candidateId,
            );

          if (!protocolId) {
            return;
          }

          tiedCandidateIds.push(
            protocolId,
          );
        }

        const payload:
          UlsanMarbleMayorElectionResultResolvedPayload =
          {
            electionId,

            controllerPlayerId:
              localPlayerId,

            turnNumber:
              isNetworkGame
                ? eventTurnNumber
                : turnNumber,

            turnSequence:
              isNetworkGame
                ? eventTurnSequence
                : turnSequence,

            winnerCandidateId,

            voteCounts: {
              ...result.voteCounts,
            },

            tiedCandidateIds,

            wasTieBreak:
              result.wasTieBreak,
          };

        if (
          isNetworkGame &&
          onNetworkGameEventRequest
        ) {
          publishedElectionResultIdRef.current =
            electionId;

          onNetworkGameEventRequest({
            kind:
              "MAYOR_ELECTION_RESULT_RESOLVED",

            payload,
          });

          return;
        }

        applyMayorElectionResultResolved(
          payload,
        );
      },
      [
        applyMayorElectionResultResolved,
        eventTurnNumber,
        eventTurnSequence,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );


  const applyMayorElectionVoteCast =
    useCallback(
      (
        payload:
          UlsanMarbleMayorElectionVoteCastPayload,
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

        const voteKey =
          [
            payload.electionId,
            payload.voterId,
          ].join(":");

        if (
          appliedVoteKeysRef
            .current
            .has(voteKey)
        ) {
          return "ALREADY_APPLIED";
        }

        const election =
          pendingElectionRef.current;

        if (!election) {
          return "WAIT";
        }

        if (
          currentElectionIdRef
            .current !==
          payload.electionId
        ) {
          return "INVALID";
        }

        if (
          election.result
        ) {
          return "INVALID";
        }

        const candidateExists =
          election.candidates.some(
            (candidate) =>
              candidate.id ===
              payload.candidateId,
          );

        if (
          !candidateExists
        ) {
          return "INVALID";
        }

        const expectedVoterId =
          election
            .eligibleVoterIds[
              election
                .currentVoterIndex
            ];

        if (
          expectedVoterId !==
          payload.voterId
        ) {
          return "INVALID";
        }

        if (
          election.votes[
            payload.voterId
          ]
        ) {
          return "ALREADY_APPLIED";
        }

        const nextVotes = {
          ...election.votes,

          [payload.voterId]:
            payload.candidateId,
        };

        const nextVoterIndex =
          election
            .currentVoterIndex + 1;

        const nextElection:
          PendingMayorElection = {
          ...election,

          votes:
            nextVotes,

          currentVoterIndex:
            nextVoterIndex,
        };

        commitPendingElection(
          nextElection,
        );

        appliedVoteKeysRef
          .current
          .add(voteKey);

        if (
          publishedVoteKeyRef
            .current ===
          voteKey
        ) {
          publishedVoteKeyRef
            .current =
            null;
        }

        if (
          nextVoterIndex >=
          election
            .eligibleVoterIds
            .length
        ) {
          /*
           * 모든 클라이언트가 같은 vote state를
           * 적용하지만 RESULT 발행은
           * 고정 controller만 수행한다.
           */
          resolveAndPublishElectionResult(
            nextElection,
          );
        }

        return "APPLIED";
      },
      [
        commitPendingElection,
        getApplyTurnState,
        resolveAndPublishElectionResult,
      ],
    );


  const applyMayorElectionResultConfirmed =
    useCallback(
      (
        payload:
          UlsanMarbleMayorElectionResultConfirmedPayload,
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
          confirmedElectionIdsRef
            .current
            .has(
              payload.electionId,
            )
        ) {
          return "ALREADY_APPLIED";
        }

        const election =
          pendingElectionRef.current;

        if (!election) {
          return "WAIT";
        }

        if (
          currentElectionIdRef
            .current !==
          payload.electionId
        ) {
          return "INVALID";
        }

        if (!election.result) {
          return "WAIT";
        }

        if (
          election.result
            .winnerCandidateId !==
          payload.winnerCandidateId
        ) {
          return "INVALID";
        }

        const {
          mode,
          additionallyDisabledPlayerIds,
        } = election;

        confirmedElectionIdsRef
          .current
          .add(
            payload.electionId,
          );

        if (
          publishedElectionConfirmIdRef
            .current ===
          payload.electionId
        ) {
          publishedElectionConfirmIdRef
            .current =
            null;
        }

        currentElectionIdRef.current =
          null;

        commitPendingElection(
          null,
        );

        if (
          mode === "DEV"
        ) {
          cancelCurrentAction();

          return "APPLIED";
        }

        startRandomEconomicNewsResolution(
          "SCHEDULED",
          additionallyDisabledPlayerIds,
        );

        return "APPLIED";
      },
      [
        cancelCurrentAction,
        commitPendingElection,
        getApplyTurnState,
        startRandomEconomicNewsResolution,
      ],
    );


  const startMayorElectionResolution =
    useCallback(
      (
        mode:
          | "SCHEDULED"
          | "DEV",

        additionallyDisabledPlayerIds:
          string[] = [],
      ) => {
        if (
          mode === "DEV" &&
          !canRunDev
        ) {
          return;
        }

        const disabledPlayerIdSet =
          new Set(
            additionallyDisabledPlayerIds,
          );

        const eligibleVoterIds =
          playersRef.current
            .filter(
              (player) =>
                !player.isBankrupt &&
                !disabledPlayerIdSet.has(
                  player.id,
                ),
            )
            .map(
              (player) =>
                player.id,
            );

        /*
         * 기존 로직 보존.
         *
         * 이 경우 랜덤 결정이 없으므로
         * 별도 network event를 만들지 않는다.
         */
        if (
          eligibleVoterIds.length ===
          0
        ) {
          if (
            mode === "DEV"
          ) {
            cancelCurrentAction();
          } else {
            completeMayorElectionPhase(
              additionallyDisabledPlayerIds,
            );
          }

          return;
        }

        /*
         * 네트워크 후보 추첨은
         * 서버 active player 한 명만 한다.
         */
        if (
          isNetworkGame &&
          !isLocalController
        ) {
          return;
        }

        if (
          publishedElectionStartIdRef
            .current
        ) {
          return;
        }

        if (
          pendingElectionRef.current
        ) {
          return;
        }

        const candidates =
          createMayorElectionCandidates(
            currentMayorTermRef
              .current
              ?.policy.id ??
              null,
          );

        if (
          candidates.length !== 3
        ) {
          return;
        }

        const candidateIds =
          candidates.map(
            (candidate) =>
              toProtocolCandidateId(
                candidate.id,
              ),
          );

        if (
          candidateIds.some(
            (candidateId) =>
              !candidateId,
          )
        ) {
          return;
        }

        const electionId =
          createNextActionId(
            mode === "DEV"
              ? "MAYOR_ELECTION_DEV"
              : "MAYOR_ELECTION",
          );

        const payload:
          UlsanMarbleMayorElectionStartedPayload =
          {
            electionId,

            controllerPlayerId:
              localPlayerId,

            mode,

            turnNumber:
              isNetworkGame
                ? eventTurnNumber
                : turnNumber,

            turnSequence:
              isNetworkGame
                ? eventTurnSequence
                : turnSequence,

            candidateIds:
              candidateIds as [
                UlsanMarbleMayorCandidateId,
                UlsanMarbleMayorCandidateId,
                UlsanMarbleMayorCandidateId,
              ],

            eligibleVoterIds:
              [
                ...eligibleVoterIds,
              ],

            additionallyDisabledPlayerIds:
              [
                ...new Set(
                  additionallyDisabledPlayerIds,
                ),
              ],
          };

        if (
          isNetworkGame &&
          onNetworkGameEventRequest
        ) {
          publishedElectionStartIdRef.current =
            electionId;

          onNetworkGameEventRequest({
            kind:
              "MAYOR_ELECTION_STARTED",

            payload,
          });

          return;
        }

        applyMayorElectionStarted(
          payload,
        );
      },
      [
        applyMayorElectionStarted,
        canRunDev,
        cancelCurrentAction,
        completeMayorElectionPhase,
        createNextActionId,
        currentMayorTermRef,
        eventTurnNumber,
        eventTurnSequence,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        playersRef,
        turnNumber,
        turnSequence,
      ],
    );


  const castMayorElectionVote =
    useCallback(
      (
        candidateId:
          string,
      ) => {
        const election =
          pendingElectionRef.current;

        if (
          !election ||
          election.result
        ) {
          return;
        }

        const electionId =
          currentElectionIdRef
            .current;

        if (!electionId) {
          return;
        }

        const candidate =
          election.candidates.find(
            (item) =>
              item.id ===
              candidateId,
          );

        if (!candidate) {
          return;
        }

        const protocolCandidateId =
          toProtocolCandidateId(
            candidate.id,
          );

        if (
          !protocolCandidateId
        ) {
          return;
        }

        const voterId =
          election
            .eligibleVoterIds[
              election
                .currentVoterIndex
            ];

        if (!voterId) {
          return;
        }

        /*
         * 네트워크에서는 반드시
         * 현재 voter 본인 클라이언트가 발행한다.
         */
        if (
          isNetworkGame &&
          voterId !==
            localPlayerId
        ) {
          return;
        }

        const voteKey =
          [
            electionId,
            voterId,
          ].join(":");

        if (
          publishedVoteKeyRef
            .current ===
          voteKey
        ) {
          return;
        }

        const payload:
          UlsanMarbleMayorElectionVoteCastPayload =
          {
            electionId,

            voterId,

            candidateId:
              protocolCandidateId,

            turnNumber:
              isNetworkGame
                ? eventTurnNumber
                : turnNumber,

            turnSequence:
              isNetworkGame
                ? eventTurnSequence
                : turnSequence,
          };

        if (
          isNetworkGame &&
          onNetworkGameEventRequest
        ) {
          publishedVoteKeyRef.current =
            voteKey;

          onNetworkGameEventRequest({
            kind:
              "MAYOR_ELECTION_VOTE_CAST",

            payload,
          });

          return;
        }

        applyMayorElectionVoteCast(
          payload,
        );
      },
      [
        applyMayorElectionVoteCast,
        eventTurnNumber,
        eventTurnSequence,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );


  const completePendingMayorElection =
    useCallback(
      () => {
        const election =
          pendingElectionRef.current;

        if (
          !election?.result
        ) {
          return;
        }

        const electionId =
          currentElectionIdRef
            .current;

        if (!electionId) {
          return;
        }

        if (
          isNetworkGame &&
          !isLocalController
        ) {
          return;
        }

        if (
          publishedElectionConfirmIdRef
            .current ===
          electionId
        ) {
          return;
        }

        const winnerCandidateId =
          toProtocolCandidateId(
            election.result
              .winnerCandidateId,
          );

        if (
          !winnerCandidateId
        ) {
          return;
        }

        const payload:
          UlsanMarbleMayorElectionResultConfirmedPayload =
          {
            electionId,

            controllerPlayerId:
              localPlayerId,

            winnerCandidateId,

            turnNumber:
              isNetworkGame
                ? eventTurnNumber
                : turnNumber,

            turnSequence:
              isNetworkGame
                ? eventTurnSequence
                : turnSequence,
          };

        if (
          isNetworkGame &&
          onNetworkGameEventRequest
        ) {
          publishedElectionConfirmIdRef.current =
            electionId;

          onNetworkGameEventRequest({
            kind:
              "MAYOR_ELECTION_RESULT_CONFIRMED",

            payload,
          });

          return;
        }

        applyMayorElectionResultConfirmed(
          payload,
        );
      },
      [
        applyMayorElectionResultConfirmed,
        eventTurnNumber,
        eventTurnSequence,
        isLocalController,
        isNetworkGame,
        localPlayerId,
        onNetworkGameEventRequest,
        turnNumber,
        turnSequence,
      ],
    );


  const devRunMayorElection =
    useCallback(
      () => {
        if (!canRunDev) {
          return;
        }

        startMayorElectionResolution(
          "DEV",
        );
      },
      [
        canRunDev,
        startMayorElectionResolution,
      ],
    );


  const resetMayorElectionResolution =
    useCallback(
      () => {
        currentElectionIdRef.current =
          null;

        publishedElectionStartIdRef.current =
          null;

        publishedVoteKeyRef.current =
          null;

        publishedElectionResultIdRef.current =
          null;

        publishedElectionConfirmIdRef.current =
          null;

        appliedElectionStartIdsRef
          .current
          .clear();

        appliedVoteKeysRef
          .current
          .clear();

        appliedElectionResultIdsRef
          .current
          .clear();

        confirmedElectionIdsRef
          .current
          .clear();

        commitPendingElection(
          null,
        );
      },
      [
        commitPendingElection,
      ],
    );


  const currentVoterId =
    pendingMayorElection &&
    !pendingMayorElection.result
      ? pendingMayorElection
          .eligibleVoterIds[
            pendingMayorElection
              .currentVoterIndex
          ] ??
        null
      : null;


  return {
    startMayorElectionResolution,

    castMayorElectionVote,
    completePendingMayorElection,

    applyMayorElectionStarted,
    applyMayorElectionVoteCast,
    applyMayorElectionResultResolved,
    applyMayorElectionResultConfirmed,

    devRunMayorElection,

    resetMayorElectionResolution,

    currentMayorElectionVoterId:
      currentVoterId,

    canVoteInMayorElection:
      Boolean(
        pendingMayorElection &&
        !pendingMayorElection.result &&
        (
          !isNetworkGame ||
          currentVoterId ===
            localPlayerId
        ),
      ),

    canConfirmMayorElectionResult:
      Boolean(
        pendingMayorElection?.result &&
        (
          !isNetworkGame ||
          isLocalController
        ),
      ),
  };
}