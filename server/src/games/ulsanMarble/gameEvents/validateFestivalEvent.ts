import type {
  UlsanMarbleFestivalAnnouncementConfirmedPayload,
  UlsanMarbleFestivalDeckPayload,
  UlsanMarbleFestivalDevEndedPayload,
  UlsanMarbleFestivalId,
  UlsanMarbleFestivalTriggerResolvedPayload,
  UlsanMarbleTouristNpcPayload,
  UlsanMarbleTouristTurnConfirmedPayload,
  UlsanMarbleTouristTurnResolvedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const FESTIVAL_IDS =
  new Set<UlsanMarbleFestivalId>([
    "ULSAN_INDUSTRY",
    "NAM_WHALE",
    "JUNG_MADUHEE",
    "BUK_SOEBURI",
    "DONG_SHIPBUILDING",
    "ULJU_ONGGI",
  ]);

const TOURIST_LANDING_KINDS =
  new Set([
    "OWNED_PROPERTY",
    "UNOWNED_PROPERTY",
    "SPECIAL_TILE",
    "FESTIVAL_END",
  ]);

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

function isFestivalId(
  value: unknown,
): value is UlsanMarbleFestivalId {
  return (
    typeof value === "string" &&
    FESTIVAL_IDS.has(
      value as UlsanMarbleFestivalId,
    )
  );
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
  if (
    payload.controllerPlayerId !==
    playerId
  ) {
    fail(
      "축제 이벤트 제어 플레이어가 발행자와 일치하지 않습니다.",
    );
  }

  if (
    game.controllerPlayerId !==
    playerId
  ) {
    fail(
      "게임 진행 담당자만 축제 이벤트를 진행할 수 있습니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.controllerPlayerId,
    )
  ) {
    fail(
      "축제 이벤트 제어 플레이어가 존재하지 않습니다.",
    );
  }

  if (
    payload.turnNumber !==
    game.turnNumber
  ) {
    fail(
      "축제 이벤트의 턴 번호가 현재 턴과 일치하지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    fail(
      "축제 이벤트의 턴 순번이 현재 턴과 일치하지 않습니다.",
    );
  }
}

function validateDisabledPlayerIds(
  game: ClientUlsanMarbleGameState,
  playerIds: string[],
): void {
  if (!Array.isArray(playerIds)) {
    fail(
      "축제 정산 제외 플레이어 정보가 올바르지 않습니다.",
    );
  }

  const uniqueIds =
    new Set(playerIds);

  if (
    uniqueIds.size !==
    playerIds.length
  ) {
    fail(
      "축제 정산 제외 플레이어 정보가 중복되어 있습니다.",
    );
  }

  for (const playerId of playerIds) {
    if (
      !game.playerIds.includes(
        playerId,
      )
    ) {
      fail(
        "축제 정산 제외 플레이어가 존재하지 않습니다.",
      );
    }
  }
}

function validateFestivalDeck(
  deck:
    UlsanMarbleFestivalDeckPayload,
): void {
  if (
    !Number.isInteger(deck.cycle) ||
    deck.cycle <= 0
  ) {
    fail(
      "축제 덱 순환 번호가 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(deck.drawPile) ||
    deck.drawPile.length >
      FESTIVAL_IDS.size
  ) {
    fail(
      "축제 덱 정보가 올바르지 않습니다.",
    );
  }

  const seen =
    new Set<UlsanMarbleFestivalId>();

  for (
    const festivalId of
    deck.drawPile
  ) {
    if (
      !isFestivalId(festivalId)
    ) {
      fail(
        "축제 덱에 알 수 없는 축제가 포함되어 있습니다.",
      );
    }

    if (
      seen.has(festivalId)
    ) {
      fail(
        "축제 덱에 중복된 축제가 포함되어 있습니다.",
      );
    }

    seen.add(festivalId);
  }
}

function isDiceFace(
  value: unknown,
): boolean {
  return (
    Number.isInteger(value) &&
    Number(value) >= 1 &&
    Number(value) <= 6
  );
}

function validateMoney(
  value: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    fail(
      `${label} 금액이 올바르지 않습니다.`,
    );
  }
}

function validatePosition(
  value: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    fail(
      `${label} 위치가 올바르지 않습니다.`,
    );
  }
}

function validateNextTouristNpc(
  npc:
    UlsanMarbleTouristNpcPayload,
  payload:
    UlsanMarbleTouristTurnResolvedPayload,
): void {
  validatePosition(
    npc.position,
    "관광객",
  );

  if (
    !Number.isInteger(
      npc.travelledSteps,
    ) ||
    npc.travelledSteps < 0
  ) {
    fail(
      "관광객 누적 이동 거리가 올바르지 않습니다.",
    );
  }

  if (npc.moving) {
    fail(
      "정산 완료 관광객 상태는 이동 중일 수 없습니다.",
    );
  }

  if (
    npc.position !==
    payload.toPosition
  ) {
    fail(
      "관광객 최종 위치가 정산 결과와 일치하지 않습니다.",
    );
  }

  if (
    !npc.lastDice ||
    npc.lastDice.length !== 2 ||
    npc.lastDice[0] !==
      payload.diceValues[0] ||
    npc.lastDice[1] !==
      payload.diceValues[1]
  ) {
    fail(
      "관광객 최종 주사위 정보가 정산 결과와 일치하지 않습니다.",
    );
  }
}

export function validateFestivalTriggerResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleFestivalTriggerResolvedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  if (
    !isNonEmptyString(
      payload.resolutionId,
    )
  ) {
    fail(
      "축제 발생 판정 ID가 올바르지 않습니다.",
    );
  }

  validateDisabledPlayerIds(
    game,
    payload
      .additionallyDisabledPlayerIds,
  );

  validateFestivalDeck(
    payload.nextDeck,
  );

  if (
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "FESTIVAL_TRIGGER_RESOLVED" &&
        event.payload.resolutionId ===
          payload.resolutionId,
    )
  ) {
    fail(
      "이미 처리된 축제 발생 판정입니다.",
    );
  }

  if (
    payload.outcome === "SKIP"
  ) {
    if (
      payload.mode !==
      "SCHEDULED"
    ) {
      fail(
        "DEV 축제 발생 판정은 SKIP일 수 없습니다.",
      );
    }

    return;
  }

  if (
    payload.outcome !== "START"
  ) {
    fail(
      "축제 발생 판정 결과가 올바르지 않습니다.",
    );
  }

  if (
    payload.mode !==
      "SCHEDULED" &&
    payload.mode !==
      "DEV"
  ) {
    fail(
      "축제 발생 모드가 올바르지 않습니다.",
    );
  }

  if (
    !isFestivalId(
      payload.festivalId,
    )
  ) {
    fail(
      "축제 정보가 올바르지 않습니다.",
    );
  }

  /*
  * 정기 축제는 라운드 종료 후 실행된다.
  * 이 시점의 서버 turnNumber는 이미
  * 다음 라운드를 가리키므로,
  * 실제 축제 판정 대상은 직전 완료 턴이다.
  */
  if (
    payload.mode === "SCHEDULED"
  ) {
    const completedTurnNumber =
      payload.turnNumber - 1;

    if (
      completedTurnNumber <= 0 ||
      completedTurnNumber % 5 !== 0
    ) {
      fail(
        "정기 축제를 시작할 수 없는 턴입니다.",
      );
    }
  }

  if (
    payload.mode === "DEV" &&
    game.phase !==
      "WAITING_FOR_ROLL"
  ) {
    fail(
      "DEV 축제는 주사위 대기 단계에서만 시작할 수 있습니다.",
    );
  }
}

export function validateFestivalAnnouncementConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleFestivalAnnouncementConfirmedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  if (
    !isNonEmptyString(
      payload.resolutionId,
    ) ||
    !isFestivalId(
      payload.festivalId,
    )
  ) {
    fail(
      "축제 안내 확인 정보가 올바르지 않습니다.",
    );
  }

  const triggerEvent =
    game.gameEvents.find(
      (event) =>
        event.kind ===
          "FESTIVAL_TRIGGER_RESOLVED" &&
        event.payload.outcome ===
          "START" &&
        event.payload.resolutionId ===
          payload.resolutionId,
    );

  if (
    !triggerEvent ||
    triggerEvent.kind !==
      "FESTIVAL_TRIGGER_RESOLVED" ||
    triggerEvent.payload.outcome !==
      "START" ||
    triggerEvent.payload.festivalId !==
      payload.festivalId ||
    triggerEvent.payload
      .controllerPlayerId !==
      payload.controllerPlayerId ||
    triggerEvent.payload
      .turnSequence !==
      payload.turnSequence

  ) {
    fail(
      "확인할 축제 안내 이벤트가 존재하지 않습니다.",
    );
  }

  if (
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "FESTIVAL_ANNOUNCEMENT_CONFIRMED" &&
        event.payload.resolutionId ===
          payload.resolutionId,
    )
  ) {
    fail(
      "이미 확인된 축제 안내입니다.",
    );
  }
}

export function validateTouristTurnResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleTouristTurnResolvedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  if (
    !isNonEmptyString(
      payload.touristTurnId,
    ) ||
    !isFestivalId(
      payload.festivalId,
    )
  ) {
    fail(
      "관광객 턴 정보가 올바르지 않습니다.",
    );
  }

  if (
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "TOURIST_TURN_RESOLVED" &&
        event.payload.touristTurnId ===
          payload.touristTurnId,
    )
  ) {
    fail(
      "이미 처리된 관광객 턴입니다.",
    );
  }

  if (
    !Array.isArray(
      payload.diceValues,
    ) ||
    payload.diceValues.length !==
      2 ||
    !isDiceFace(
      payload.diceValues[0],
    ) ||
    !isDiceFace(
      payload.diceValues[1],
    )
  ) {
    fail(
      "관광객 주사위 정보가 올바르지 않습니다.",
    );
  }

  validatePosition(
    payload.fromPosition,
    "관광객 출발",
  );

  validatePosition(
    payload.toPosition,
    "관광객 도착",
  );

  if (
    !isNonEmptyString(
      payload.landedTileName,
    )
  ) {
    fail(
      "관광객 도착 칸 정보가 올바르지 않습니다.",
    );
  }

  if (
    !TOURIST_LANDING_KINDS.has(
      payload.landingKind,
    )
  ) {
    fail(
      "관광객 도착 결과가 올바르지 않습니다.",
    );
  }

  validateMoney(
    payload.bankPayout,
    "관광객 소유주 지급",
  );

  validateMoney(
    payload.finalToll,
    "관광객 통행료",
  );

  validateDisabledPlayerIds(
    game,
    payload
      .additionallyDisabledPlayerIds,
  );

  if (
    payload.completedLap
  ) {
    if (
      payload.toPosition !== 0 ||
      payload.landingKind !==
        "FESTIVAL_END" ||
      payload.nextTouristNpc !==
        null ||
      payload.ownerPlayerId !==
        null ||
      payload.ownerName !== null ||
      payload.propertyName !==
        null ||
      payload.bankPayout !== 0 ||
      payload.finalToll !== 0
    ) {
      fail(
        "축제 종료 관광객 정산 정보가 일치하지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.landingKind ===
      "FESTIVAL_END" ||
    !payload.nextTouristNpc
  ) {
    fail(
      "관광객 일반 턴의 최종 상태가 올바르지 않습니다.",
    );
  }

  validateNextTouristNpc(
    payload.nextTouristNpc,
    payload,
  );

  if (
    payload.landingKind ===
    "OWNED_PROPERTY"
  ) {
    if (
      !payload.ownerPlayerId ||
      !game.playerIds.includes(
        payload.ownerPlayerId,
      ) ||
      !isNonEmptyString(
        payload.ownerName,
      ) ||
      !isNonEmptyString(
        payload.propertyName,
      )
    ) {
      fail(
        "관광객 소유 부동산 정산 정보가 올바르지 않습니다.",
      );
    }

    if (
      payload.bankPayout >
      payload.finalToll
    ) {
      fail(
        "관광객 소유주 지급액이 통행료보다 클 수 없습니다.",
      );
    }

    return;
  }

  if (
    payload.ownerPlayerId !==
      null ||
    payload.ownerName !== null ||
    payload.bankPayout !== 0
  ) {
    fail(
      "관광객 비소유 부동산 정산 정보가 올바르지 않습니다.",
    );
  }
}

export function validateTouristTurnConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleTouristTurnConfirmedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  if (
    !isNonEmptyString(
      payload.touristTurnId,
    ) ||
    !isFestivalId(
      payload.festivalId,
    )
  ) {
    fail(
      "관광객 턴 확인 정보가 올바르지 않습니다.",
    );
  }

  const resolvedEvent =
    game.gameEvents.find(
      (event) =>
        event.kind ===
          "TOURIST_TURN_RESOLVED" &&
        event.payload.touristTurnId ===
          payload.touristTurnId,
    );

  if (
    !resolvedEvent ||
    resolvedEvent.kind !==
      "TOURIST_TURN_RESOLVED" ||
    resolvedEvent.payload
      .festivalId !==
      payload.festivalId ||
    resolvedEvent.payload
      .controllerPlayerId !==
      payload.controllerPlayerId ||
    resolvedEvent.payload
      .turnSequence !==
      payload.turnSequence
  ) {
    fail(
      "확인할 관광객 턴 결과가 존재하지 않습니다.",
    );
  }

  if (
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "TOURIST_TURN_CONFIRMED" &&
        event.payload.touristTurnId ===
          payload.touristTurnId,
    )
  ) {
    fail(
      "이미 확인된 관광객 턴입니다.",
    );
  }
}

export function validateFestivalDevEndedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleFestivalDevEndedPayload,
): void {
  validateControllerBase(
    game,
    playerId,
    payload,
  );

  if (
    !isNonEmptyString(
      payload.actionId,
    ) ||
    !isFestivalId(
      payload.festivalId,
    )
  ) {
    fail(
      "DEV 축제 종료 정보가 올바르지 않습니다.",
    );
  }

  if (
    game.phase !==
      "WAITING_FOR_ROLL"
  ) {
    fail(
      "DEV 축제 종료는 주사위 대기 단계에서만 가능합니다.",
    );
  }

  if (
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "FESTIVAL_DEV_ENDED" &&
        event.payload.actionId ===
          payload.actionId,
    )
  ) {
    fail(
      "이미 처리된 DEV 축제 종료 요청입니다.",
    );
  }
}