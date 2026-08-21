import type {
  UlsanMarbleJailEntryConfirmedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

function validateIdentifier(
  value: string,
  label: string,
): void {
  if (
    typeof value !== "string" ||
    value.length <= 0 ||
    value.length > 180
  ) {
    throw new Error(
      `${label}이 올바르지 않습니다.`,
    );
  }
}

export function validateJailEntryConfirmedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleJailEntryConfirmedPayload,
): void {
  if (
    payload.playerId !==
    playerId
  ) {
    throw new Error(
      "다른 플레이어의 구치소 입소를 확인할 수 없습니다.",
    );
  }

  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 플레이어만 구치소 입소를 확인할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "구치소 입소의 턴 정보가 일치하지 않습니다.",
    );
  }

  validateIdentifier(
    payload.entryId,
    "구치소 입소 ID",
  );
}