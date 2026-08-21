import type {
  UlsanMarbleGoldenKeyDrawnPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const MAX_DECK_CARD_COUNT = 200;

function isValidId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 100
  );
}

function validateCardIdList(
  value: unknown,
  errorMessage: string,
): void {
  if (
    !Array.isArray(value) ||
    value.length > MAX_DECK_CARD_COUNT ||
    value.some(
      (cardId) => !isValidId(cardId),
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(errorMessage);
  }
}

export function validateGoldenKeyDrawnEvent(
  _game: ClientUlsanMarbleGameState,
  playerId: string,
  payload: UlsanMarbleGoldenKeyDrawnPayload,
): void {
  if (
    !isValidId(payload.playerId) ||
    payload.playerId !== playerId
  ) {
    throw new Error(
      "자신의 황금열쇠 카드만 뽑을 수 있습니다.",
    );
  }

  if (!isValidId(payload.cardId)) {
    throw new Error(
      "황금열쇠 카드 ID가 올바르지 않습니다.",
    );
  }

  if (
    !payload.deck ||
    typeof payload.deck !== "object"
  ) {
    throw new Error(
      "황금열쇠 덱 정보가 올바르지 않습니다.",
    );
  }

  validateCardIdList(
    payload.deck.selectedCardIds,
    "황금열쇠 선택 카드 목록이 올바르지 않습니다.",
  );

  validateCardIdList(
    payload.deck.drawPile,
    "황금열쇠 뽑기 더미가 올바르지 않습니다.",
  );

  validateCardIdList(
    payload.deck.discardPile,
    "황금열쇠 버림 더미가 올바르지 않습니다.",
  );

  if (
    !Number.isSafeInteger(payload.deck.cycle) ||
    payload.deck.cycle < 0
  ) {
    throw new Error(
      "황금열쇠 덱 순환 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.deck.lastDrawnCardId !== null &&
    !isValidId(
      payload.deck.lastDrawnCardId,
    )
  ) {
    throw new Error(
      "마지막 황금열쇠 카드 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.deck.lastDrawnCardId !==
    payload.cardId
  ) {
    throw new Error(
      "뽑은 황금열쇠 카드와 덱 정보가 일치하지 않습니다.",
    );
  }
}