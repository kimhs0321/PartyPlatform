import { useEffect, useMemo, useRef, useState } from "react";

import "./TaxPaymentModal.css";

import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type {
  TaxAssessment,
  TaxPaymentError,
} from "../game/economy/taxTypes";
import type { PlayerTokenData } from "./PlayerToken";

interface TaxPaymentModalProps {
  assessment: TaxAssessment | null;
  player: PlayerTokenData | null;
  canInteract: boolean;
  currentNumber: number;
  totalCount: number;
  showBalance: boolean;
  canPay: boolean;
  error: TaxPaymentError | null;
  onPay: () => void;
}

type TaxPaymentPhase = "IDLE" | "STAMPING" | "COMPLETE";

const STAMP_COMPLETE_DELAY = 900;
const PAYMENT_COMMIT_DELAY = 1800;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function getErrorMessage(error: TaxPaymentError | null): string | null {
  switch (error) {
    case "NO_PENDING_TAX":
      return "처리할 세금이 없습니다.";
    case "PLAYER_NOT_FOUND":
      return "납세자 정보를 찾지 못했습니다.";
    case "INSUFFICIENT_FUNDS":
      return "현금이 부족합니다. 보유 자산을 정리해야 합니다.";
    case "PAYMENT_FAILED":
      return "세금 납부 중 오류가 발생했습니다.";
    default:
      return null;
  }
}

export function TaxPaymentModal({
  assessment,
  player,
  currentNumber,
  canInteract,
  totalCount,
  showBalance,
  canPay,
  error,
  onPay,
}: TaxPaymentModalProps) {
  const [paymentPhase, setPaymentPhase] =
    useState<TaxPaymentPhase>("IDLE");
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    timerIdsRef.current.forEach(
      (timerId) => {
        window.clearTimeout(
          timerId,
        );
      },
    );

    timerIdsRef.current = [];

    setPaymentPhase(
      "IDLE",
    );
  }, [
    assessment?.playerId,
    assessment?.settlementTurn,
    assessment?.totalAmount,
  ]);

  const taxablePropertyValue = useMemo(
    () =>
      assessment?.items.reduce(
        (total, item) => total + item.currentPrice,
        0,
      ) ?? 0,
    [assessment],
  );

  if (!assessment || !player) return null;

  const errorMessage = getErrorMessage(error);
  const balanceAfter = player.money - assessment.totalAmount;
  const isProcessing = paymentPhase !== "IDLE";
  const noticeNumber = `UM-${String(assessment.settlementTurn).padStart(
    3,
    "0",
  )}-${String(currentNumber).padStart(2, "0")}`;

  const handlePay = () => {
    if (
      !canInteract ||
      !canPay ||
      isProcessing
    ) {
      return;
    }

    timerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timerIdsRef.current = [];

    setPaymentPhase("STAMPING");

    timerIdsRef.current.push(
      window.setTimeout(() => {
        setPaymentPhase("COMPLETE");
      }, STAMP_COMPLETE_DELAY),
    );

    timerIdsRef.current.push(
      window.setTimeout(() => {
        onPay();
      }, PAYMENT_COMMIT_DELAY),
    );
  };

  return (
    <div className="tax-payment-overlay">
      <section
        className={[
          "tax-payment-modal",
          paymentPhase === "STAMPING" ? "is-stamping" : "",
          paymentPhase === "COMPLETE" ? "is-complete" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-payment-title"
      >
        <div className="tax-payment-modal__paper">
          <header className="tax-payment-modal__official-header">
            <div className="tax-payment-modal__agency">
              <span className="tax-payment-modal__seal" aria-hidden="true">
                UM
              </span>
              <div>
                <small>ULSAN MARBLE CITY FINANCE BUREAU</small>
                <strong>울산마블 도시재정국</strong>
              </div>
            </div>

            <div className="tax-payment-modal__issue">
              <span>{assessment.settlementTurn}턴 정기분</span>
              <strong>
                {currentNumber} / {totalCount}
              </strong>
            </div>
          </header>

          <div className="tax-payment-modal__title-row">
            <div>
              <p>도시세</p>
              <h2 id="tax-payment-title">납부고지서</h2>
            </div>

            <dl>
              <div>
                <dt>고지번호</dt>
                <dd>{noticeNumber}</dd>
              </div>
              <div>
                <dt>납부상태</dt>
                <dd>
                  {paymentPhase === "IDLE" && "미납"}
                  {paymentPhase === "STAMPING" && "처리 중"}
                  {paymentPhase === "COMPLETE" && "납부 완료"}
                </dd>
              </div>
            </dl>
          </div>

          <section className="tax-payment-modal__taxpayer">
            <div>
              <span>납세자</span>
              <strong>{player.name}</strong>
            </div>

            <span
              className="tax-payment-modal__player-token"
              style={{ ["--player-color" as string]: player.color }}
            >
              {player.shortName}
            </span>

            <div>
              <span>과세 구분</span>
              <strong>보유 부동산세</strong>
            </div>

            <div>
              <span>과세 대상</span>
              <strong>{assessment.items.length}건</strong>
            </div>
          </section>

          <div className="tax-payment-modal__items">
            <div className="tax-payment-modal__items-header">
              <span>과세 대상</span>
              <span>개발 단계</span>
              <span>현재가</span>
              <span>세율</span>
              <span>세액</span>
            </div>

            {assessment.items.map((item) => (
              <article className="tax-payment-item" key={item.propertyId}>
                <strong>{item.propertyName}</strong>
                <span>{getDevelopmentStageLabel(item.stage)}</span>
                <span>{formatMoney(item.currentPrice)}</span>
                <span>{formatRate(item.rate)}</span>
                <b>{formatMoney(item.amount)}</b>
              </article>
            ))}
          </div>

          <section className="tax-payment-modal__calculation">
            <dl>
              <div>
                <dt>과세 대상 현재가 합계</dt>
                <dd>{formatMoney(taxablePropertyValue)}</dd>
              </div>
              <div>
                <dt>보유 부동산 수</dt>
                <dd>{assessment.items.length}건</dd>
              </div>
              <div className="is-total">
                <dt>납부할 세액</dt>
                <dd>{formatMoney(assessment.totalAmount)}</dd>
              </div>
            </dl>

            {showBalance && (
              <dl className="tax-payment-modal__balance">
                <div>
                  <dt>현재 현금</dt>
                  <dd>{formatMoney(player.money)}</dd>
                </div>
                <div>
                  <dt>납부 후 현금</dt>
                  <dd className={balanceAfter < 0 ? "is-insufficient" : ""}>
                    {balanceAfter < 0
                      ? "잔액 부족"
                      : formatMoney(balanceAfter)}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          {errorMessage && (
            <p className="tax-payment-modal__error" role="alert">
              {errorMessage}
            </p>
          )}

          <footer className="tax-payment-modal__footer">
            <div className="tax-payment-modal__notice">
              <strong>납부 안내</strong>
              <p>
                정기 세금은 보유 부동산의 현재가와 개발 단계에 따라
                산정됩니다. 기한 내 납부하지 못하는 경우 자산 정리
                절차가 진행됩니다.
              </p>
            </div>

            <div className="tax-payment-modal__barcode" aria-hidden="true">
              <i />
              <span>{noticeNumber.split("-").join("")}</span>
            </div>
          </footer>

          <div className="tax-payment-modal__cut-line" aria-hidden="true">
            <span>절취선</span>
          </div>

          <section className="tax-payment-modal__receipt">
            <div>
              <small>납부자 보관용</small>
              <strong>도시세 납부 영수증</strong>
            </div>

            <dl>
              <div>
                <dt>납세자</dt>
                <dd>{player.name}</dd>
              </div>
              <div>
                <dt>납부액</dt>
                <dd>{formatMoney(assessment.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          <div
            className="tax-payment-modal__paid-stamp"
            aria-hidden="true"
          >
            <span>PAID</span>
            <strong>납부완료</strong>
            <small>ULSAN MARBLE</small>
          </div>
        </div>

        <div className="tax-payment-modal__actions">
          <button
            type="button"
            className="tax-payment-modal__pay"
            disabled={
              !canInteract ||
              !canPay ||
              isProcessing
            }
            onClick={handlePay}
          >
            {!canInteract &&
              `${player.name}님의 세금 처리 대기`}

            {canInteract &&
              !canPay &&
              "자금 부족"}

            {canInteract &&
              canPay &&
              paymentPhase === "IDLE" &&
              `${formatMoney(
                assessment.totalAmount,
              )} 납부`}

            {canInteract &&
              canPay &&
              paymentPhase === "STAMPING" &&
              "납부 처리 중"}

            {canInteract &&
              canPay &&
              paymentPhase === "COMPLETE" &&
              "납부 완료"}
          </button>
        </div>
      </section>
    </div>
  );
}
