import { useEffect, useRef, useState } from "react";

import "./TollPaymentModal.css";

import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type {
  PropertyDevelopmentStage,
  TollPaymentError,
} from "../game/property/propertyTypes";
import type { PropertyData } from "../types";
import type { PlayerTokenData } from "./PlayerToken";

interface TollPaymentModalProps {
  property: PropertyData | null;
  districtName: string | null;
  payer: PlayerTokenData | null;
  owner: PlayerTokenData | null;
  amount: number;
  ownerIncomeAmount: number;
  stage: PropertyDevelopmentStage | null;
  showPayerBalance: boolean;
  canPay: boolean;
  canInteract: boolean;
  error: TollPaymentError | null;
  canUseExemptionItem?: boolean;
  onUseExemptionItem?: () => void;
  onPay: () => void;
}

type SettlementPhase = "IDLE" | "TRANSFERRING" | "COMPLETE";

const TRANSFER_COMPLETE_DELAY = 1250;
const PAYMENT_COMMIT_DELAY = 2200;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: TollPaymentError | null): string | null {
  switch (error) {
    case "INSUFFICIENT_FUNDS":
      return "통행료를 낼 자금이 부족합니다.";
    case "OWNER_NOT_FOUND":
      return "부동산 소유자 정보를 찾지 못했습니다.";
    case "NO_PENDING_TOLL":
      return "처리할 통행료 정보를 찾지 못했습니다.";
    default:
      return null;
  }
}

export function TollPaymentModal({
  property,
  districtName,
  payer,
  owner,
  amount,
  ownerIncomeAmount,
  stage,
  showPayerBalance,
  canInteract,
  canPay,
  error,
  canUseExemptionItem = false,
  onUseExemptionItem,
  onPay,
}: TollPaymentModalProps) {
  const [settlementPhase, setSettlementPhase] =
    useState<SettlementPhase>("IDLE");

  const timerIdsRef =
    useRef<number[]>([]);

  const clearSettlementTimers = () => {
    timerIdsRef.current.forEach(
      (timerId) => {
        window.clearTimeout(
          timerId,
        );
      },
    );

    timerIdsRef.current = [];
  };

  /*
  * 통행료 대상이 변경되거나 사라지면
  * 이전 결제 애니메이션 상태를 초기화한다.
  *
  * TollPaymentModal 컴포넌트 자체는 유지되므로
  * 명시적으로 IDLE로 되돌려야 한다.
  */
  useEffect(() => {
    clearSettlementTimers();

    setSettlementPhase("IDLE");
  }, [
    property?.id,
    payer?.id,
    owner?.id,
    amount,
  ]);

  useEffect(() => {
    return () => {
      clearSettlementTimers();
    };
  }, []);

  if (!property || !payer || !owner) return null;

  const errorMessage = getErrorMessage(error);
  const remainingMoney = payer.money - amount;
  const systemFeeAmount = Math.max(0, amount - ownerIncomeAmount);
  const isLandmark = stage === "LANDMARK";
  const isSettling = settlementPhase !== "IDLE";

  const handlePay = () => {
    if ( !canInteract || !canPay || isSettling ) {
    return;
  }

    clearSettlementTimers();

    setSettlementPhase("TRANSFERRING");

    timerIdsRef.current.push(
      window.setTimeout(() => {
        setSettlementPhase("COMPLETE");
      }, TRANSFER_COMPLETE_DELAY),
    );

    timerIdsRef.current.push(
      window.setTimeout(() => {
        onPay();
      }, PAYMENT_COMMIT_DELAY),
    );
  };

  return (
    <div className="toll-payment-overlay">
      <section
        className={[
          "toll-payment-modal",
          isLandmark ? "is-landmark" : "",
          settlementPhase === "TRANSFERRING" ? "is-transferring" : "",
          settlementPhase === "COMPLETE" ? "is-complete" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="toll-payment-title"
      >
        <header className="toll-payment-modal__header">
          <div>
            <p className="toll-payment-modal__kicker">
              PROPERTY TOLL SETTLEMENT
            </p>
            <h2 id="toll-payment-title">통행료 정산</h2>
          </div>

          {isLandmark && (
            <span className="toll-payment-modal__landmark-badge">
              LANDMARK
            </span>
          )}
        </header>

        <div className="toll-payment-modal__property">
          <div>
            <span>{districtName ?? property.district}</span>
            <strong>{property.name}</strong>
          </div>

          {stage && (
            <em>{getDevelopmentStageLabel(stage)}</em>
          )}
        </div>

        <div className="toll-payment-modal__transfer">
          <article className="toll-payment-modal__party toll-payment-modal__party--payer">
            <span className="toll-payment-modal__party-label">지급자</span>

            <div className="toll-payment-modal__identity">
              <span
                className="toll-payment-modal__player-token"
                style={{ ["--player-color" as string]: payer.color }}
              >
                {payer.shortName}
              </span>

              <strong>{payer.name}</strong>
            </div>

            {showPayerBalance ? (
              <div className="toll-payment-modal__balance">
                <span>현재 자금</span>
                <strong>{formatMoney(payer.money)}</strong>
                <small>
                  지급 후{" "}
                  <b className={canPay ? "" : "is-insufficient"}>
                    {canPay ? formatMoney(remainingMoney) : "잔액 부족"}
                  </b>
                </small>
              </div>
            ) : (
              <div className="toll-payment-modal__balance">
                <span>지급 예정</span>
                <strong>{formatMoney(amount)}</strong>
              </div>
            )}
          </article>

          <div className="toll-payment-modal__transfer-center">
            <span>지급 통행료</span>
            <strong>{formatMoney(amount)}</strong>

            <div className="toll-payment-modal__transfer-track">
              <i />
              <b>₩</b>
            </div>

            <small>
              {settlementPhase === "IDLE" && "결제 대기"}
              {settlementPhase === "TRANSFERRING" && "송금 처리 중"}
              {settlementPhase === "COMPLETE" && "정산 완료"}
            </small>
          </div>

          <article className="toll-payment-modal__party toll-payment-modal__party--owner">
            <span className="toll-payment-modal__party-label">소유자</span>

            <div className="toll-payment-modal__identity">
              <span
                className="toll-payment-modal__player-token"
                style={{ ["--player-color" as string]: owner.color }}
              >
                {owner.shortName}
              </span>

              <strong>{owner.name}</strong>
            </div>

            <div className="toll-payment-modal__balance">
              <span>수령 예정</span>
              <strong>
                +{formatMoney(ownerIncomeAmount)}
              </strong>
            </div>
          </article>
        </div>

        <dl className="toll-payment-modal__statement">
          <div>
            <dt>부동산 이용료</dt>
            <dd>{formatMoney(amount)}</dd>
          </div>

          {systemFeeAmount > 0 && (
            <>
              <div>
                <dt>소유자 수령액</dt>
                <dd>{formatMoney(ownerIncomeAmount)}</dd>
              </div>
              <div>
                <dt>시스템 귀속액</dt>
                <dd>{formatMoney(systemFeeAmount)}</dd>
              </div>
            </>
          )}

          <div className="is-total">
            <dt>최종 지급액</dt>
            <dd>{formatMoney(amount)}</dd>
          </div>
        </dl>

        {systemFeeAmount > 0 && (
          <p className="toll-payment-modal__jail-note">
            소유자가 구치소에 수감되어 통행료의 70%만 수령하며,
            나머지 30%는 시스템에 귀속됩니다.
          </p>
        )}

        {!canPay && !errorMessage && (
          <p className="toll-payment-modal__error" role="alert">
            자금 부족 처리는 파산·자산 매각 시스템에서 연결됩니다.
          </p>
        )}

        {errorMessage && (
          <p className="toll-payment-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        <div
          className="toll-payment-modal__settlement-status"
          aria-live="polite"
        >
          {settlementPhase === "TRANSFERRING" && (
            <>
              <span />
              <strong>{formatMoney(amount)} 송금 중</strong>
            </>
          )}

          {settlementPhase === "COMPLETE" && (
            <>
              <span>✓</span>
              <strong>통행료 정산 완료</strong>
            </>
          )}
        </div>

        <div className="toll-payment-modal__actions">
          {canUseExemptionItem &&
            onUseExemptionItem && (
              <button
                type="button"
                className="toll-payment-modal__exemption"
                onClick={onUseExemptionItem}
                disabled={
                  !canInteract ||
                  isSettling
                }
              >
                통행료 면제권 사용
              </button>
            )}

          <button
            type="button"
            className="toll-payment-modal__pay"
            onClick={handlePay}
            disabled={
              !canInteract ||
              !canPay ||
              isSettling
            }
          >
            {!canInteract &&
              `${payer.name}님의 처리를 기다리는 중`}

            {canInteract &&
              !canPay &&
              "자금 부족"}

            {canInteract &&
              canPay &&
              settlementPhase === "IDLE" &&
              `${formatMoney(amount)} 지급`}

            {canInteract &&
              canPay &&
              settlementPhase === "TRANSFERRING" &&
              "정산 처리 중"}

            {canInteract &&
              canPay &&
              settlementPhase === "COMPLETE" &&
              "정산 완료"}
          </button>
        </div>
      </section>
    </div>
  );
}
