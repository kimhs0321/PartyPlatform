import type {
  UlsanMarbleCompanyDividendEventResolvedPayload,
  UlsanMarbleCompanyDividendEventType,
  UlsanMarbleGameEvent,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";


const COMPANY_DIVIDEND_EVENT_MIN_TURN =
  4;

const COMPANY_DIVIDEND_COMPANY_COOLDOWN_TURNS =
  5;

const MACRO_STOCK_MARKET_BIAS_LIMIT =
  0.015;


const EVENT_TYPES =
  new Set<UlsanMarbleCompanyDividendEventType>([
    "DIVIDEND_UP",
    "DIVIDEND_DOWN",
    "SPECIAL_DIVIDEND",
    "DIVIDEND_SUSPENDED",
  ]);

type CompanyDividendResolvedEvent =
  Extract<
    UlsanMarbleGameEvent,
    {
      kind:
        "COMPANY_DIVIDEND_EVENT_RESOLVED";
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

function isCompanyDividendResolvedEvent(
  event: UlsanMarbleGameEvent,
): event is CompanyDividendResolvedEvent {
  return (
    event.kind ===
    "COMPANY_DIVIDEND_EVENT_RESOLVED"
  );
}

function validateController(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  if (
    game.controllerPlayerId !==
    playerId
  ) {
    fail(
      "게임 진행 담당자만 회사 배당 이벤트를 진행할 수 있습니다.",
    );
  }

  if (
    payload.controllerPlayerId !==
    playerId
  ) {
    fail(
      "회사 배당 이벤트 제어 플레이어가 발행자와 일치하지 않습니다.",
    );
  }

  if (
    !game.playerIds.includes(
      payload.controllerPlayerId,
    )
  ) {
    fail(
      "회사 배당 이벤트 제어 플레이어가 존재하지 않습니다.",
    );
  }
}


function validateTurn(
  game: ClientUlsanMarbleGameState,
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    fail(
      "회사 배당 이벤트의 턴 순번이 일치하지 않습니다.",
    );
  }

  /*
   * 글로벌 정산은 서버가 이미
   * 다음 턴 N+1로 넘어간 상태에서
   * 완료 턴 N을 처리한다.
   */
  const expectedTurnNumber =
    game.turnNumber - 1;

  if (
    payload.turnNumber !==
    expectedTurnNumber
  ) {
    fail(
      "회사 배당 이벤트의 턴 번호가 일치하지 않습니다.",
    );
  }

  if (
    payload.turnNumber <
    COMPANY_DIVIDEND_EVENT_MIN_TURN
  ) {
    fail(
      "회사 배당 이벤트가 발생할 수 없는 턴입니다.",
    );
  }
}


function validateResolutionId(
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  const expectedResolutionId =
    [
      "COMPANY_DIVIDEND",
      payload.turnSequence,
      payload.turnNumber,
    ].join(":");

  if (
    payload.resolutionId !==
    expectedResolutionId
  ) {
    fail(
      "회사 배당 이벤트 식별자가 올바르지 않습니다.",
    );
  }
}


function validateEvent(
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  const event =
    payload.event;

  if (
    !event ||
    typeof event !== "object"
  ) {
    fail(
      "회사 배당 이벤트 정보가 올바르지 않습니다.",
    );
  }

  if (
    event.turnNumber !==
    payload.turnNumber
  ) {
    fail(
      "회사 배당 이벤트의 발생 턴이 일치하지 않습니다.",
    );
  }

  if (
    !isNonEmptyString(
      event.companyId,
    ) ||
    !isNonEmptyString(
      event.companyName,
    ) ||
    !isNonEmptyString(
      event.ticker,
    )
  ) {
    fail(
      "회사 배당 이벤트의 회사 정보가 올바르지 않습니다.",
    );
  }

  if (
    event.companyId.length > 100 ||
    event.companyName.length > 100 ||
    event.ticker.length > 30
  ) {
    fail(
      "회사 배당 이벤트의 회사 정보가 너무 깁니다.",
    );
  }

  if (
    !EVENT_TYPES.has(
      event.type,
    )
  ) {
    fail(
      "회사 배당 이벤트 종류가 올바르지 않습니다.",
    );
  }

  if (
    !isNonEmptyString(
      event.headline,
    ) ||
    !isNonEmptyString(
      event.summary,
    ) ||
    event.headline.length > 240 ||
    event.summary.length > 400
  ) {
    fail(
      "회사 배당 이벤트 뉴스 내용이 올바르지 않습니다.",
    );
  }

  const expectedEventId =
    [
      "COMPANY_DIVIDEND",
      payload.turnNumber,
      event.companyId,
      event.type,
    ].join(":");

  if (
    event.eventId !==
    expectedEventId
  ) {
    fail(
      "회사 배당 이벤트 ID가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isFinite(
      event.persistentRateDelta,
    ) ||
    !Number.isFinite(
      event.specialDividendRate,
    )
  ) {
    fail(
      "회사 배당률 변동값이 올바르지 않습니다.",
    );
  }

  switch (event.type) {
    case "DIVIDEND_UP":
      if (
        event.persistentRateDelta !==
          0.005 ||
        event.specialDividendRate !==
          0
      ) {
        fail(
          "증배 이벤트의 배당률 변동값이 올바르지 않습니다.",
        );
      }
      break;


    case "DIVIDEND_DOWN":
      if (
        event.persistentRateDelta !==
          -0.005 ||
        event.specialDividendRate !==
          0
      ) {
        fail(
          "감배 이벤트의 배당률 변동값이 올바르지 않습니다.",
        );
      }
      break;


    case "SPECIAL_DIVIDEND":
      if (
        event.persistentRateDelta !==
          0 ||
        event.specialDividendRate !==
          0.015
      ) {
        fail(
          "특별배당 이벤트의 배당률 변동값이 올바르지 않습니다.",
        );
      }
      break;


    case "DIVIDEND_SUSPENDED":
      if (
        event.persistentRateDelta !==
          0 ||
        event.specialDividendRate !==
          0
      ) {
        fail(
          "무배당 이벤트의 배당률 변동값이 올바르지 않습니다.",
        );
      }
      break;
  }
}


function validateMacroBias(
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  if (
    !Number.isFinite(
      payload.macroStockMarketBias,
    ) ||
    Math.abs(
      payload.macroStockMarketBias,
    ) >
      MACRO_STOCK_MARKET_BIAS_LIMIT
  ) {
    fail(
      "회사 배당 이벤트의 경기 주식시장 보정값이 올바르지 않습니다.",
    );
  }
}


function validateDisabledPlayerIds(
  game: ClientUlsanMarbleGameState,
  playerIds: string[],
): void {
  if (
    !Array.isArray(
      playerIds,
    )
  ) {
    fail(
      "회사 배당 이벤트의 정산 제외 플레이어 정보가 올바르지 않습니다.",
    );
  }

  const uniqueIds =
    new Set(
      playerIds,
    );

  if (
    uniqueIds.size !==
    playerIds.length
  ) {
    fail(
      "회사 배당 이벤트의 정산 제외 플레이어가 중복되어 있습니다.",
    );
  }

  for (
    const playerId of
    playerIds
  ) {
    if (
      !game.playerIds.includes(
        playerId,
      )
    ) {
      fail(
        "회사 배당 이벤트의 정산 제외 플레이어가 존재하지 않습니다.",
      );
    }
  }
}


function validateDuplicateAndCooldown(
  game: ClientUlsanMarbleGameState,
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  const duplicate =
    game.gameEvents.some(
      (event) =>
        isCompanyDividendResolvedEvent(
          event,
        ) &&
        event.payload.resolutionId ===
          payload.resolutionId,
    );

  if (duplicate) {
    fail(
      "이미 처리된 회사 배당 이벤트입니다.",
    );
  }

  const previousCompanyEvent =
    [...game.gameEvents]
      .reverse()
      .find(
        (
          event,
        ): event is CompanyDividendResolvedEvent =>
          isCompanyDividendResolvedEvent(
            event,
          ) &&
          event.payload.event
            .companyId ===
            payload.event.companyId,
      );

  if (
    previousCompanyEvent &&
    payload.turnNumber -
      previousCompanyEvent.payload
        .turnNumber <=
      COMPANY_DIVIDEND_COMPANY_COOLDOWN_TURNS
  ) {
    fail(
      "해당 회사는 배당 이벤트 쿨다운 중입니다.",
    );
  }
}

export function validateCompanyDividendEventResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleCompanyDividendEventResolvedPayload,
): void {
  validateController(
    game,
    playerId,
    payload,
  );

  validateTurn(
    game,
    payload,
  );

  validateResolutionId(
    payload,
  );

  validateEvent(
    payload,
  );

  validateMacroBias(
    payload,
  );

  validateDisabledPlayerIds(
    game,
    payload
      .additionallyDisabledPlayerIds,
  );

  validateDuplicateAndCooldown(
    game,
    payload,
  );
}