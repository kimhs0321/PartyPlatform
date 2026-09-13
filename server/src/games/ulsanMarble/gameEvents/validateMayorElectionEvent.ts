import type {
  UlsanMarbleGameEvent,
  UlsanMarbleMayorCandidateId,
  UlsanMarbleMayorElectionStartedPayload,
  UlsanMarbleMayorElectionVoteCastPayload,
  UlsanMarbleMayorElectionResultResolvedPayload,
  UlsanMarbleMayorElectionResultConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";


const MAYOR_CANDIDATE_IDS =
  new Set<UlsanMarbleMayorCandidateId>([
    "candidate-kang-minjun",
    "candidate-yoon-seoyeon",
    "candidate-park-jihun",
    "candidate-choi-hyejin",
    "candidate-lee-dohyun",
    "candidate-han-yuna",
    "candidate-kim-taeyang",
    "candidate-song-jiwoo",
    "candidate-oh-harin",
    "candidate-jung-woojin",
    "candidate-moon-seojun",
    "candidate-seo-haneul",
  ]);


type MayorElectionStartedEvent =
  Extract<
    UlsanMarbleGameEvent,
    {
      kind:
        "MAYOR_ELECTION_STARTED";
    }
  >;

type MayorElectionVoteEvent =
  Extract<
    UlsanMarbleGameEvent,
    {
      kind:
        "MAYOR_ELECTION_VOTE_CAST";
    }
  >;

type MayorElectionResolvedEvent =
  Extract<
    UlsanMarbleGameEvent,
    {
      kind:
        "MAYOR_ELECTION_RESULT_RESOLVED";
    }
  >;

type MayorElectionConfirmedEvent =
  Extract<
    UlsanMarbleGameEvent,
    {
      kind:
        "MAYOR_ELECTION_RESULT_CONFIRMED";
    }
  >;


function fail(
  message: string,
): never {
  throw new Error(message);
}


function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}


function isMayorCandidateId(
  value: unknown,
): value is UlsanMarbleMayorCandidateId {
  return (
    typeof value === "string" &&
    MAYOR_CANDIDATE_IDS.has(
      value as UlsanMarbleMayorCandidateId,
    )
  );
}


function validateTurnBase(
  game: ClientUlsanMarbleGameState,
  payload: {
    turnNumber: number;
    turnSequence: number;
  },
): void {
  if (
    payload.turnNumber !==
    game.turnNumber
  ) {
    fail(
      "시장선거 이벤트의 턴 번호가 현재 턴과 일치하지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    fail(
      "시장선거 이벤트의 턴 순번이 현재 턴과 일치하지 않습니다.",
    );
  }
}


function validateControllerBase(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: {
    controllerPlayerId: string;
    turnNumber: number;
    turnSequence: number;
  },
): void {
  validateTurnBase(
    game,
    payload,
  );

  if (
    game.controllerPlayerId !==
    playerId
  ) {
    fail(
      "게임 진행 담당자만 시장선거를 진행할 수 있습니다.",
    );
  }

  if (
    payload.controllerPlayerId !==
    playerId
  ) {
    fail(
      "시장선거 제어 플레이어가 이벤트 발행자와 일치하지 않습니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.controllerPlayerId,
    )
  ) {
    fail(
      "시장선거 제어 플레이어가 존재하지 않습니다.",
    );
  }
}



function validateElectionId(
  electionId: string,
): void {
  if (
    !isNonEmptyString(
      electionId,
    )
  ) {
    fail(
      "시장선거 ID가 올바르지 않습니다.",
    );
  }
}


function findStartedEvent(
  game: ClientUlsanMarbleGameState,
  electionId: string,
): MayorElectionStartedEvent | undefined {
  return game.gameEvents.find(
    (
      event,
    ): event is MayorElectionStartedEvent =>
      event.kind ===
        "MAYOR_ELECTION_STARTED" &&
      event.payload.electionId ===
        electionId,
  );
}


function getVoteEvents(
  game: ClientUlsanMarbleGameState,
  electionId: string,
): MayorElectionVoteEvent[] {
  return game.gameEvents.filter(
    (
      event,
    ): event is MayorElectionVoteEvent =>
      event.kind ===
        "MAYOR_ELECTION_VOTE_CAST" &&
      event.payload.electionId ===
        electionId,
  );
}


function findResolvedEvent(
  game: ClientUlsanMarbleGameState,
  electionId: string,
): MayorElectionResolvedEvent | undefined {
  return game.gameEvents.find(
    (
      event,
    ): event is MayorElectionResolvedEvent =>
      event.kind ===
        "MAYOR_ELECTION_RESULT_RESOLVED" &&
      event.payload.electionId ===
        electionId,
  );
}


function findConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  electionId: string,
): MayorElectionConfirmedEvent | undefined {
  return game.gameEvents.find(
    (
      event,
    ): event is MayorElectionConfirmedEvent =>
      event.kind ===
        "MAYOR_ELECTION_RESULT_CONFIRMED" &&
      event.payload.electionId ===
        electionId,
  );
}


export function validateMayorElectionStartedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleMayorElectionStartedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  validateElectionId(
    payload.electionId,
  );


  if (
    payload.mode !== "SCHEDULED" &&
    payload.mode !== "DEV"
  ) {
    fail(
      "시장선거 실행 모드가 올바르지 않습니다.",
    );
  }

  if (
    payload.mode ===
    "SCHEDULED"
  ) {
    const completedTurnNumber =
      payload.turnNumber - 1;

    if (
      completedTurnNumber <= 0 ||
      completedTurnNumber % 10 !== 0
    ) {
      fail(
        "정기 시장선거를 시작할 수 없는 턴입니다.",
      );
    }
  }

  if (
    payload.mode === "DEV" &&
    game.phase !==
      "WAITING_FOR_ROLL"
  ) {
    fail(
      "DEV 시장선거는 주사위 대기 단계에서만 시작할 수 있습니다.",
    );
  }

  if (
    !Array.isArray(
      payload.candidateIds,
    ) ||
    payload.candidateIds.length !==
      3
  ) {
    fail(
      "시장선거 후보자는 정확히 3명이어야 합니다.",
    );
  }

  const candidateIdSet =
    new Set(
      payload.candidateIds,
    );

  if (
    candidateIdSet.size !==
    payload.candidateIds.length
  ) {
    fail(
      "시장선거 후보자가 중복되어 있습니다.",
    );
  }

  for (
    const candidateId of
    payload.candidateIds
  ) {
    if (
      !isMayorCandidateId(
        candidateId,
      )
    ) {
      fail(
        "시장선거 후보자 정보가 올바르지 않습니다.",
      );
    }
  }

  if (
    !Array.isArray(
      payload.eligibleVoterIds,
    ) ||
    payload.eligibleVoterIds.length ===
      0
  ) {
    fail(
      "시장선거 투표 가능자가 존재하지 않습니다.",
    );
  }

  const voterIdSet =
    new Set(
      payload.eligibleVoterIds,
    );

  if (
    voterIdSet.size !==
    payload.eligibleVoterIds.length
  ) {
    fail(
      "시장선거 투표 가능자 정보가 중복되어 있습니다.",
    );
  }

  for (
    const voterId of
    payload.eligibleVoterIds
  ) {
    if (
      !game.playerIds.includes(
        voterId,
      )
    ) {
      fail(
        "시장선거 투표 가능자가 게임에 존재하지 않습니다.",
      );
    }
  }

  if (
    !Array.isArray(
      payload
        .additionallyDisabledPlayerIds,
    )
  ) {
    fail(
      "시장선거 제외 플레이어 정보가 올바르지 않습니다.",
    );
  }

  const disabledIdSet =
    new Set(
      payload
        .additionallyDisabledPlayerIds,
    );

  if (
    disabledIdSet.size !==
    payload
      .additionallyDisabledPlayerIds
      .length
  ) {
    fail(
      "시장선거 제외 플레이어 정보가 중복되어 있습니다.",
    );
  }

  for (
    const disabledPlayerId of
    payload
      .additionallyDisabledPlayerIds
  ) {
    if (
      !game.playerIds.includes(
        disabledPlayerId,
      )
    ) {
      fail(
        "시장선거 제외 플레이어가 게임에 존재하지 않습니다.",
      );
    }

    if (
      voterIdSet.has(
        disabledPlayerId,
      )
    ) {
      fail(
        "시장선거 제외 플레이어가 투표 가능자에 포함되어 있습니다.",
      );
    }
  }

  if (
    findStartedEvent(
      game,
      payload.electionId,
    )
  ) {
    fail(
      "이미 시작된 시장선거입니다.",
    );
  }
}


export function validateMayorElectionVoteCastEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleMayorElectionVoteCastPayload,
): void {
  validateTurnBase(
    game,
    payload,
  );

  validateElectionId(
    payload.electionId,
  );

  if (
    payload.voterId !==
    playerId
  ) {
    fail(
      "시장선거 투표자는 이벤트 발행자 본인이어야 합니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.voterId,
    )
  ) {
    fail(
      "시장선거 투표자가 게임에 존재하지 않습니다.",
    );
  }

  if (
    !isMayorCandidateId(
      payload.candidateId,
    )
  ) {
    fail(
      "시장선거 투표 후보자가 올바르지 않습니다.",
    );
  }

  const startEvent =
    findStartedEvent(
      game,
      payload.electionId,
    );

  if (!startEvent) {
    fail(
      "시작되지 않은 시장선거에는 투표할 수 없습니다.",
    );
  }

  if (
    findResolvedEvent(
      game,
      payload.electionId,
    ) ||
    findConfirmedEvent(
      game,
      payload.electionId,
    )
  ) {
    fail(
      "이미 종료된 시장선거에는 투표할 수 없습니다.",
    );
  }

  if (
    !startEvent.payload
      .candidateIds
      .includes(
        payload.candidateId,
      )
  ) {
    fail(
      "이번 시장선거에 출마하지 않은 후보자입니다.",
    );
  }

  if (
    !startEvent.payload
      .eligibleVoterIds
      .includes(
        payload.voterId,
      )
  ) {
    fail(
      "시장선거 투표 권한이 없는 플레이어입니다.",
    );
  }

  const voteEvents =
    getVoteEvents(
      game,
      payload.electionId,
    );

  if (
    voteEvents.some(
      (event) =>
        event.payload.voterId ===
        payload.voterId,
    )
  ) {
    fail(
      "이미 투표를 완료한 플레이어입니다.",
    );
  }

  const expectedVoterId =
    startEvent.payload
      .eligibleVoterIds[
        voteEvents.length
      ];

  if (
    expectedVoterId !==
    payload.voterId
  ) {
    fail(
      "현재 시장선거 투표 순서가 아닙니다.",
    );
  }
}


export function validateMayorElectionResultResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleMayorElectionResultResolvedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  validateElectionId(
    payload.electionId,
  );

  const startEvent =
    findStartedEvent(
      game,
      payload.electionId,
    );

  if (!startEvent) {
    fail(
      "시작되지 않은 시장선거의 결과를 확정할 수 없습니다.",
    );
  }

  if (
    startEvent.payload
      .controllerPlayerId !==
    payload.controllerPlayerId
  ) {
    fail(
      "시장선거 결과 제어 플레이어가 시작 이벤트와 일치하지 않습니다.",
    );
  }

  if (
    findResolvedEvent(
      game,
      payload.electionId,
    )
  ) {
    fail(
      "이미 결과가 확정된 시장선거입니다.",
    );
  }

  if (
    findConfirmedEvent(
      game,
      payload.electionId,
    )
  ) {
    fail(
      "이미 종료 확인된 시장선거입니다.",
    );
  }

  if (
    !startEvent.payload
      .candidateIds
      .includes(
        payload.winnerCandidateId,
      )
  ) {
    fail(
      "시장선거 당선자가 후보자 목록에 없습니다.",
    );
  }

  const voteEvents =
    getVoteEvents(
      game,
      payload.electionId,
    );

  if (
    voteEvents.length !==
    startEvent.payload
      .eligibleVoterIds
      .length
  ) {
    fail(
      "모든 시장선거 투표가 완료되지 않았습니다.",
    );
  }

  const voteCounts:
    Record<string, number> =
      Object.fromEntries(
        startEvent.payload
          .candidateIds
          .map(
            (candidateId) => [
              candidateId,
              0,
            ],
          ),
      );

  for (
    const voteEvent of
    voteEvents
  ) {
    const candidateId =
      voteEvent.payload
        .candidateId;

    if (
      !(candidateId in voteCounts)
    ) {
      fail(
        "시장선거 투표 결과에 알 수 없는 후보자가 있습니다.",
      );
    }

    voteCounts[
      candidateId
    ] += 1;
  }

  const payloadVoteKeys =
    Object.keys(
      payload.voteCounts,
    );

  if (
    payloadVoteKeys.length !==
    startEvent.payload
      .candidateIds
      .length
  ) {
    fail(
      "시장선거 득표수 정보가 올바르지 않습니다.",
    );
  }

  for (
    const candidateId of
    startEvent.payload
      .candidateIds
  ) {
    const count =
      payload.voteCounts[
        candidateId
      ];

    if (
      !Number.isInteger(count) ||
      count < 0
    ) {
      fail(
        "시장선거 후보자 득표수가 올바르지 않습니다.",
      );
    }

    if (
      count !==
      voteCounts[
        candidateId
      ]
    ) {
      fail(
        "시장선거 득표수가 실제 투표 내용과 일치하지 않습니다.",
      );
    }
  }

  for (
    const key of
    payloadVoteKeys
  ) {
    if (
      !startEvent.payload
        .candidateIds
        .includes(
          key as
            UlsanMarbleMayorCandidateId,
        )
    ) {
      fail(
        "시장선거 득표수에 알 수 없는 후보자가 포함되어 있습니다.",
      );
    }
  }

  const highestVoteCount =
    Math.max(
      ...Object.values(
        voteCounts,
      ),
      0,
    );

  const expectedTiedCandidateIds =
    startEvent.payload
      .candidateIds
      .filter(
        (candidateId) =>
          voteCounts[
            candidateId
          ] ===
          highestVoteCount,
      );

  if (
    payload.tiedCandidateIds.length !==
    expectedTiedCandidateIds.length
  ) {
    fail(
      "시장선거 동률 후보자 정보가 실제 득표 결과와 일치하지 않습니다.",
    );
  }

  for (
    let index = 0;
    index <
    expectedTiedCandidateIds.length;
    index += 1
  ) {
    if (
      payload
        .tiedCandidateIds[index] !==
      expectedTiedCandidateIds[index]
    ) {
      fail(
        "시장선거 동률 후보자 정보가 실제 득표 결과와 일치하지 않습니다.",
      );
    }
  }

  if (
    !expectedTiedCandidateIds
      .includes(
        payload.winnerCandidateId,
      )
  ) {
    fail(
      "시장선거 당선자가 최고 득표 후보자가 아닙니다.",
    );
  }

  if (
    payload.wasTieBreak !==
    (
      expectedTiedCandidateIds
        .length > 1
    )
  ) {
    fail(
      "시장선거 동률 추첨 여부가 실제 결과와 일치하지 않습니다.",
    );
  }
}


export function validateMayorElectionResultConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleMayorElectionResultConfirmedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  validateElectionId(
    payload.electionId,
  );

  const startEvent =
    findStartedEvent(
      game,
      payload.electionId,
    );

  if (!startEvent) {
    fail(
      "시작되지 않은 시장선거를 종료할 수 없습니다.",
    );
  }

  if (
    startEvent.payload
      .controllerPlayerId !==
    payload.controllerPlayerId
  ) {
    fail(
      "시장선거 종료 제어 플레이어가 시작 이벤트와 일치하지 않습니다.",
    );
  }

  const resultEvent =
    findResolvedEvent(
      game,
      payload.electionId,
    );

  if (!resultEvent) {
    fail(
      "시장선거 결과가 확정되기 전에 종료할 수 없습니다.",
    );
  }

  if (
    resultEvent.payload
      .winnerCandidateId !==
    payload.winnerCandidateId
  ) {
    fail(
      "시장선거 종료 당선자가 확정 결과와 일치하지 않습니다.",
    );
  }

  if (
    findConfirmedEvent(
      game,
      payload.electionId,
    )
  ) {
    fail(
      "이미 종료 확인된 시장선거입니다.",
    );
  }
}