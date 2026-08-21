import "./MoneyPanel.css";

import type { RecurringSavingsContract } from "../game/bank/bankTypes";
import type { MoneyTransaction } from "../game/economy/economyTypes";
import { getTransactionReasonLabel } from "../game/economy/money";
import type { PlayerTokenData } from "./PlayerToken";

interface MoneyPanelProps {
  player: PlayerTokenData;
  latestTransaction: MoneyTransaction | null;
  generalDepositBalance: number;
  savingsContract: RecurringSavingsContract | null;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getTransactionSign(transaction: MoneyTransaction): string {
  return transaction.type === "DEPOSIT" || transaction.type === "TRANSFER_IN"
    ? "+"
    : "-";
}

export function MoneyPanel({
  player,
  latestTransaction,
  generalDepositBalance,
  savingsContract,
}: MoneyPanelProps) {
  return (
    <section className="money-panel" aria-label="내 자금">
      <div className="money-panel__heading">
        <span>내 자금</span>
        <small>{player.name}</small>
      </div>

      <div className="money-panel__balances">
        <div>
          <small>현금</small>
          <strong className="money-panel__balance">
            {formatMoney(player.money)}
          </strong>
        </div>
        <div>
          <small>일반예금</small>
          <strong>{formatMoney(generalDepositBalance)}</strong>
        </div>
      </div>

      {savingsContract && (
        <small className="money-panel__savings">
          적금 {savingsContract.installmentsPaid}/{savingsContract.installmentCount}회 · 납입원금 {formatMoney(savingsContract.principalPaid)}
        </small>
      )}

      {latestTransaction && (
        <small className="money-panel__transaction">
          {getTransactionReasonLabel(latestTransaction.reason)} ·{" "}
          {getTransactionSign(latestTransaction)}
          {formatMoney(latestTransaction.amount)}
        </small>
      )}
    </section>
  );
}
