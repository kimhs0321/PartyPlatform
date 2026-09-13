import {
  getPlayerStockDividendSummary,
} from "../game/stock/stockDividend";

import type {
  StockDividendCredit,
} from "../game/stock/stockDividend";

import "./StockDividendSummary.css";

interface StockDividendSummaryProps {
  open: boolean;

  turnNumber: number;

  credits:
    StockDividendCredit[];

  playerId: string;
  playerName: string;

  onConfirm: () => void;
}

function formatMoney(
  amount: number,
): string {
  return `${amount.toLocaleString(
    "ko-KR",
  )}만원`;
}

function formatRate(
  rate: number,
): string {
  return `${(
    rate * 100
  ).toFixed(1)}%`;
}

export function StockDividendSummary({
  open,
  turnNumber,
  credits,
  playerId,
  playerName,
  onConfirm,
}: StockDividendSummaryProps) {
  if (!open) {
    return null;
  }

  const summary =
    getPlayerStockDividendSummary(
      credits,
      playerId,
    );

  return (
    <div
      className="stock-dividend-overlay"
      role="dialog"
      aria-modal="true"
    >
      <section className="stock-dividend-modal">
        <header className="stock-dividend-modal__header">
          <span>
            DIVIDEND SETTLEMENT
          </span>

          <h2>
            배당금 정산
          </h2>

          <p>
            {turnNumber}턴 주식시장
            배당금이 지급되었습니다.
          </p>
        </header>

        <section className="stock-dividend-modal__total">
          <span>
            {playerName}님의 이번 배당금
          </span>

          <strong>
            +
            {formatMoney(
              summary.totalAmount,
            )}
          </strong>
        </section>

        {summary.credits.length >
        0 ? (
          <div className="stock-dividend-modal__list">
            {summary.credits.map(
              (credit) => (
                <article
                  key={
                    credit.companyId
                  }
                  className="stock-dividend-modal__item"
                >
                  <div className="stock-dividend-modal__company">
                    <strong>
                      {
                        credit.companyName
                      }
                    </strong>

                    <span>
                      {credit.ticker}
                    </span>
                  </div>

                  <div className="stock-dividend-modal__detail">
                    <span>
                      보유{" "}
                      {credit.quantity.toLocaleString(
                        "ko-KR",
                      )}
                      주
                    </span>

                    <span>
                      기준가{" "}
                      {formatMoney(
                        credit.pricePerShare,
                      )}
                    </span>

                    <span>
                      배당률{" "}
                      {formatRate(
                        credit.dividendRate,
                      )}
                    </span>
                  </div>

                  <strong className="stock-dividend-modal__amount">
                    +
                    {formatMoney(
                      credit.amount,
                    )}
                  </strong>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="stock-dividend-modal__empty">
            <strong>
              이번 배당금 0만원
            </strong>

            <p>
              현재 배당 대상
              보유종목이 없습니다.
            </p>
          </div>
        )}

        <footer className="stock-dividend-modal__footer">
          <p>
            배당금은 현재 보유
            주식 수와 정산 시점의
            주가를 기준으로
            계산됩니다.
          </p>

          <button
            type="button"
            onClick={onConfirm}
          >
            확인
          </button>
        </footer>
      </section>
    </div>
  );
}