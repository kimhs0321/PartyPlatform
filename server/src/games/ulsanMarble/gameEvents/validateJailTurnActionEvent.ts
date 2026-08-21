import type {
  UlsanMarbleJailTurnActionDecidedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const MAX_JAIL_FAILED_ATTEMPTS = 3;

function isValidDiceFace(
  value: unknown,
): value is 1 | 2 | 3 | 4 | 5 | 6 {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 6
  );
}

export function validateJailTurnActionDecidedEvent(
  game: ClientUlsanMarbleGameState,
  playerId: string,
  payload:
    UlsanMarbleJailTurnActionDecidedPayload,
): void {
  if (game.activePlayerId !== playerId) {
    throw new Error(
      "현재 플레이어만 구치소 행동을 선택할 수 있습니다.",
    );
  }

  if (payload.playerId !== playerId) {
    throw new Error(
      "구치소 행동 플레이어 정보가 올바르지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "구치소 행동의 턴 정보가 현재 턴과 일치하지 않습니다.",
    );
  }

  if (game.phase !== "WAITING_FOR_ROLL") {
    throw new Error(
      "현재는 구치소 행동을 선택할 수 있는 단계가 아닙니다.",
    );
  }

  if (
    typeof payload.actionId !== "string" ||
    payload.actionId.trim().length === 0 ||
    payload.actionId.length > 160
  ) {
    throw new Error(
      "구치소 행동 ID가 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(payload.diceValues) ||
    payload.diceValues.length !== 2 ||
    !isValidDiceFace(
      payload.diceValues[0],
    ) ||
    !isValidDiceFace(
      payload.diceValues[1],
    )
  ) {
    throw new Error(
      "구치소 행동 주사위 값이 올바르지 않습니다.",
    );
  }

  const duplicatedAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "JAIL_TURN_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicatedAction) {
    throw new Error(
      "이미 처리된 구치소 행동입니다.",
    );
  }

  const alreadyDecidedThisTurn =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "JAIL_TURN_ACTION_DECIDED" &&
        event.payload.playerId ===
          payload.playerId &&
        event.payload.turnSequence ===
          payload.turnSequence,
    );

  if (alreadyDecidedThisTurn) {
    throw new Error(
      "이번 턴의 구치소 행동은 이미 선택되었습니다.",
    );
  }

  if (payload.action === "PAY_BAIL") {
    return;
  }

  if (
    payload.action ===
    "USE_ESCAPE_CARD"
  ) {
    if (
      !Number.isInteger(
        payload.escapeCardsBefore,
      ) ||
      payload.escapeCardsBefore <= 0
    ) {
      throw new Error(
        "구치소 탈출권 보유 수량이 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "TRY_DOUBLE"
  ) {
    if (
      !Number.isInteger(
        payload.failedAttemptsBefore,
      ) ||
      payload.failedAttemptsBefore < 0 ||
      payload.failedAttemptsBefore >=
        MAX_JAIL_FAILED_ATTEMPTS
    ) {
      throw new Error(
        "구치소 더블 도전 실패 횟수가 올바르지 않습니다.",
      );
    }

    return;
  }

  throw new Error(
    "지원하지 않는 구치소 행동입니다.",
  );
}