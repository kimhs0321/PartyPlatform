import type {
  UlsanMarbleGoldenKeyAppliedPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

const MAX_MONEY_OPERATIONS = 64;
const MAX_PLAYER_PATCHES = 16;
const MAX_MARKET_TARGETS = 100;
const MAX_RESULT_TEXT_LENGTH = 500;

function isValidId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 100
  );
}

function isNonNegativeSafeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isPositiveSafeInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function validateIdList(
  values: string[],
  maximumLength: number,
  errorMessage: string,
): void {
  if (
    !Array.isArray(values) ||
    values.length > maximumLength ||
    values.some((value) => !isValidId(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(errorMessage);
  }
}

export function validateGoldenKeyAppliedEvent(
  playerId: string,
  payload: UlsanMarbleGoldenKeyAppliedPayload,
): void {
  if (
    !isValidId(payload.playerId) ||
    payload.playerId !== playerId
  ) {
    throw new Error(
      "자신의 황금열쇠 효과만 적용할 수 있습니다.",
    );
  }

  if (!isValidId(payload.cardId)) {
    throw new Error(
      "황금열쇠 카드 정보가 올바르지 않습니다.",
    );
  }

  if (
    typeof payload.resultText !== "string" ||
    payload.resultText.length === 0 ||
    payload.resultText.length >
      MAX_RESULT_TEXT_LENGTH
  ) {
    throw new Error(
      "황금열쇠 결과 문구가 올바르지 않습니다.",
    );
  }

  if (
    payload.followUpPosition !== null &&
    !isNonNegativeSafeInteger(
      payload.followUpPosition,
    )
  ) {
    throw new Error(
      "황금열쇠 후속 이동 위치가 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(payload.moneyOperations) ||
    payload.moneyOperations.length >
      MAX_MONEY_OPERATIONS
  ) {
    throw new Error(
      "황금열쇠 금액 처리 목록이 올바르지 않습니다.",
    );
  }

  for (const operation of payload.moneyOperations) {
    switch (operation.kind) {
      case "DEPOSIT":
      case "WITHDRAW":
        if (
          !isValidId(operation.playerId) ||
          !isPositiveSafeInteger(operation.amount)
        ) {
          throw new Error(
            "황금열쇠 금액 처리 정보가 올바르지 않습니다.",
          );
        }
        break;

      case "TRANSFER":
        if (
          !isValidId(operation.fromPlayerId) ||
          !isValidId(operation.toPlayerId) ||
          operation.fromPlayerId ===
            operation.toPlayerId ||
          !isPositiveSafeInteger(operation.amount)
        ) {
          throw new Error(
            "황금열쇠 송금 정보가 올바르지 않습니다.",
          );
        }
        break;

      default:
        throw new Error(
          "지원하지 않는 황금열쇠 금액 처리입니다.",
        );
    }
  }

  if (
    !Array.isArray(payload.playerPatches) ||
    payload.playerPatches.length >
      MAX_PLAYER_PATCHES
  ) {
    throw new Error(
      "황금열쇠 플레이어 변경 목록이 올바르지 않습니다.",
    );
  }

  const patchedPlayerIds = new Set<string>();

  for (const patch of payload.playerPatches) {
    if (
      !isValidId(patch.playerId) ||
      patchedPlayerIds.has(patch.playerId)
    ) {
      throw new Error(
        "황금열쇠 플레이어 변경 정보가 중복되거나 올바르지 않습니다.",
      );
    }

    patchedPlayerIds.add(patch.playerId);

    const hasPosition =
      patch.position !== undefined;

    const hasJailEscapeCards =
      patch.jailEscapeCards !== undefined;

    if (
      !hasPosition &&
      !hasJailEscapeCards
    ) {
      throw new Error(
        "황금열쇠 플레이어 변경 내용이 없습니다.",
      );
    }

    if (
      hasPosition &&
      !isNonNegativeSafeInteger(patch.position)
    ) {
      throw new Error(
        "황금열쇠 이동 위치가 올바르지 않습니다.",
      );
    }

    if (
      hasJailEscapeCards &&
      !isNonNegativeSafeInteger(
        patch.jailEscapeCards,
      )
    ) {
      throw new Error(
        "황금열쇠 탈출권 수량이 올바르지 않습니다.",
      );
    }
  }

  validateIdList(
    payload.propertyMarketTargetIds,
    MAX_MARKET_TARGETS,
    "황금열쇠 부동산 대상 목록이 올바르지 않습니다.",
  );

  validateIdList(
    payload.stockMarketTargetIds,
    MAX_MARKET_TARGETS,
    "황금열쇠 주식 대상 목록이 올바르지 않습니다.",
  );
}