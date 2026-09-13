import type {
  UlsanMarbleLottoDrawConfirmedPayload,
  UlsanMarbleLottoDrawResolvedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type { ClientUlsanMarbleGameState } from "../types/ulsanMarbleGame";

function validatePublisher(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  turnSequence: number,
): void {
  if (
    game.controllerPlayerId !==
    playerId
  ) {
    throw new Error(
      "게임 진행 담당자만 로또 추첨을 진행할 수 있습니다.",
    );
  }

  if (
    game.turnSequence !==
    turnSequence
  ) {
    throw new Error(
      "로또 추첨의 턴 순서가 일치하지 않습니다.",
    );
  }
}

function validateDrawId(drawId: string): void {
  if (typeof drawId !== "string" || !drawId.trim() || drawId.length > 160) {
    throw new Error("로또 추첨 식별자가 올바르지 않습니다.");
  }
}

export function validateLottoDrawResolvedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleLottoDrawResolvedPayload,
): void {
  validatePublisher(game, playerId, payload.turnSequence);
  validateDrawId(payload.drawId);

  if (payload.mode !== "SCHEDULED" && payload.mode !== "DEV") {
    throw new Error("로또 추첨 모드가 올바르지 않습니다.");
  }

  const expectedTurnNumber =
    payload.mode === "SCHEDULED" ? game.turnNumber - 1 : game.turnNumber;

  if (payload.turnNumber !== expectedTurnNumber) {
    throw new Error("로또 추첨의 턴 번호가 일치하지 않습니다.");
  }

  if (!payload.result || !payload.nextState) {
    throw new Error("로또 추첨 결과가 올바르지 않습니다.");
  }

  if (
    payload.nextState.drawNumber !== payload.result.drawNumber + 1 ||
    payload.nextState.jackpot !== payload.result.jackpotAfter
  ) {
    throw new Error("로또 추첨 후 상태가 올바르지 않습니다.");
  }

  if (
    !Array.isArray(payload.result.winningNumbers) ||
    !Array.isArray(payload.result.ticketResults) ||
    !Array.isArray(payload.result.playerPrizes) ||
    !Array.isArray(payload.nextState.tickets) ||
    !Array.isArray(payload.additionallyDisabledPlayerIds)
  ) {
    throw new Error("로또 추첨 데이터가 올바르지 않습니다.");
  }

  const alreadyResolved = game.gameEvents.some(
    (event) =>
      event.kind === "LOTTO_DRAW_RESOLVED" &&
      event.payload.drawId === payload.drawId,
  );

  if (alreadyResolved) {
    throw new Error("이미 처리된 로또 추첨입니다.");
  }
}

export function validateLottoDrawConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleLottoDrawConfirmedPayload,
): void {
  validatePublisher(game, playerId, payload.turnSequence);
  validateDrawId(payload.drawId);

  const matchingResolution = [...game.gameEvents].reverse().find(
    (event) =>
      event.kind === "LOTTO_DRAW_RESOLVED" &&
      event.payload.drawId === payload.drawId &&
      event.payload.turnNumber === payload.turnNumber &&
      event.payload.turnSequence === payload.turnSequence,
  );

  if (!matchingResolution) {
    throw new Error("확인할 로또 추첨 결과가 존재하지 않습니다.");
  }

  const alreadyConfirmed = game.gameEvents.some(
    (event) =>
      event.kind === "LOTTO_DRAW_CONFIRMED" &&
      event.payload.drawId === payload.drawId,
  );

  if (alreadyConfirmed) {
    throw new Error("이미 확인된 로또 추첨입니다.");
  }
}