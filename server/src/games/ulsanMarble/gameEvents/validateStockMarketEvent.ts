import type {
  UlsanMarbleStockMarketResolvedPayload,
  UlsanMarbleStockMarketSettlementConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const STOCK_DIVIDEND_INTERVAL_TURNS =
  5;

const MAX_STOCK_DIVIDEND_RATE =
  0.075;


function isScheduledStockDividendTurn(
  turnNumber: number,
): boolean {
  return (
    turnNumber > 0 &&
    turnNumber %
      STOCK_DIVIDEND_INTERVAL_TURNS ===
      0
  );
}

function validateStockMarketPublisher(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  turnSequence: number,
): void {
  if (
    game.controllerPlayerId !==
    playerId
  ) {
    throw new Error(
      "게임 진행 담당자만 주식 시세 정산을 진행할 수 있습니다.",
    );
  }

  if (
    game.turnSequence !==
    turnSequence
  ) {
    throw new Error(
      "주식 시세 정산의 턴 순서가 일치하지 않습니다.",
    );
  }
}

function validateResolutionId(
  resolutionId: string,
): void {
  if (
    typeof resolutionId !== "string" ||
    resolutionId.trim().length === 0 ||
    resolutionId.length > 160
  ) {
    throw new Error(
      "주식 시세 정산 식별자가 올바르지 않습니다.",
    );
  }
}


function validateDividendCredits(
  game: ClientUlsanMarbleGameState,
  payload:
    UlsanMarbleStockMarketResolvedPayload,
): void {
  if (
    !Array.isArray(
      payload.dividendCredits,
    )
  ) {
    throw new Error(
      "주식 배당금 정산 결과가 올바르지 않습니다.",
    );
  }

  if (
    payload.mode === "DEV"
  ) {
    if (
      payload.dividendCredits.length > 0
    ) {
      throw new Error(
        "DEV 주식 정산에는 배당금이 포함될 수 없습니다.",
      );
    }

    return;
  }

  if (
    !isScheduledStockDividendTurn(
      payload.turnNumber,
    )
  ) {
    if (
      payload.dividendCredits.length > 0
    ) {
      throw new Error(
        "배당 정산 턴이 아닌데 배당금이 포함되어 있습니다.",
      );
    }

    return;
  }

  const creditKeys =
    new Set<string>();

  for (
    const credit of
    payload.dividendCredits
  ) {
    if (
      typeof credit.playerId !==
        "string" ||
      !game.playerIds.includes(
        credit.playerId,
      )
    ) {
      throw new Error(
        "주식 배당금 수령 플레이어가 올바르지 않습니다.",
      );
    }

    if (
      typeof credit.companyId !==
        "string" ||
      credit.companyId.trim().length ===
        0 ||
      typeof credit.companyName !==
        "string" ||
      credit.companyName.trim().length ===
        0 ||
      credit.companyName.length > 100 ||
      typeof credit.ticker !==
        "string" ||
      credit.ticker.trim().length === 0
    ) {
      throw new Error(
        "주식 배당금 종목 정보가 올바르지 않습니다.",
      );
    }

    if (
      !Number.isInteger(
        credit.quantity,
      ) ||
      credit.quantity <= 0
    ) {
      throw new Error(
        "주식 배당금 보유 수량이 올바르지 않습니다.",
      );
    }

    if (
      !Number.isInteger(
        credit.pricePerShare,
      ) ||
      credit.pricePerShare <= 0
    ) {
      throw new Error(
        "주식 배당금 기준 주가가 올바르지 않습니다.",
      );
    }

    if (
      !Number.isFinite(
        credit.dividendRate,
      ) ||
      credit.dividendRate <= 0 ||
      credit.dividendRate >
        MAX_STOCK_DIVIDEND_RATE
    ) {
      throw new Error(
        "주식 배당률이 올바르지 않습니다.",
      );
    }

    const quote =
      payload.nextMarket[
        credit.companyId
      ];

    if (
      !quote ||
      quote.companyId !==
        credit.companyId ||
      !Number.isInteger(
        quote.currentPrice,
      ) ||
      quote.currentPrice <= 0 ||
      quote.currentPrice !==
        credit.pricePerShare
    ) {
      throw new Error(
        "주식 배당금 기준 주가가 정산 주가와 일치하지 않습니다.",
      );
    }

    const expectedAmount =
      Math.round(
        credit.quantity *
          credit.pricePerShare *
          credit.dividendRate,
      );

    if (
      !Number.isInteger(
        credit.amount,
      ) ||
      credit.amount <= 0 ||
      credit.amount !==
        expectedAmount
    ) {
      throw new Error(
        "주식 배당금 계산 결과가 일치하지 않습니다.",
      );
    }

    const creditKey =
      `${credit.playerId}:${credit.companyId}`;

    if (
      creditKeys.has(
        creditKey,
      )
    ) {
      throw new Error(
        "동일한 플레이어와 회사의 배당금이 중복되어 있습니다.",
      );
    }

    creditKeys.add(
      creditKey,
    );
  }
}

export function validateStockMarketResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleStockMarketResolvedPayload,
): void {
  validateStockMarketPublisher(
    game,
    playerId,
    payload.turnSequence,
  );

  validateResolutionId(
    payload.resolutionId,
  );

  if (
    payload.mode !== "SCHEDULED" &&
    payload.mode !== "DEV"
  ) {
    throw new Error(
      "주식 시세 정산 모드가 올바르지 않습니다.",
    );
  }

  /*
   * 정기 정산은 서버가 다음 라운드로 먼저 넘어간 뒤
   * 직전 라운드의 시세를 정산한다.
   *
   * DEV 정산은 현재 서버 턴에서 바로 실행한다.
   */
  const expectedTurnNumber =
    payload.mode === "SCHEDULED"
      ? game.turnNumber - 1
      : game.turnNumber;

  if (
    payload.turnNumber !==
    expectedTurnNumber
  ) {
    throw new Error(
      "주식 시세 정산의 턴 번호가 일치하지 않습니다.",
    );
  }

  if (
    !payload.nextMarket ||
    typeof payload.nextMarket !==
      "object" ||
    Array.isArray(payload.nextMarket)
  ) {
    throw new Error(
      "주식 시세 변동 결과가 올바르지 않습니다.",
    );
  }

  if (
    !payload.cycle ||
    !Array.isArray(
      payload.cycle.industryTrends,
    ) ||
    !Array.isArray(
      payload.cycle.movers,
    ) ||
    !Array.isArray(
      payload.cycle.topGainers,
    ) ||
    !Array.isArray(
      payload.cycle.topLosers,
    )
  ) {
    throw new Error(
      "주식 시세 변동 내역이 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      payload.protectionCredits,
    )
  ) {
    throw new Error(
      "주식 손실보전 결과가 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(
      payload.dividendCredits,
    )
  ) {
    throw new Error(
      "주식 배당금 결과가 올바르지 않습니다.",
    );
  }

  if (
    !payload.nextStockLossIndustryByPlayer ||
    typeof payload
      .nextStockLossIndustryByPlayer !==
      "object" ||
    Array.isArray(
      payload.nextStockLossIndustryByPlayer,
    )
  ) {
    throw new Error(
      "주식 손실보전 상태가 올바르지 않습니다.",
    );
  }

  validateDividendCredits(
    game,
    payload,
  );

  const alreadyPublished =
    game.gameEvents.some((event) => {
      if (
        event.kind !==
        "STOCK_MARKET_RESOLVED"
      ) {
        return false;
      }

      return (
        event.payload.resolutionId ===
        payload.resolutionId
      );
    });

  if (alreadyPublished) {
    throw new Error(
      "이미 처리된 주식 시세 정산입니다.",
    );
  }
}

export function validateStockMarketSettlementConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleStockMarketSettlementConfirmedPayload,
): void {
  validateStockMarketPublisher(
    game,
    playerId,
    payload.turnSequence,
  );

  validateResolutionId(
    payload.resolutionId,
  );

  const matchingResolution =
    [...game.gameEvents]
      .reverse()
      .find((event) => {
        if (
          event.kind !==
          "STOCK_MARKET_RESOLVED"
        ) {
          return false;
        }

        return (
          event.payload.resolutionId ===
            payload.resolutionId &&
          event.payload.turnNumber ===
            payload.turnNumber &&
          event.payload.turnSequence ===
            payload.turnSequence
        );
      });

  if (!matchingResolution) {
    throw new Error(
      "확인할 주식 시세 변동 결과가 존재하지 않습니다.",
    );
  }

  const alreadyConfirmed =
    game.gameEvents.some((event) => {
      if (
        event.kind !==
        "STOCK_MARKET_SETTLEMENT_CONFIRMED"
      ) {
        return false;
      }

      return (
        event.payload.resolutionId ===
        payload.resolutionId
      );
    });

  if (alreadyConfirmed) {
    throw new Error(
      "이미 확인된 주식 시세 정산입니다.",
    );
  }
}