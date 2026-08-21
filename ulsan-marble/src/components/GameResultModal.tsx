import "./GameResultModal.css";

import type { GameResult } from "../game/endGame/endGameTypes";

interface GameResultModalProps {
  result: GameResult | null;
  onRestart: () => void;
  onReturnToSetup: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

export function GameResultModal({
  result,
  onRestart,
  onReturnToSetup,
}: GameResultModalProps) {
  if (!result) return null;

  const winners = result.rankings.filter((entry) =>
    result.winnerPlayerIds.includes(entry.playerId),
  );
  const winnerText = winners.map((winner) => winner.playerName).join(" · ");

  return (
    <div className="game-result-modal" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
      <section className="game-result-modal__panel">
        <header>
          <span>{result.reason === "LAST_SURVIVOR" ? "최후의 생존자" : `${result.completedRound}라운드 종료`}</span>
          <h2 id="game-result-title">{winnerText || "승자 없음"}</h2>
          <p>
            {result.winnerPlayerIds.length > 1
              ? "최종 자산과 모든 동점 기준이 같아 공동 우승입니다."
              : result.reason === "LAST_SURVIVOR"
                ? "다른 모든 플레이어가 파산하여 즉시 승리했습니다."
                : "최종 자산이 가장 높은 플레이어가 승리했습니다."}
          </p>
        </header>

        <div className="game-result-modal__table-wrap">
          <table>
            <thead>
              <tr>
                <th>순위</th>
                <th>플레이어</th>
                <th>최종 자산</th>
                <th>현금·예금</th>
                <th>적금 원금</th>
                <th>주식</th>
                <th>부동산 매각가</th>
                <th>항구 회수액</th>
              </tr>
            </thead>
            <tbody>
              {result.rankings.map((entry) => (
                <tr key={entry.playerId} className={result.winnerPlayerIds.includes(entry.playerId) ? "is-winner" : ""}>
                  <td>{entry.rank}위</td>
                  <td>
                    <span className="game-result-modal__player-mark" style={{ background: entry.playerColor }} />
                    {entry.playerName}
                  </td>
                  <td><strong>{formatMoney(entry.totalAssets)}</strong></td>
                  <td>{formatMoney(entry.liquidAssets)}</td>
                  <td>{formatMoney(entry.savingsPrincipal)}</td>
                  <td>{formatMoney(entry.stockValue)}</td>
                  <td>{formatMoney(entry.propertySaleValue)}</td>
                  <td>{formatMoney(entry.portRecoveryValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <small className="game-result-modal__tie-rule">
          동점 판정: 최종 자산 → 현금+일반예금 → 부동산 매각가 → 주식 평가액 → 공동 우승
        </small>

        <div className="game-result-modal__actions">
          <button type="button" className="game-result-modal__secondary" onClick={onReturnToSetup}>
            설정으로 돌아가기
          </button>
          <button type="button" className="game-result-modal__primary" onClick={onRestart}>
            같은 설정으로 다시 시작
          </button>
        </div>
      </section>
    </div>
  );
}
