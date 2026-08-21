import type {
  UlsanMarblePropertyDevelopmentDecidedPayload,
  UlsanMarblePropertyDevelopmentStage,
} from "../../../../../shared/ulsanMarbleProtocol";

function isValidId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 100
  );
}

function isStage(
  value: unknown,
): value is UlsanMarblePropertyDevelopmentStage {
  return (
    value === "LAND" ||
    value === "DEVELOPED" ||
    value === "BUILDING" ||
    value === "LANDMARK"
  );
}

function getExpectedNextStage(
  currentStage:
    UlsanMarblePropertyDevelopmentStage,
): UlsanMarblePropertyDevelopmentStage | null {
  switch (currentStage) {
    case "LAND":
      return "DEVELOPED";

    case "DEVELOPED":
      return "BUILDING";

    case "BUILDING":
      return "LANDMARK";

    case "LANDMARK":
      return null;
  }
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

export function validatePropertyDevelopmentDecidedEvent(
  playerId: string,
  payload:
    UlsanMarblePropertyDevelopmentDecidedPayload,
): void {
  if (
    !isValidId(payload.playerId) ||
    payload.playerId !== playerId
  ) {
    throw new Error(
      "자신의 부동산 개발만 결정할 수 있습니다.",
    );
  }

  if (!isValidId(payload.propertyId)) {
    throw new Error(
      "개발할 부동산 정보가 올바르지 않습니다.",
    );
  }

  if (!isStage(payload.currentStage)) {
    throw new Error(
      "현재 개발 단계가 올바르지 않습니다.",
    );
  }

  if (payload.action === "DECLINE") {
    return;
  }

  if (payload.action !== "BUILD") {
    throw new Error(
      "부동산 개발 결정이 올바르지 않습니다.",
    );
  }

  if (!isStage(payload.nextStage)) {
    throw new Error(
      "다음 개발 단계가 올바르지 않습니다.",
    );
  }

  const expectedNextStage =
    getExpectedNextStage(
      payload.currentStage,
    );

  if (
    expectedNextStage === null ||
    payload.nextStage !==
      expectedNextStage
  ) {
    throw new Error(
      "부동산 개발 단계 전환이 올바르지 않습니다.",
    );
  }

  if (
    !isPositiveSafeInteger(
      payload.constructionCost,
    )
  ) {
    throw new Error(
      "부동산 개발 비용이 올바르지 않습니다.",
    );
  }

  if (
    !isNonNegativeSafeInteger(
      payload.currentConstructionInvestment,
    ) ||
    !isNonNegativeSafeInteger(
      payload.nextConstructionInvestment,
    )
  ) {
    throw new Error(
      "부동산 누적 개발비가 올바르지 않습니다.",
    );
  }

  if (
    payload.nextConstructionInvestment !==
    payload.currentConstructionInvestment +
      payload.constructionCost
  ) {
    throw new Error(
      "부동산 개발비 합계가 일치하지 않습니다.",
    );
  }

  if (
    !isPositiveSafeInteger(
      payload.developedTurn,
    )
  ) {
    throw new Error(
      "부동산 개발 턴이 올바르지 않습니다.",
    );
  }

  if (
    typeof payload.usedConstructionSupportItem !==
      "boolean" ||
    typeof payload.usedCityHallDevelopmentSupport !==
      "boolean"
  ) {
    throw new Error(
      "부동산 개발 지원 사용 정보가 올바르지 않습니다.",
    );
  }
}