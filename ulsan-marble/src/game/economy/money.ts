import type { PlayerTokenData } from "../../components/PlayerToken";
import type {
  MoneyErrorCode,
  MoneyOperationResult,
  MoneyTransaction,
  MoneyTransactionContext,
  TransactionReason,
} from "./economyTypes";

let transactionSequence = 0;

function createTransactionId(prefix: string): string {
  transactionSequence += 1;
  return `${prefix}-${Date.now()}-${transactionSequence}`;
}

function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount > 0;
}

function failure(
  players: PlayerTokenData[],
  error: MoneyErrorCode,
): MoneyOperationResult {
  return {
    ok: false,
    players,
    transactions: [],
    error,
  };
}

function findPlayer(
  players: PlayerTokenData[],
  playerId: string,
): PlayerTokenData | undefined {
  return players.find((player) => player.id === playerId);
}

export function getBalance(
  players: PlayerTokenData[],
  playerId: string,
): number | null {
  return findPlayer(players, playerId)?.money ?? null;
}

export function canAfford(
  players: PlayerTokenData[],
  playerId: string,
  amount: number,
): boolean {
  if (!isValidAmount(amount)) return false;

  const balance = getBalance(players, playerId);
  return balance !== null && balance >= amount;
}

export function depositMoney(
  players: PlayerTokenData[],
  playerId: string,
  amount: number,
  context: MoneyTransactionContext,
): MoneyOperationResult {
  if (!isValidAmount(amount)) return failure(players, "INVALID_AMOUNT");

  const player = findPlayer(players, playerId);
  if (!player) return failure(players, "PLAYER_NOT_FOUND");

  const balanceAfter = player.money + amount;
  const transaction: MoneyTransaction = {
    id: createTransactionId("deposit"),
    type: "DEPOSIT",
    playerId,
    amount,
    balanceBefore: player.money,
    balanceAfter,
    reason: context.reason,
    turnNumber: context.turnNumber,
    memo: context.memo,
    createdAt: Date.now(),
  };

  return {
    ok: true,
    players: players.map((currentPlayer) =>
      currentPlayer.id === playerId
        ? { ...currentPlayer, money: balanceAfter }
        : currentPlayer,
    ),
    transactions: [transaction],
  };
}

export function withdrawMoney(
  players: PlayerTokenData[],
  playerId: string,
  amount: number,
  context: MoneyTransactionContext,
): MoneyOperationResult {
  if (!isValidAmount(amount)) return failure(players, "INVALID_AMOUNT");

  const player = findPlayer(players, playerId);
  if (!player) return failure(players, "PLAYER_NOT_FOUND");
  if (player.money < amount) return failure(players, "INSUFFICIENT_FUNDS");

  const balanceAfter = player.money - amount;
  const transaction: MoneyTransaction = {
    id: createTransactionId("withdrawal"),
    type: "WITHDRAWAL",
    playerId,
    amount,
    balanceBefore: player.money,
    balanceAfter,
    reason: context.reason,
    turnNumber: context.turnNumber,
    memo: context.memo,
    createdAt: Date.now(),
  };

  return {
    ok: true,
    players: players.map((currentPlayer) =>
      currentPlayer.id === playerId
        ? { ...currentPlayer, money: balanceAfter }
        : currentPlayer,
    ),
    transactions: [transaction],
  };
}

export function transferMoney(
  players: PlayerTokenData[],
  fromPlayerId: string,
  toPlayerId: string,
  amount: number,
  context: MoneyTransactionContext,
): MoneyOperationResult {
  if (!isValidAmount(amount)) return failure(players, "INVALID_AMOUNT");
  if (fromPlayerId === toPlayerId) {
    return failure(players, "SAME_PLAYER_TRANSFER");
  }

  const sender = findPlayer(players, fromPlayerId);
  const receiver = findPlayer(players, toPlayerId);

  if (!sender || !receiver) return failure(players, "PLAYER_NOT_FOUND");
  if (sender.money < amount) return failure(players, "INSUFFICIENT_FUNDS");

  const senderBalanceAfter = sender.money - amount;
  const receiverBalanceAfter = receiver.money + amount;
  const transferId = createTransactionId("transfer");
  const createdAt = Date.now();

  const transactions: MoneyTransaction[] = [
    {
      id: createTransactionId("transfer-out"),
      transferId,
      type: "TRANSFER_OUT",
      playerId: fromPlayerId,
      counterpartyPlayerId: toPlayerId,
      amount,
      balanceBefore: sender.money,
      balanceAfter: senderBalanceAfter,
      reason: context.reason,
      turnNumber: context.turnNumber,
      memo: context.memo,
      createdAt,
    },
    {
      id: createTransactionId("transfer-in"),
      transferId,
      type: "TRANSFER_IN",
      playerId: toPlayerId,
      counterpartyPlayerId: fromPlayerId,
      amount,
      balanceBefore: receiver.money,
      balanceAfter: receiverBalanceAfter,
      reason: context.reason,
      turnNumber: context.turnNumber,
      memo: context.memo,
      createdAt,
    },
  ];

  return {
    ok: true,
    players: players.map((player) => {
      if (player.id === fromPlayerId) {
        return { ...player, money: senderBalanceAfter };
      }

      if (player.id === toPlayerId) {
        return { ...player, money: receiverBalanceAfter };
      }

      return player;
    }),
    transactions,
  };
}

export function createStartingCashTransactions(
  players: PlayerTokenData[],
  turnNumber: number = 1,
): MoneyTransaction[] {
  const createdAt = Date.now();

  return players.map((player, index) => ({
    id: `starting-cash-${player.id}-${index}`,
    type: "DEPOSIT",
    playerId: player.id,
    amount: player.money,
    balanceBefore: 0,
    balanceAfter: player.money,
    reason: "STARTING_CASH",
    turnNumber,
    createdAt,
  }));
}

export function getTransactionReasonLabel(
  reason: TransactionReason,
): string {
  switch (reason) {
    case "STARTING_CASH":
      return "시작 자금";
    case "SALARY":
      return "월급";
    case "PROPERTY_PURCHASE":
      return "부동산 구매";
    case "CONSTRUCTION":
      return "건설비";
    case "TOLL":
      return "통행료";
    case "TAX":
      return "세금";
    case "SALE":
      return "부동산 매각";
    case "STOCK_PURCHASE":
      return "주식 매수";
    case "STOCK_SALE":
      return "주식 매도";
    case "LOTTERY_PURCHASE":
      return "복권 구매";
    case "LOTTERY_PRIZE":
      return "복권 당첨";
    case "DISASTER_REPAIR":
      return "재난 복구비";
    case "INSURANCE_PREMIUM":
      return "보험료";
    case "AIRPORT_TICKET":
      return "항공권";
    case "PORT_INVESTMENT":
      return "항구 투자";
    case "PORT_SETTLEMENT":
      return "항구 정산";
    case "BANK_DEPOSIT":
      return "일반예금 예치";
    case "BANK_WITHDRAWAL":
      return "일반예금 인출";
    case "SAVINGS_PAYMENT":
      return "정기적금 납입";
    case "SAVINGS_MATURITY":
      return "정기적금 만기";
    case "SAVINGS_REFUND":
      return "정기적금 해지 환급";
    case "BANKRUPTCY":
      return "파산 정산";
    case "AUCTION_PURCHASE":
      return "아이템 경매 낙찰";
    case "ITEM_COMPENSATION":
      return "아이템 보전금";
    case "EVENT":
      return "이벤트";
    default:
      return "거래";
  }
}
