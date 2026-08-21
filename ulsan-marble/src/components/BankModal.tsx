import { useEffect, useMemo, useState } from "react";
import "./BankModal.css";

import {
  RECURRING_SAVINGS_PRODUCTS,
  getRecurringSavingsProduct,
} from "../game/bank/bankRules";
import type {
  BankShopError,
  PendingBankShop,
  RecurringSavingsContract,
  RecurringSavingsProductId,
} from "../game/bank/bankTypes";
import type { PlayerTokenData } from "./PlayerToken";

interface BankModalProps {
  shop: PendingBankShop | null;
  player: PlayerTokenData | null;
  generalDepositBalance: number;
  savingsContract: RecurringSavingsContract | null;
  error: BankShopError | null;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onStartSavings: (productId: RecurringSavingsProductId) => void;
  onClose: () => void;
}

type DepositAction = "DEPOSIT" | "WITHDRAW";

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: BankShopError | null): string | null {
  switch (error) {
    case "INVALID_AMOUNT":
      return "1만원 이상의 정수 금액을 입력해 주세요.";
    case "INSUFFICIENT_CASH":
      return "현금이 부족합니다.";
    case "INSUFFICIENT_DEPOSIT":
      return "일반예금 잔액이 부족합니다.";
    case "ACTIVE_SAVINGS_EXISTS":
      return "이미 유지 중인 정기적금이 있습니다.";
    case "INSUFFICIENT_LIQUID_FUNDS":
      return "첫 납입액을 낼 현금과 일반예금이 부족합니다.";
    case "UNKNOWN_PRODUCT":
      return "선택한 적금 상품을 찾을 수 없습니다.";
    case "NO_PENDING_BANK":
      return "현재 처리할 은행 방문이 없습니다.";
    default:
      return null;
  }
}

export function BankModal({
  shop,
  player,
  generalDepositBalance,
  savingsContract,
  error,
  onDeposit,
  onWithdraw,
  onStartSavings,
  onClose,
}: BankModalProps) {
  const [amount, setAmount] = useState(100);
  const [depositAction, setDepositAction] =
    useState<DepositAction>("DEPOSIT");
  const [selectedProductId, setSelectedProductId] =
    useState<RecurringSavingsProductId>(
      RECURRING_SAVINGS_PRODUCTS[0].id as RecurringSavingsProductId,
    );

  useEffect(() => {
    if (!shop) return;

    setAmount(100);
    setDepositAction("DEPOSIT");
    setSelectedProductId(
      RECURRING_SAVINGS_PRODUCTS[0].id as RecurringSavingsProductId,
    );
  }, [shop]);

  const activeProduct = useMemo(
    () =>
      savingsContract
        ? getRecurringSavingsProduct(savingsContract.productId)
        : null,
    [savingsContract],
  );

  const selectedProduct = useMemo(
    () =>
      RECURRING_SAVINGS_PRODUCTS.find(
        (product) => product.id === selectedProductId,
      ) ?? RECURRING_SAVINGS_PRODUCTS[0],
    [selectedProductId],
  );

  if (!shop || !player) return null;

  const safeAmount = Math.max(1, Math.trunc(amount || 0));
  const errorMessage = getErrorMessage(error);
  const isDeposit = depositAction === "DEPOSIT";
  const availableAmount = isDeposit
    ? player.money
    : generalDepositBalance;
  const transactionDisabled = availableAmount < safeAmount;
  const transactionResult = isDeposit
    ? generalDepositBalance + safeAmount
    : Math.max(0, generalDepositBalance - safeAmount);
  const canStartSelectedSavings =
    player.money + generalDepositBalance >=
    selectedProduct.installmentAmount;

  const submitDepositAction = () => {
    if (isDeposit) {
      onDeposit(safeAmount);
      return;
    }

    onWithdraw(safeAmount);
  };

  return (
    <div
      className="bank-application"
      role="dialog"
      aria-modal="true"
      aria-label="울산마블은행 금융상품 신청"
    >
      <section className="bank-application__document">
        <header className="bank-application__masthead">
          <div className="bank-application__brand">
            <span className="bank-application__logo" aria-hidden="true">
              U
            </span>
            <div>
              <small>ULSAN MARBLE BANK</small>
              <strong>울산마블은행</strong>
            </div>
          </div>

          <div className="bank-application__document-title">
            <span>금융상품 신청서</span>
            <h2>계좌관리 및 정기적금 가입</h2>
          </div>

          <button
            type="button"
            className="bank-application__close"
            onClick={onClose}
          >
            이용 종료
          </button>
        </header>

        <div className="bank-application__customer-strip">
          <dl>
            <div>
              <dt>신청인</dt>
              <dd>{player.name}</dd>
            </div>
            <div>
              <dt>보유 현금</dt>
              <dd>{formatMoney(player.money)}</dd>
            </div>
            <div>
              <dt>일반예금 잔액</dt>
              <dd>{formatMoney(generalDepositBalance)}</dd>
            </div>
          </dl>
          <span>접수번호 BANK-{shop.tileId}-{player.id}</span>
        </div>

        <div className="bank-application__body">
          <section className="bank-form-section bank-form-section--account">
            <div className="bank-form-section__heading">
              <div>
                <span>01</span>
                <div>
                  <h3>일반예금 계좌관리 신청</h3>
                  <p>5라운드마다 잔액의 3% 이자 · 강제 납부 시 즉시 사용</p>
                </div>
              </div>
              <strong>{formatMoney(generalDepositBalance)}</strong>
            </div>

            <div className="bank-application__choice-row">
              <button
                type="button"
                className={isDeposit ? "is-selected" : ""}
                onClick={() => setDepositAction("DEPOSIT")}
              >
                <small>거래 구분</small>
                <strong>입금 신청</strong>
                <span>현금을 예금계좌로 이동</span>
              </button>

              <button
                type="button"
                className={!isDeposit ? "is-selected" : ""}
                onClick={() => setDepositAction("WITHDRAW")}
              >
                <small>거래 구분</small>
                <strong>출금 신청</strong>
                <span>예금잔액을 현금으로 이동</span>
              </button>
            </div>

            <div className="bank-application__transaction-grid">
              <label>
                <span>신청 금액</span>
                <div>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(event) =>
                      setAmount(Number(event.target.value))
                    }
                  />
                  <b>만원</b>
                </div>
              </label>

              <dl>
                <div>
                  <dt>거래 전 예금잔액</dt>
                  <dd>{formatMoney(generalDepositBalance)}</dd>
                </div>
                <div>
                  <dt>거래 후 예상잔액</dt>
                  <dd>{formatMoney(transactionResult)}</dd>
                </div>
              </dl>
            </div>

            <div className="bank-application__quick-amounts">
              {[100, 300, 500, 1000].map((quickAmount) => (
                <button
                  type="button"
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                >
                  {formatMoney(quickAmount)}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="bank-application__submit bank-application__submit--account"
              disabled={transactionDisabled}
              onClick={submitDepositAction}
            >
              {isDeposit ? "입금 거래 신청" : "출금 거래 신청"}
            </button>
          </section>

          <section className="bank-form-section bank-form-section--savings">
            <div className="bank-form-section__heading">
              <div>
                <span>02</span>
                <div>
                  <h3>정기적금 가입 신청</h3>
                  <p>5회 자동 납입 · 만기 전 인출 불가 · 원금의 20% 이자</p>
                </div>
              </div>
            </div>

            {savingsContract && activeProduct ? (
              <article className="bank-application__active-contract">
                <div className="bank-application__contract-status">
                  <span>계약 유지 중</span>
                  <strong>{activeProduct.name}</strong>
                </div>

                <dl>
                  <div>
                    <dt>납입 진행</dt>
                    <dd>
                      {savingsContract.installmentsPaid}/
                      {savingsContract.installmentCount}회
                    </dd>
                  </div>
                  <div>
                    <dt>납입 원금</dt>
                    <dd>{formatMoney(savingsContract.principalPaid)}</dd>
                  </div>
                  <div>
                    <dt>다음 납입</dt>
                    <dd>{savingsContract.nextPaymentTurn}턴</dd>
                  </div>
                  <div>
                    <dt>누적 실패</dt>
                    <dd>{savingsContract.failedPayments}/2회</dd>
                  </div>
                  <div className="is-emphasis">
                    <dt>만기 수령액</dt>
                    <dd>{formatMoney(activeProduct.maturityPayout)}</dd>
                  </div>
                </dl>

                <div className="bank-application__stamp" aria-hidden="true">
                  계약유지
                </div>

                <small>
                  중도 인출과 임의 해지는 지원하지 않습니다.
                </small>
              </article>
            ) : (
              <>
                <div className="bank-application__products">
                  {RECURRING_SAVINGS_PRODUCTS.map((product) => {
                    const selected =
                      selectedProduct.id === product.id;
                    const disabled =
                      player.money + generalDepositBalance <
                      product.installmentAmount;

                    return (
                      <button
                        type="button"
                        key={product.id}
                        className={selected ? "is-selected" : ""}
                        disabled={disabled}
                        onClick={() =>
                          setSelectedProductId(
                            product.id as RecurringSavingsProductId,
                          )
                        }
                      >
                        <span>{product.installmentCount}회 납입</span>
                        <strong>{product.name}</strong>
                        <dl>
                          <div>
                            <dt>회당 납입</dt>
                            <dd>
                              {formatMoney(product.installmentAmount)}
                            </dd>
                          </div>
                          <div>
                            <dt>총 납입원금</dt>
                            <dd>
                              {formatMoney(
                                product.installmentAmount *
                                  product.installmentCount,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>만기 수령액</dt>
                            <dd>{formatMoney(product.maturityPayout)}</dd>
                          </div>
                        </dl>
                        <small>
                          {disabled
                            ? "첫 납입액 부족"
                            : selected
                              ? "선택된 금융상품"
                              : "상품 선택"}
                        </small>
                      </button>
                    );
                  })}
                </div>

                <div className="bank-application__savings-summary">
                  <dl>
                    <div>
                      <dt>신청 상품</dt>
                      <dd>{selectedProduct.name}</dd>
                    </div>
                    <div>
                      <dt>회당 납입액</dt>
                      <dd>
                        {formatMoney(selectedProduct.installmentAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt>납입 횟수</dt>
                      <dd>{selectedProduct.installmentCount}회</dd>
                    </div>
                    <div>
                      <dt>총 납입원금</dt>
                      <dd>
                        {formatMoney(
                          selectedProduct.installmentAmount *
                            selectedProduct.installmentCount,
                        )}
                      </dd>
                    </div>
                    <div className="is-emphasis">
                      <dt>만기 수령액</dt>
                      <dd>
                        {formatMoney(selectedProduct.maturityPayout)}
                      </dd>
                    </div>
                  </dl>

                  <p>
                    지정된 납입 턴에 현금과 일반예금이 모두 부족하면
                    납입 실패로 처리됩니다.
                  </p>

                  <button
                    type="button"
                    className="bank-application__submit"
                    disabled={!canStartSelectedSavings}
                    onClick={() =>
                      onStartSavings(
                        selectedProduct.id as RecurringSavingsProductId,
                      )
                    }
                  >
                    적금 가입 신청 및 1회차 납입
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        {errorMessage && (
          <p className="bank-application__error" role="alert">
            {errorMessage}
          </p>
        )}

        <footer className="bank-application__footer">
          <span>
            본 신청서는 울산마블 게임 내 금융상품 거래에만 적용됩니다.
          </span>
          <button type="button" onClick={onClose}>
            은행 이용 종료
          </button>
        </footer>
      </section>
    </div>
  );
}
