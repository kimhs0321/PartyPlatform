import type {
  BankInterestCredit,
  BankState,
  RecurringSavingsContract,
  RecurringSavingsProduct,
  RecurringSavingsProductId,
} from "./bankTypes";

export const GENERAL_DEPOSIT_INTEREST_INTERVAL = 5;
export const GENERAL_DEPOSIT_INTEREST_RATE = 0.03;
export const SAVINGS_CANCELLATION_REFUND_RATE = 0.9;
export const MAX_SAVINGS_PAYMENT_FAILURES = 2;

export const RECURRING_SAVINGS_PRODUCTS: RecurringSavingsProduct[] = [
  {
    id: "SMALL",
    name: "소액 적금",
    installmentAmount: 100,
    installmentCount: 5,
    maturityPayout: 600,
  },
  {
    id: "STANDARD",
    name: "표준 적금",
    installmentAmount: 200,
    installmentCount: 5,
    maturityPayout: 1200,
  },
  {
    id: "LARGE",
    name: "고액 적금",
    installmentAmount: 300,
    installmentCount: 5,
    maturityPayout: 1800,
  },
];

export function createInitialBankState(playerIds: string[]): BankState {
  return {
    generalDeposits: Object.fromEntries(
      playerIds.map((playerId) => [playerId, 0]),
    ),
    recurringSavings: {},
    lastInterestTurn: null,
  };
}

export function getGeneralDepositBalance(
  state: BankState,
  playerId: string,
): number {
  return state.generalDeposits[playerId] ?? 0;
}

export function getRecurringSavingsContract(
  state: BankState,
  playerId: string,
): RecurringSavingsContract | null {
  return state.recurringSavings[playerId] ?? null;
}

export function getRecurringSavingsProduct(
  productId: RecurringSavingsProductId,
): RecurringSavingsProduct | null {
  return (
    RECURRING_SAVINGS_PRODUCTS.find((product) => product.id === productId) ??
    null
  );
}

export function addGeneralDeposit(
  state: BankState,
  playerId: string,
  amount: number,
): BankState {
  return {
    ...state,
    generalDeposits: {
      ...state.generalDeposits,
      [playerId]: getGeneralDepositBalance(state, playerId) + amount,
    },
  };
}

export function subtractGeneralDeposit(
  state: BankState,
  playerId: string,
  amount: number,
): BankState | null {
  const currentBalance = getGeneralDepositBalance(state, playerId);
  if (amount <= 0 || currentBalance < amount) return null;

  return {
    ...state,
    generalDeposits: {
      ...state.generalDeposits,
      [playerId]: currentBalance - amount,
    },
  };
}

export function openRecurringSavingsContract(
  state: BankState,
  playerId: string,
  product: RecurringSavingsProduct,
  currentTurn: number,
): BankState {
  return {
    ...state,
    recurringSavings: {
      ...state.recurringSavings,
      [playerId]: {
        playerId,
        productId: product.id,
        installmentAmount: product.installmentAmount,
        installmentCount: product.installmentCount,
        installmentsPaid: 1,
        principalPaid: product.installmentAmount,
        failedPayments: 0,
        openedTurn: currentTurn,
        nextPaymentTurn: currentTurn + 1,
      },
    },
  };
}

export function recordRecurringSavingsPayment(
  state: BankState,
  playerId: string,
  currentTurn: number,
): { state: BankState; contract: RecurringSavingsContract } | null {
  const contract = getRecurringSavingsContract(state, playerId);
  if (!contract) return null;

  const nextContract: RecurringSavingsContract = {
    ...contract,
    installmentsPaid: contract.installmentsPaid + 1,
    principalPaid: contract.principalPaid + contract.installmentAmount,
    nextPaymentTurn: currentTurn + 1,
  };

  return {
    state: {
      ...state,
      recurringSavings: {
        ...state.recurringSavings,
        [playerId]: nextContract,
      },
    },
    contract: nextContract,
  };
}

export function recordRecurringSavingsFailure(
  state: BankState,
  playerId: string,
  currentTurn: number,
): {
  state: BankState;
  contract: RecurringSavingsContract;
  cancelled: boolean;
  refundAmount: number;
} | null {
  const contract = getRecurringSavingsContract(state, playerId);
  if (!contract) return null;

  const failedPayments = contract.failedPayments + 1;
  const nextContract: RecurringSavingsContract = {
    ...contract,
    failedPayments,
    nextPaymentTurn: currentTurn + 1,
  };

  if (failedPayments >= MAX_SAVINGS_PAYMENT_FAILURES) {
    const nextSavings = { ...state.recurringSavings };
    delete nextSavings[playerId];

    return {
      state: {
        ...state,
        recurringSavings: nextSavings,
      },
      contract: nextContract,
      cancelled: true,
      refundAmount: Math.floor(
        contract.principalPaid * SAVINGS_CANCELLATION_REFUND_RATE,
      ),
    };
  }

  return {
    state: {
      ...state,
      recurringSavings: {
        ...state.recurringSavings,
        [playerId]: nextContract,
      },
    },
    contract: nextContract,
    cancelled: false,
    refundAmount: 0,
  };
}

export function completeRecurringSavings(
  state: BankState,
  playerId: string,
): BankState {
  const nextSavings = { ...state.recurringSavings };
  delete nextSavings[playerId];
  return {
    ...state,
    recurringSavings: nextSavings,
  };
}

export function isScheduledBankInterestTurn(turnNumber: number): boolean {
  return (
    turnNumber > 0 &&
    turnNumber % GENERAL_DEPOSIT_INTEREST_INTERVAL === 0
  );
}

export function applyGeneralDepositInterest(
  state: BankState,
  playerIds: string[],
  settlementTurn: number,
  interestMultiplier = 1,
  playerInterestMultipliers: Record<string, number> = {},
): { state: BankState; credits: BankInterestCredit[] } {
  if (state.lastInterestTurn === settlementTurn) {
    return { state, credits: [] };
  }

  const nextDeposits = { ...state.generalDeposits };
  const credits: BankInterestCredit[] = [];

  for (const playerId of playerIds) {
    const balanceBefore = getGeneralDepositBalance(state, playerId);
    const interestAmount = Math.floor(
      balanceBefore *
        GENERAL_DEPOSIT_INTEREST_RATE *
        Math.max(0, interestMultiplier) *
        Math.max(0, playerInterestMultipliers[playerId] ?? 1),
    );
    if (interestAmount <= 0) continue;

    const balanceAfter = balanceBefore + interestAmount;
    nextDeposits[playerId] = balanceAfter;
    credits.push({
      playerId,
      balanceBefore,
      interestAmount,
      balanceAfter,
    });
  }

  return {
    state: {
      ...state,
      generalDeposits: nextDeposits,
      lastInterestTurn: settlementTurn,
    },
    credits,
  };
}

export function removePlayerBankAssets(
  state: BankState,
  playerId: string,
): BankState {
  const nextSavings = { ...state.recurringSavings };
  delete nextSavings[playerId];

  return {
    ...state,
    generalDeposits: {
      ...state.generalDeposits,
      [playerId]: 0,
    },
    recurringSavings: nextSavings,
  };
}
