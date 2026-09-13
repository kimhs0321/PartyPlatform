import { useEffect, useMemo, useState } from "react";

import type { PlayerTokenData } from "./PlayerToken";
import type { PendingPortSettlement } from "../game/port/portTypes";
import "./PortSettlementModal.css";

interface PortSettlementModalProps {
  settlement: PendingPortSettlement | null;
  players: PlayerTokenData[];
  canConfirm: boolean;
  onConfirm: () => void;
}

const RESULT_REVEAL_INTERVAL = 420;

function formatMoney(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function PortSettlementModal({
  settlement,
  players,
  canConfirm,
  onConfirm,
}: PortSettlementModalProps) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);

    if (!settlement) return;

    const timerIds = settlement.results.map((_, index) =>
      window.setTimeout(() => {
        setRevealedCount(index + 1);
      }, 450 + index * RESULT_REVEAL_INTERVAL),
    );

    return () => {
      timerIds.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [settlement]);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  if (!settlement) return null;

  const isComplete =
    revealedCount >= settlement.results.length;

  return (
    <div className="port-settlement-overlay" role="dialog" aria-modal="true">
      <section className="port-settlement-modal">
        <header className="port-settlement-modal__header">
          <div>
            <small>ULSAN PORT EXPORT SETTLEMENT</small>
            <h2>울산항 수출 정산 명세서</h2>
          </div>
          <strong>{settlement.turnNumber}턴 정산</strong>
        </header>

        <div className="port-settlement-modal__manifest">
          <div className="port-settlement-modal__manifest-header">
            <span>계약자 / 화물 계약</span>
            <span>성공률</span>
            <span>지급액</span>
            <span>순손익</span>
            <span>결과</span>
          </div>

          {settlement.results.map((result, index) => {
            const player = playerMap.get(result.contract.playerId);
            const isRevealed = index < revealedCount;

            return (
              <article
                key={result.contract.id}
                className={[
                  isRevealed ? "is-revealed" : "",
                  result.success ? "is-success" : "is-failure",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="port-settlement-result__contract">
                  <span
                    style={{
                      ["--player-color" as string]:
                        player?.color ?? "#66808b",
                    }}
                  >
                    {player?.shortName ?? "?"}
                  </span>
                  <div>
                    <strong>
                      {player?.name ?? result.contract.playerId}
                    </strong>
                    <small>{result.definition.name}</small>
                  </div>
                </div>

                <strong>
                  {isRevealed
                    ? formatRate(result.finalSuccessChance)
                    : "심사 중"}
                </strong>
                <strong>
                  {isRevealed
                    ? formatMoney(result.payoutAmount)
                    : "—"}
                </strong>
                <strong>
                  {isRevealed
                    ? formatMoney(result.netProfit)
                    : "—"}
                </strong>

                <b>
                  {isRevealed
                    ? result.success
                      ? "운송 성공"
                      : "운송 실패"
                    : "대기"}
                </b>

                <div className="port-settlement-result__modifiers">
                  {isRevealed &&
                    (result.modifiers.length === 0 ? (
                      <span>확률 보정 없음</span>
                    ) : (
                      result.modifiers.map((modifier) => (
                        <span key={modifier.type}>
                          {modifier.label}{" "}
                          {modifier.chanceDelta > 0 ? "+" : ""}
                          {Math.round(modifier.chanceDelta * 100)}%p
                        </span>
                      ))
                    ))}
                </div>

                <div
                  className="port-settlement-result__stamp"
                  aria-hidden="true"
                >
                  <span>
                    {result.success ? "SUCCESS" : "FAILED"}
                  </span>
                  <strong>
                    {result.success ? "수출 완료" : "운송 실패"}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>

        <section className="port-settlement-modal__notice">
          <strong>
            {isComplete ? "정산 심사 완료" : "화물 운송 결과 확인 중"}
          </strong>
          <p>
            계약별 성공 확률에 현재 시장 상황과 재난 효과를 반영한 최종
            결과입니다.
          </p>
        </section>

          <button
            type="button"
            className="port-settlement-modal__confirm"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {canConfirm
              ? "정산 확인"
              : "정산 확인 대기 중"}
          </button>
      </section>
    </div>
  );
}
