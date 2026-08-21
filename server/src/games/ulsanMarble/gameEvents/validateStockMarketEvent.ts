import type {
  UlsanMarbleStockMarketResolvedPayload,
  UlsanMarbleStockMarketSettlementConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

function validateStockMarketPublisher(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  turnSequence: number,
): void {
  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 플레이어만 주식 시세 정산을 진행할 수 있습니다.",
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