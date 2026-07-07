type ScorePlayer = {
  playerId: string;
  name: string;
  score: number;
};

type ScoreBoardProps = {
  players: ScorePlayer[];
  formatScore: (score: number) => string;
  title?: string;
};

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return `${index + 1}`;
  }
};

export default function ScoreBoard({
  players,
  formatScore,
  title = "점수판",
}: ScoreBoardProps) {
  return (
    <aside className="liar-side-panel">
      <div className="liar-panel-title">{title}</div>

      <div className="liar-score-header">
        <span className="col-rank">순위</span>
        <span className="col-name">참여자</span>
        <span className="col-score">점수</span>
      </div>

      <div className="liar-score-list">
        {players.map((player, index) => (
          <div className="liar-score-row" key={player.playerId}>
            <span className="liar-rank">{getRankIcon(index)}</span>
            <span className="liar-score-name">{player.name}</span>
            <span className="liar-score-value">{formatScore(player.score)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}