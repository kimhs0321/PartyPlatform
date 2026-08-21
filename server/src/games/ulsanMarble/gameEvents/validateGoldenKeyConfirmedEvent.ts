import type {
  UlsanMarbleGoldenKeyConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

export function validateGoldenKeyConfirmedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleGoldenKeyConfirmedPayload,
): void {
  if (payload.playerId !== playerId) {
    throw new Error("황금열쇠 확인 플레이어가 일치하지 않습니다.");
  }

  if (payload.turnSequence !== game.turnSequence) {
    throw new Error("황금열쇠 확인 턴이 현재 턴과 일치하지 않습니다.");
  }

  const appliedEvent = [...game.gameEvents]
    .reverse()
    .find(
      (event) =>
        event.kind === "GOLDEN_KEY_APPLIED" &&
        event.turnSequence === payload.turnSequence &&
        event.payload.playerId === payload.playerId &&
        event.payload.cardId === payload.cardId,
    );

  if (!appliedEvent) {
    throw new Error("확인할 황금열쇠 적용 결과가 없습니다.");
  }

  const alreadyConfirmed = game.gameEvents.some(
    (event) =>
      event.kind === "GOLDEN_KEY_CONFIRMED" &&
      event.turnSequence === payload.turnSequence &&
      event.payload.playerId === payload.playerId &&
      event.payload.cardId === payload.cardId,
  );

  if (alreadyConfirmed) {
    throw new Error("이미 확인된 황금열쇠 결과입니다.");
  }
}