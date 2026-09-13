import type {
  UlsanMarbleMiniGameActionDecidedPayload,
  UlsanMarbleMiniGameSnapshotPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const BET_OPTIONS = [
  100,
  200,
  300,
] as const;

function fail(
  message: string,
): never {
  throw new Error(message);
}

function isDiceFace(
  value: number,
): boolean {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 6
  );
}

function validatePlayerId(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,
): void {
  if (
    !game.playerIds.includes(
      playerId,
    )
  ) {
    fail(
      "미니게임 플레이어 정보가 올바르지 않습니다.",
    );
  }
}

function getCurrentPlayerId(
  game:
    UlsanMarbleMiniGameSnapshotPayload,
): string | null {
  if (
    game.stage !==
    "PLAYING"
  ) {
    return null;
  }

  const ids =
    game.gameId ===
      "TIMING_STOP" ||
    game.gameId ===
      "TARGET_DICE"
      ? game.roundPlayerIds
      : game.eligiblePlayerIds;

  return (
    ids[
      game.currentPlayerIndex
    ] ?? null
  );
}

function validateSnapshot(
  gameState:
    ClientUlsanMarbleGameState,

  game:
    UlsanMarbleMiniGameSnapshotPayload,
): void {
  validatePlayerId(
    gameState,
    game.arrivalPlayerId,
  );

  if (
    !Number.isInteger(
      game.currentPlayerIndex,
    ) ||
    game.currentPlayerIndex < 0 ||
    !Number.isInteger(
      game.round,
    ) ||
    game.round < 1
  ) {
    fail(
      "미니게임 진행 정보가 올바르지 않습니다.",
    );
  }

  const uniquePlayers =
    new Set(
      game.eligiblePlayerIds,
    );

  if (
    uniquePlayers.size !==
    game.eligiblePlayerIds.length
  ) {
    fail(
      "미니게임 참가자가 중복되었습니다.",
    );
  }

  for (
    const playerId of
    game.eligiblePlayerIds
  ) {
    validatePlayerId(
      gameState,
      playerId,
    );
  }

  if (game.deadlineAt !== null) {
    fail(
      "제한시간이 없는 미니게임에 제한시간 정보가 포함되어 있습니다.",
    );
  }

  if (
    game.gameId ===
    "TARGET_DICE"
  ) {
    if (
      game.targetNumber < 2 ||
      game.targetNumber > 12
    ) {
      fail(
        "목표 숫자가 올바르지 않습니다.",
      );
    }

    for (
      const attempt of
      game.attempts
    ) {
      if (
        !isDiceFace(
          attempt.diceValues[0],
        ) ||
        !isDiceFace(
          attempt.diceValues[1],
        )
      ) {
        fail(
          "미니게임 주사위 값이 올바르지 않습니다.",
        );
      }
    }
  }

  if (
    game.gameId ===
      "ODD_EVEN" &&
    game.diceValues
  ) {
    if (
      !isDiceFace(
        game.diceValues[0],
      ) ||
      !isDiceFace(
        game.diceValues[1],
      )
    ) {
      fail(
        "홀짝 주사위 값이 올바르지 않습니다.",
      );
    }
  }

  if (
    game.gameId ===
    "HIGH_LOW"
  ) {
    if (
      game.firstNumber < 4 ||
      game.firstNumber > 6
    ) {
      fail(
        "하이로우 기준 숫자가 올바르지 않습니다.",
      );
    }

    if (
      game.secondNumber !==
        null &&
      (
        game.secondNumber < 1 ||
        game.secondNumber > 9
      )
    ) {
      fail(
        "하이로우 결과 숫자가 올바르지 않습니다.",
      );
    }
  }
}

function findLatestMiniGame(
  game:
    ClientUlsanMarbleGameState,

  miniGameId: string,
):
  | UlsanMarbleMiniGameSnapshotPayload
  | null {
  for (
    let index =
      game.gameEvents.length - 1;

    index >= 0;

    index -= 1
  ) {
    const event =
      game.gameEvents[index];

    if (
      event.kind !==
        "MINI_GAME_ACTION_DECIDED" ||
      event.payload.miniGameId !==
        miniGameId
    ) {
      continue;
    }

    if (
      event.payload.action ===
      "CLOSE"
    ) {
      return null;
    }

    return event.payload.game;
  }

  return null;
}

function validateSameGame(
  previous:
    UlsanMarbleMiniGameSnapshotPayload,

  next:
    UlsanMarbleMiniGameSnapshotPayload,
): void {
  if (
    previous.gameId !==
      next.gameId ||
    previous.arrivalPlayerId !==
      next.arrivalPlayerId ||
    previous.eligiblePlayerIds
      .length !==
      next.eligiblePlayerIds
        .length ||
    previous.eligiblePlayerIds.some(
      (id, index) =>
        id !==
        next.eligiblePlayerIds[
          index
        ],
    )
  ) {
    fail(
      "진행 중 미니게임 정보가 변경되었습니다.",
    );
  }
}

export function validateMiniGameActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleMiniGameActionDecidedPayload,
): void {
  if (
    payload.turnNumber !==
      game.turnNumber ||
    payload.turnSequence !==
      game.turnSequence
  ) {
    fail(
      "현재 턴과 미니게임 정보가 일치하지 않습니다.",
    );
  }

  if (
    !payload.actionId ||
    !payload.miniGameId
  ) {
    fail(
      "미니게임 이벤트 ID가 올바르지 않습니다.",
    );
  }

  validatePlayerId(
    game,
    playerId,
  );

  const duplicated =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "MINI_GAME_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicated) {
    fail(
      "이미 처리된 미니게임 행동입니다.",
    );
  }

  if (
    payload.action ===
    "START"
  ) {
    if (
      game.activePlayerId !==
        playerId ||
      payload.game
        .arrivalPlayerId !==
        playerId
    ) {
      fail(
        "현재 플레이어만 미니게임을 시작할 수 있습니다.",
      );
    }

    validateSnapshot(
      game,
      payload.game,
    );

    if (
      !Number.isInteger(
        payload.nextDeck.cycle,
      ) ||
      payload.nextDeck.cycle < 1
    ) {
      fail(
        "미니게임 덱 정보가 올바르지 않습니다.",
      );
    }

    return;
  }

  const previous =
    findLatestMiniGame(
      game,
      payload.miniGameId,
    );

  if (!previous) {
    fail(
      "진행 중인 미니게임을 찾을 수 없습니다.",
    );
  }

  if (
    payload.action ===
    "CLOSE"
  ) {
    if (
      previous.stage !==
        "RESULT" ||
      previous.arrivalPlayerId !==
        playerId ||
      payload.playerId !==
        playerId
    ) {
      fail(
        "미니게임 도착 플레이어만 결과를 종료할 수 있습니다.",
      );
    }

    return;
  }

  const currentPlayerId =
    getCurrentPlayerId(
      previous,
    );

  if (
    currentPlayerId !==
      playerId ||
    payload.playerId !==
      playerId
  ) {
    fail(
      "현재 미니게임 참가자만 행동할 수 있습니다.",
    );
  }

  validateSnapshot(
    game,
    payload.game,
  );

  validateSameGame(
    previous,
    payload.game,
  );

  if (
    payload.action ===
    "TIMING_STOP"
  ) {
    if (
      previous.gameId !==
        "TIMING_STOP" ||
      !Number.isFinite(
        payload.distance,
      ) ||
      payload.distance < 0 ||
      payload.distance > 0.5 ||
      !Number.isInteger(
        payload.responseMs,
      ) ||
      payload.responseMs < 0
    ) {
      fail(
        "타이밍 스톱 결과가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "TARGET_DICE"
  ) {
    if (
      previous.gameId !==
        "TARGET_DICE" ||
      !isDiceFace(
        payload.diceValues[0],
      ) ||
      !isDiceFace(
        payload.diceValues[1],
      )
    ) {
      fail(
        "목표 숫자 주사위 결과가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
      "ODD_EVEN_BET"
  ) {
    if (
      previous.gameId !==
        "ODD_EVEN" ||
      (
        payload.choice !==
          "ODD" &&
        payload.choice !==
          "EVEN"
      ) ||
      !BET_OPTIONS.includes(
        payload.amount as
          (typeof BET_OPTIONS)[number],
      )
    ) {
      fail(
        "홀짝 배팅 정보가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
      "HIGH_LOW_BET"
  ) {
    if (
      previous.gameId !==
        "HIGH_LOW" ||
      (
        payload.choice !==
          "HIGH" &&
        payload.choice !==
          "LOW"
      ) ||
      !BET_OPTIONS.includes(
        payload.amount as
          (typeof BET_OPTIONS)[number],
      )
    ) {
      fail(
        "하이로우 배팅 정보가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    payload.action ===
    "PASS"
  ) {
    if (
      previous.gameId !==
        "ODD_EVEN" &&
      previous.gameId !==
        "HIGH_LOW"
    ) {
      fail(
        "현재 미니게임에서는 불참할 수 없습니다.",
      );
    }

    return;
  }

  fail(
    "지원하지 않는 미니게임 행동입니다.",
  );
}