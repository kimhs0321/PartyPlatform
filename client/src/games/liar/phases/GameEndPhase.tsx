import type { ClientLiarGameState } from "../../../../../shared/types/liar/liarGame";

type GameEndPhaseProps = {
  players: ClientLiarGameState["players"];
};

export default function GameEndPhase({ players }: GameEndPhaseProps) {
  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = rankedPlayers[0];

  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">Game End</span>

        <h1 className="liar-result-title">🏆 게임 종료</h1>

        <div className="liar-result-card">
          <span>최종 우승자</span>
          <strong className="liar-name">{winner?.name}</strong>
        </div>

        <div className="liar-panel-title">최종 순위</div>

        <div className="liar-result-list">
          {rankedPlayers.map((player, index) => (
            <div
              className={`liar-result-row ${index === 0 ? "selected" : ""}`}
              key={player.playerId}
            >
              <strong>
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `${index + 1}위`}{" "}
                {player.name}
              </strong>

              <span>{formatScore(player.score)}점</span>
            </div>
          ))}
        </div>

        <p className="liar-next-round">
          방장이 게임 종료 버튼을 누르면 대기실로 돌아갑니다.
        </p>
      </section>
    </div>
  );
}

function formatScore(score: number) {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}