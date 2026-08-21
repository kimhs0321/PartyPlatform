import type {
  UlsanMarbleLotteryActionDecidedPayload,
  UlsanMarbleScratchPrizeTier,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "./../types/ulsanMarbleGame";

const MAX_SCRATCH_PURCHASES_PER_VISIT =
  5;

const MAX_LOTTO_PURCHASES_PER_VISIT =
  5;

const LOTTO_NUMBER_MIN = 1;
const LOTTO_NUMBER_MAX = 30;
const LOTTO_NUMBER_COUNT = 6;

const SCRATCH_RESULTS: Record<
  UlsanMarbleScratchPrizeTier,
  {
    label: string;
    prizeAmount: number;
  }
> = {
  MISS: {
    label: "꽝",
    prizeAmount: 0,
  },

  SMALL: {
    label: "소액 당첨",
    prizeAmount: 10,
  },

  REFUND: {
    label: "본전",
    prizeAmount: 20,
  },

  WIN: {
    label: "당첨",
    prizeAmount: 50,
  },

  BIG: {
    label: "고액 당첨",
    prizeAmount: 100,
  },

  JACKPOT: {
    label: "대박",
    prizeAmount: 500,
  },
};

function isScratchPrizeTier(
  value: unknown,
): value is UlsanMarbleScratchPrizeTier {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      SCRATCH_RESULTS,
      value,
    )
  );
}

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

function validateExpectedCount(
  count: number,
  maximum: number,
): void {
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count >= maximum
  ) {
    throw new Error(
      "복권 구매 횟수가 올바르지 않습니다.",
    );
  }
}

function validateLottoNumbers(
  numbers: number[],
): void {
  if (
    !Array.isArray(numbers) ||
    numbers.length !==
      LOTTO_NUMBER_COUNT
  ) {
    throw new Error(
      "로또 번호 개수가 올바르지 않습니다.",
    );
  }

  for (
    let index = 0;
    index < numbers.length;
    index += 1
  ) {
    const number =
      numbers[index];

    if (
      !Number.isInteger(number) ||
      number < LOTTO_NUMBER_MIN ||
      number > LOTTO_NUMBER_MAX
    ) {
      throw new Error(
        "로또 번호 범위가 올바르지 않습니다.",
      );
    }

    if (
      index > 0 &&
      numbers[index - 1] >= number
    ) {
      throw new Error(
        "로또 번호는 중복 없이 오름차순이어야 합니다.",
      );
    }
  }
}

export function validateLotteryActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleLotteryActionDecidedPayload,
): void {
  if (
    payload.playerId !== playerId
  ) {
    throw new Error(
      "다른 플레이어의 복권 행동을 처리할 수 없습니다.",
    );
  }

  if (
    game.activePlayerId !== playerId
  ) {
    throw new Error(
      "현재 플레이어만 복권판매소를 이용할 수 있습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    throw new Error(
      "복권 행동의 턴 정보가 일치하지 않습니다.",
    );
  }

  validateIdentifier(
    payload.visitId,
    "복권판매소 방문 ID",
  );

  switch (payload.action) {
    case "CLOSE":
      return;

    case "BUY_SCRATCH": {
      validateExpectedCount(
        payload.expectedPurchaseCount,
        MAX_SCRATCH_PURCHASES_PER_VISIT,
      );

      validateIdentifier(
        payload.result.id,
        "즉석복권 결과 ID",
      );

      if (
        !isScratchPrizeTier(
          payload.result.tier,
        )
      ) {
        throw new Error(
          "즉석복권 당첨 등급이 올바르지 않습니다.",
        );
      }

      const expectedResult =
        SCRATCH_RESULTS[
          payload.result.tier
        ];

      if (
        payload.result.label !==
          expectedResult.label ||
        payload.result.prizeAmount !==
          expectedResult.prizeAmount
      ) {
        throw new Error(
          "즉석복권 결과가 올바르지 않습니다.",
        );
      }

      return;
    }

    case "BUY_LOTTO": {
      validateExpectedCount(
        payload.expectedPurchaseCount,
        MAX_LOTTO_PURCHASES_PER_VISIT,
      );

      if (
        !Array.isArray(payload.tickets) ||
        payload.tickets.length <= 0 ||
        payload.expectedPurchaseCount +
          payload.tickets.length >
          MAX_LOTTO_PURCHASES_PER_VISIT
      ) {
        throw new Error(
          "로또 구매 수량이 올바르지 않습니다.",
        );
      }

      if (
        !Number.isInteger(
          payload.drawNumber,
        ) ||
        payload.drawNumber <= 0
      ) {
        throw new Error(
          "로또 회차가 올바르지 않습니다.",
        );
      }

      if (
        !Number.isFinite(
          payload.jackpotContribution,
        ) ||
        payload.jackpotContribution < 0 ||
        payload.jackpotContribution >
          payload.tickets.length * 1000
      ) {
        throw new Error(
          "로또 당첨금 적립액이 올바르지 않습니다.",
        );
      }

      const ticketIds =
        new Set<string>();

      for (
        const ticket of
        payload.tickets
      ) {
        validateIdentifier(
          ticket.id,
          "로또 티켓 ID",
        );

        if (
          ticketIds.has(ticket.id)
        ) {
          throw new Error(
            "중복된 로또 티켓 ID가 있습니다.",
          );
        }

        ticketIds.add(ticket.id);

        if (
          ticket.playerId !==
          playerId
        ) {
          throw new Error(
            "로또 티켓 소유자가 올바르지 않습니다.",
          );
        }

        if (
          ticket.drawNumber !==
          payload.drawNumber
        ) {
          throw new Error(
            "로또 티켓의 회차가 일치하지 않습니다.",
          );
        }

        if (
          !Number.isInteger(
            ticket.purchasedTurn,
          ) ||
          ticket.purchasedTurn !==
            game.turnNumber
        ) {
          throw new Error(
            "로또 티켓 구매 턴이 올바르지 않습니다.",
          );
        }

        validateLottoNumbers(
          ticket.numbers,
        );
      }

      return;
    }
  }
}