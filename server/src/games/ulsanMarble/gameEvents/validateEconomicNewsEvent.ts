import type {
  UlsanMarbleEconomicNewsAppliedPayload,
  UlsanMarbleEconomicNewsConfirmedPayload,
  UlsanMarbleEconomicNewsDrawDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type { ClientUlsanMarbleGameState } from "../types/ulsanMarbleGame";

function validateBase(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: {
    resolutionId: string;
    controllerPlayerId: string;
    turnNumber: number;
    turnSequence: number;
  },
): void {
  if (game.activePlayerId !== playerId || payload.controllerPlayerId !== playerId) {
    throw new Error("현재 플레이어만 경제뉴스를 진행할 수 있습니다.");
  }

  if (game.turnSequence !== payload.turnSequence) {
    throw new Error("경제뉴스의 턴 순서가 일치하지 않습니다.");
  }

  if (!payload.resolutionId.trim() || payload.resolutionId.length > 160) {
    throw new Error("경제뉴스 식별자가 올바르지 않습니다.");
  }
}

function validateTurnNumber(
  game: ClientUlsanMarbleGameState,
  source: "NEWSPAPER" | "RANDOM" | "DEV",
  turnNumber: number,
): void {
  const expected = source === "RANDOM" ? game.turnNumber - 1 : game.turnNumber;

  if (turnNumber !== expected) {
    throw new Error("경제뉴스의 턴 번호가 일치하지 않습니다.");
  }
}

export function validateEconomicNewsDrawDecidedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleEconomicNewsDrawDecidedPayload,
): void {
  validateBase(game, playerId, payload);
  validateTurnNumber(game, payload.source, payload.turnNumber);

  if (payload.outcome === "DRAWN" && !payload.articleId.trim()) {
    throw new Error("경제뉴스 기사 정보가 올바르지 않습니다.");
  }

  const duplicate = game.gameEvents.some(
    (event) =>
      event.kind === "ECONOMIC_NEWS_DRAW_DECIDED" &&
      event.payload.resolutionId === payload.resolutionId,
  );

  if (duplicate) throw new Error("이미 결정된 경제뉴스입니다.");
}

export function validateEconomicNewsAppliedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleEconomicNewsAppliedPayload,
): void {
  validateBase(game, playerId, payload);
  validateTurnNumber(game, payload.source, payload.turnNumber);

  const draw = [...game.gameEvents].reverse().find(
    (event) =>
      event.kind === "ECONOMIC_NEWS_DRAW_DECIDED" &&
      event.payload.outcome === "DRAWN" &&
      event.payload.resolutionId === payload.resolutionId &&
      event.payload.articleId === payload.articleId,
  );

  if (!draw) throw new Error("적용할 경제뉴스 추첨 결과가 없습니다.");
}

export function validateEconomicNewsConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleEconomicNewsConfirmedPayload,
): void {
  validateBase(game, playerId, payload);
  validateTurnNumber(game, payload.source, payload.turnNumber);

  const applied = game.gameEvents.some(
    (event) =>
      event.kind === "ECONOMIC_NEWS_APPLIED" &&
      event.payload.resolutionId === payload.resolutionId,
  );

  if (!applied) throw new Error("확인할 경제뉴스 결과가 없습니다.");

  const confirmed = game.gameEvents.some(
    (event) =>
      event.kind === "ECONOMIC_NEWS_CONFIRMED" &&
      event.payload.resolutionId === payload.resolutionId,
  );

  if (confirmed) throw new Error("이미 확인된 경제뉴스입니다.");
}