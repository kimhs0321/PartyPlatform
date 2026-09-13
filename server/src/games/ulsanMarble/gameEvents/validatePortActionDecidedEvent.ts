import type {
  UlsanMarblePortActionDecidedPayload,
  UlsanMarblePortContractType,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const PORT_CONTRACT_DURATION_TURNS =
  3;

const PORT_INVESTMENTS: Record<
  UlsanMarblePortContractType,
  number
> = {
  COASTAL: 500,
  EAST_ASIA: 900,
  OCEAN: 1500,
};

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

function isPortContractType(
  value: unknown,
): value is UlsanMarblePortContractType {
  return (
    value === "COASTAL" ||
    value === "EAST_ASIA" ||
    value === "OCEAN"
  );
}

export function validatePortActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarblePortActionDecidedPayload,
): void {
  if (
    payload.playerId !==
    playerId
  ) {
    throw new Error(
      "다른 플레이어의 울산항 행동을 처리할 수 없습니다.",
    );
  }

  if (
    game.activePlayerId !==
    playerId
  ) {
    throw new Error(
      "현재 플레이어만 울산항을 이용할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "울산항 행동의 턴 정보가 일치하지 않습니다.",
    );
  }

  validateIdentifier(
    payload.visitId,
    "울산항 방문 ID",
  );

  if (
    payload.action === "CLOSE"
  ) {
    return;
  }

  const {
    contract,
  } = payload;

  validateIdentifier(
    contract.id,
    "항구 계약 ID",
  );

  if (
    contract.playerId !==
    playerId
  ) {
    throw new Error(
      "항구 계약 소유자가 올바르지 않습니다.",
    );
  }

  if (
    !isPortContractType(
      contract.type,
    )
  ) {
    throw new Error(
      "항구 계약 종류가 올바르지 않습니다.",
    );
  }

  if (
    !Number.isInteger(
      contract.purchasedTurn,
    ) ||
    contract.purchasedTurn !==
      game.turnNumber
  ) {
    throw new Error(
      "항구 계약 구매 턴이 올바르지 않습니다.",
    );
  }

  if (
    contract.settlesAfterTurn !==
    contract.purchasedTurn +
      PORT_CONTRACT_DURATION_TURNS
  ) {
    throw new Error(
      "항구 계약 정산 턴이 올바르지 않습니다.",
    );
  }

  if (
    contract.investmentAmount !==
    PORT_INVESTMENTS[
      contract.type
    ]
  ) {
    throw new Error(
      "항구 계약 투자금이 올바르지 않습니다.",
    );
  }
}