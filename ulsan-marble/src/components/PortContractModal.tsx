import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PlayerTokenData } from "./PlayerToken";
import {
  PORT_CONTRACTS,
  PORT_CONTRACT_DURATION_TURNS,
} from "../game/port/portRules";
import type {
  PendingPortShop,
  PortContract,
  PortContractType,
  PortShopError,
} from "../game/port/portTypes";
import "./PortContractModal.css";

interface PortContractModalProps {
  shop: PendingPortShop | null;
  player: PlayerTokenData | null;
  activeContract: PortContract | null;
  error: PortShopError | null;
  onBuy: (type: PortContractType) => void;
  onClose: () => void;
}

type SignaturePhase = "IDLE" | "SIGNING" | "SIGNED";

const SIGNED_STAMP_DELAY = 650;
const CONTRACT_COMMIT_DELAY = 1450;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function getErrorMessage(error: PortShopError | null): string | null {
  switch (error) {
    case "NO_PENDING_PORT":
      return "현재 이용할 수 있는 항구가 없습니다.";
    case "PLAYER_NOT_FOUND":
      return "계약할 플레이어를 찾지 못했습니다.";
    case "CONTRACT_NOT_FOUND":
      return "선택한 화물 계약을 찾지 못했습니다.";
    case "ACTIVE_CONTRACT_EXISTS":
      return "이미 정산 대기 중인 화물 계약이 있습니다.";
    case "INSUFFICIENT_FUNDS":
      return "투자금을 납부할 현금이 부족합니다.";
    case "PAYMENT_FAILED":
      return "화물 계약 투자금 결제에 실패했습니다.";
    default:
      return null;
  }
}

function getRiskLabel(successChance: number): string {
  if (successChance >= 0.75) return "안정형";
  if (successChance >= 0.55) return "균형형";
  return "고위험형";
}

export function PortContractModal({
  shop,
  player,
  activeContract,
  error,
  onBuy,
  onClose,
}: PortContractModalProps) {
  const contractDefinitions = useMemo(
    () =>
      Object.values(PORT_CONTRACTS) as Array<
        (typeof PORT_CONTRACTS)[keyof typeof PORT_CONTRACTS]
      >,
    [],
  );
  const [selectedType, setSelectedType] =
    useState<PortContractType | null>(
      contractDefinitions[0]?.type ?? null,
    );
  const [signaturePhase, setSignaturePhase] =
    useState<SignaturePhase>("IDLE");
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    timerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timerIdsRef.current = [];
    setSelectedType(contractDefinitions[0]?.type ?? null);
    setSignaturePhase("IDLE");

    return () => {
      timerIdsRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [shop?.playerId, player?.id, contractDefinitions]);

  if (!shop || !player) return null;

  const errorMessage = getErrorMessage(error);
  const selectedContract = selectedType
    ? PORT_CONTRACTS[selectedType]
    : null;
  const activeDefinition = activeContract
    ? PORT_CONTRACTS[activeContract.type]
    : null;
  const isSigning = signaturePhase !== "IDLE";

  const contractNumber = selectedContract
    ? [
        "UP",
        String(player.id)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(-5)
          .toUpperCase()
          .padStart(5, "0"),
        selectedContract.type,
      ].join("-")
    : "UP-PENDING";

  const handleSelect = (type: PortContractType) => {
    if (isSigning) return;
    setSelectedType(type);
    setSignaturePhase("IDLE");
  };

  const handleSign = () => {
    if (
      !selectedContract ||
      player.money < selectedContract.investmentAmount ||
      isSigning
    ) {
      return;
    }

    timerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timerIdsRef.current = [];

    setSignaturePhase("SIGNING");

    timerIdsRef.current.push(
      window.setTimeout(() => {
        setSignaturePhase("SIGNED");
      }, SIGNED_STAMP_DELAY),
    );

    timerIdsRef.current.push(
      window.setTimeout(() => {
        onBuy(selectedContract.type);
      }, CONTRACT_COMMIT_DELAY),
    );
  };

  return (
    <div className="port-contract-overlay" role="dialog" aria-modal="true">
      <section
        className={[
          "port-contract-modal",
          `is-${signaturePhase.toLowerCase()}`,
          activeContract ? "is-active-contract" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="port-contract-modal__header">
          <div className="port-contract-modal__brand">
            <span className="port-contract-modal__brand-mark" aria-hidden="true">
              UP
            </span>
            <div>
              <small>ULSAN PORT AUTHORITY</small>
              <h2>울산항 수출투자 계약실</h2>
            </div>
          </div>

          <div className="port-contract-modal__investor">
            <span>투자자</span>
            <strong>{player.name}</strong>
            <small>보유 현금 {formatMoney(player.money)}</small>
          </div>
        </header>

        {activeContract && activeDefinition ? (
          <div className="port-contract-modal__active-document">
            <div className="port-contract-document">
              <header className="port-contract-document__heading">
                <div>
                  <small>EXPORT INVESTMENT AGREEMENT</small>
                  <h3>수출투자 계약 체결서</h3>
                </div>
                <strong>계약 유지 중</strong>
              </header>

              <dl className="port-contract-document__identity">
                <div>
                  <dt>투자자</dt>
                  <dd>{player.name}</dd>
                </div>
                <div>
                  <dt>계약 상품</dt>
                  <dd>{activeDefinition.name}</dd>
                </div>
                <div>
                  <dt>투자금</dt>
                  <dd>{formatMoney(activeDefinition.investmentAmount)}</dd>
                </div>
                <div>
                  <dt>계약 체결</dt>
                  <dd>{activeContract.purchasedTurn}턴</dd>
                </div>
                <div>
                  <dt>정산 시점</dt>
                  <dd>{activeContract.settlesAfterTurn}턴 종료</dd>
                </div>
                <div>
                  <dt>기본 성공률</dt>
                  <dd>{formatRate(activeDefinition.baseSuccessChance)}</dd>
                </div>
              </dl>

              <section className="port-contract-document__clauses">
                <h4>계약 조건</h4>
                <p>
                  본 계약은 울산항을 통한 화물 수출 운송 사업에 투자하는
                  계약이며, 정산 시 시장 및 재난 보정이 최종 성공률에
                  반영됩니다.
                </p>
                <p>
                  운송 성공 시 {formatMoney(activeDefinition.successPayout)},
                  실패 시 {formatMoney(activeDefinition.failurePayout)}을
                  지급합니다.
                </p>
              </section>

              <footer className="port-contract-document__signature">
                <div>
                  <span>투자자 서명</span>
                  <strong>{player.name}</strong>
                </div>
                <div>
                  <span>울산항 계약 승인</span>
                  <strong>ULSAN PORT</strong>
                </div>
              </footer>

              <div
                className="port-contract-document__stamp is-visible"
                aria-hidden="true"
              >
                <span>CONTRACTED</span>
                <strong>체결 완료</strong>
                <small>ULSAN PORT</small>
              </div>
            </div>
          </div>
        ) : (
          <div className="port-contract-modal__workspace">
            <aside className="port-contract-modal__products">
              <div className="port-contract-modal__products-title">
                <span>투자 상품</span>
                <strong>화물 운송 계약 선택</strong>
              </div>

              {contractDefinitions.map((contract, index) => {
                const isSelected = selectedType === contract.type;
                const canAfford =
                  player.money >= contract.investmentAmount;

                return (
                  <button
                    key={contract.type}
                    type="button"
                    className={[
                      "port-contract-product",
                      isSelected ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isSigning}
                    onClick={() => handleSelect(contract.type)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{contract.name}</strong>
                      <small>
                        {getRiskLabel(contract.baseSuccessChance)} · 성공률{" "}
                        {formatRate(contract.baseSuccessChance)}
                      </small>
                    </div>
                    <b className={canAfford ? "" : "is-insufficient"}>
                      {formatMoney(contract.investmentAmount)}
                    </b>
                  </button>
                );
              })}

              <div className="port-contract-modal__market-note">
                <strong>시장·재난 보정</strong>
                <p>
                  태풍 발생 시 성공률 -15%p, 최근 조선·해양 테마 상승 시
                  +5%p가 적용됩니다.
                </p>
              </div>
            </aside>

            {selectedContract && (
              <div className="port-contract-document">
                <header className="port-contract-document__heading">
                  <div>
                    <small>EXPORT INVESTMENT AGREEMENT</small>
                    <h3>수출투자 계약서</h3>
                  </div>
                  <strong>{contractNumber}</strong>
                </header>

                <div className="port-contract-document__title">
                  <span>계약 상품</span>
                  <h4>{selectedContract.name}</h4>
                  <p>{selectedContract.description}</p>
                </div>

                <dl className="port-contract-document__identity">
                  <div>
                    <dt>투자자</dt>
                    <dd>{player.name}</dd>
                  </div>
                  <div>
                    <dt>투자금</dt>
                    <dd>{formatMoney(selectedContract.investmentAmount)}</dd>
                  </div>
                  <div>
                    <dt>계약 기간</dt>
                    <dd>{PORT_CONTRACT_DURATION_TURNS}턴</dd>
                  </div>
                  <div>
                    <dt>기본 성공률</dt>
                    <dd>{formatRate(selectedContract.baseSuccessChance)}</dd>
                  </div>
                </dl>

                <section className="port-contract-document__settlement">
                  <div className="is-success">
                    <span>운송 성공 시 지급</span>
                    <strong>
                      {formatMoney(selectedContract.successPayout)}
                    </strong>
                    <small>
                      순수익{" "}
                      {formatMoney(
                        selectedContract.successPayout -
                          selectedContract.investmentAmount,
                      )}
                    </small>
                  </div>
                  <div className="is-failure">
                    <span>운송 실패 시 지급</span>
                    <strong>
                      {formatMoney(selectedContract.failurePayout)}
                    </strong>
                    <small>
                      순손익{" "}
                      {formatMoney(
                        selectedContract.failurePayout -
                          selectedContract.investmentAmount,
                      )}
                    </small>
                  </div>
                </section>

                <section className="port-contract-document__clauses">
                  <h4>투자 위험 및 계약 조건</h4>
                  <ol>
                    <li>
                      계약은 체결 후 {PORT_CONTRACT_DURATION_TURNS}턴이 지난
                      시점에 일괄 정산합니다.
                    </li>
                    <li>
                      최종 성공률은 시장 뉴스, 조선·해양 테마 및 재난
                      효과에 따라 변경될 수 있습니다.
                    </li>
                    <li>
                      한 플레이어는 동시에 하나의 수출투자 계약만 유지할
                      수 있습니다.
                    </li>
                    <li>
                      파산 시 아직 정산되지 않은 계약은 별도 보상 없이
                      소멸합니다.
                    </li>
                  </ol>
                </section>

                <footer className="port-contract-document__signature">
                  <div>
                    <span>투자자 서명</span>
                    <strong>
                      {signaturePhase === "IDLE"
                        ? "서명 대기"
                        : player.name}
                    </strong>
                  </div>
                  <div>
                    <span>계약 승인 기관</span>
                    <strong>울산항만공사</strong>
                  </div>
                </footer>

                <button
                  type="button"
                  className="port-contract-document__sign"
                  disabled={
                    player.money <
                      selectedContract.investmentAmount || isSigning
                  }
                  onClick={handleSign}
                >
                  {player.money <
                    selectedContract.investmentAmount &&
                    "투자금 부족"}
                  {player.money >=
                    selectedContract.investmentAmount &&
                    signaturePhase === "IDLE" &&
                    "계약서에 서명하고 투자"}
                  {signaturePhase === "SIGNING" && "전자서명 처리 중"}
                  {signaturePhase === "SIGNED" && "계약 체결 완료"}
                </button>

                <div
                  className="port-contract-document__stamp"
                  aria-hidden="true"
                >
                  <span>CONTRACTED</span>
                  <strong>계약 체결</strong>
                  <small>ULSAN PORT</small>
                </div>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="port-contract-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        <footer className="port-contract-modal__footer">
          <button
            type="button"
            disabled={isSigning}
            onClick={onClose}
          >
            {activeContract ? "계약 확인" : "투자하지 않기"}
          </button>
        </footer>
      </section>
    </div>
  );
}
