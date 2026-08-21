import { useEffect, useMemo, useState } from "react";

import type { PlayerTokenData } from "./PlayerToken";
import type { LottoDrawResult } from "../game/lottery/lotteryTypes";
import "./LottoDrawModal.css";

interface LottoDrawModalProps {
  result: LottoDrawResult | null;
  players: PlayerTokenData[];
  devMode: boolean;

  canConfirm: boolean;

  onConfirm: () => void;
}

const BALL_REVEAL_INTERVAL = 420;
const RESULT_REVEAL_DELAY = 450;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getLottoBallClass(number: number): string {
  if (number <= 10) return "is-yellow";
  if (number <= 20) return "is-blue";
  if (number <= 30) return "is-red";
  if (number <= 40) return "is-gray";
  return "is-green";
}

export function LottoDrawModal({
  result,
  players,
  devMode,
  canConfirm,
  onConfirm,
}: LottoDrawModalProps) {
  const [revealedBallCount, setRevealedBallCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setRevealedBallCount(0);
    setShowResults(false);

    if (!result) return;

    const timerIds: number[] = [];

    result.winningNumbers.forEach((_, index) => {
      timerIds.push(
        window.setTimeout(() => {
          setRevealedBallCount(index + 1);
        }, 500 + index * BALL_REVEAL_INTERVAL),
      );
    });

    timerIds.push(
      window.setTimeout(
        () => {
          setShowResults(true);
        },
        500 +
          result.winningNumbers.length * BALL_REVEAL_INTERVAL +
          RESULT_REVEAL_DELAY,
      ),
    );

    return () => {
      timerIds.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, [result]);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  if (!result) return null;

  const winningTickets = result.ticketResults
    .filter((ticket) => ticket.prizeAmount > 0)
    .sort((first, second) => {
      if (first.matchCount !== second.matchCount) {
        return second.matchCount - first.matchCount;
      }
      return second.prizeAmount - first.prizeAmount;
    });
  const hasJackpotWinner = result.ticketResults.some(
    (ticket) => ticket.matchCount === 6,
  );
  const drawComplete =
    revealedBallCount >= result.winningNumbers.length;

  return (
    <div className="lotto-draw-overlay" role="dialog" aria-modal="true">
      <section className="lotto-draw-modal">
        <header className="lotto-draw-modal__broadcast-header">
          <div>
            <span>
              {devMode ? "DEV DRAW" : "LIVE DRAW"}
            </span>
            <h2>제{result.drawNumber}회 울산 로또</h2>
          </div>

          <strong>
            판매 티켓 {result.totalTicketCount}장
          </strong>
        </header>

        <div className="lotto-draw-modal__studio">
          <div className="lotto-draw-machine" aria-hidden="true">
            <div className="lotto-draw-machine__drum">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="lotto-draw-machine__base">
              ULSAN LOTTO 6/45
            </div>
          </div>

          <div className="lotto-draw-stage">
            <span>당첨 번호</span>

            <div
              className="lotto-draw-numbers"
              aria-label="당첨 번호"
            >
              {result.winningNumbers.map((number, index) => (
                <b
                  key={`${number}-${index}`}
                  className={[
                    "lotto-draw-ball",
                    getLottoBallClass(number),
                    index < revealedBallCount
                      ? "is-revealed"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {index < revealedBallCount ? number : "?"}
                </b>
              ))}
            </div>

            <small>
              {drawComplete
                ? "6개 번호 추첨 완료"
                : `${revealedBallCount + 1}번째 번호 추첨 중`}
            </small>
          </div>
        </div>

        <div
          className={`lotto-draw-summary${
            showResults ? " is-visible" : ""
          }`}
        >
          <div className="lotto-draw-jackpot">
            <span>
              {hasJackpotWinner
                ? "1등 당첨자 발생"
                : "1등 당첨자 없음"}
            </span>

            <strong>{formatMoney(result.jackpotBefore)}</strong>

            <small>
              {hasJackpotWinner
                ? `다음 회차 기본 당첨금 ${formatMoney(
                    result.jackpotAfter,
                  )}`
                : `다음 회차 이월금 ${formatMoney(
                    result.jackpotAfter,
                  )}`}
            </small>
          </div>

          <div className="lotto-draw-results">
            <div className="lotto-draw-results__heading">
              <h3>당첨 티켓</h3>
              <span>{winningTickets.length}장</span>
            </div>

            {winningTickets.length === 0 ? (
              <p>3개 이상 일치한 티켓이 없습니다.</p>
            ) : (
              winningTickets.map((ticket) => (
                <article key={ticket.ticketId}>
                  <div className="lotto-draw-results__player">
                    <span
                      style={{
                        ["--player-color" as string]:
                          playerMap.get(ticket.playerId)?.color ??
                          "#5f7180",
                      }}
                    >
                      {playerMap.get(ticket.playerId)?.shortName ??
                        "?"}
                    </span>

                    <div>
                      <strong>
                        {playerMap.get(ticket.playerId)?.name ??
                          ticket.playerId}
                      </strong>
                      <small>{ticket.matchCount}개 일치</small>
                    </div>
                  </div>

                  <div className="lotto-draw-results__numbers">
                    {ticket.numbers.map((number) => (
                      <b
                        key={number}
                        className={[
                          getLottoBallClass(number),
                          result.winningNumbers.includes(number)
                            ? "is-match"
                            : "is-unmatched",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {number}
                      </b>
                    ))}
                  </div>

                  <strong>{formatMoney(ticket.prizeAmount)}</strong>
                </article>
              ))
            )}
          </div>
        </div>

        <footer>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              !showResults ||
              !canConfirm
            }
          >
            {!showResults
              ? "추첨 진행 중"
              : canConfirm
                ? "추첨 결과 확인"
                : "현재 플레이어의 확인을 기다리는 중"}
          </button>
        </footer>
      </section>
    </div>
  );
}
