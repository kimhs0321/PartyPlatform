import "./ScoreChange.css";

export type ScoreChangeItem = {
  playerId: string;
  name: string;
  before: number;
  change: number;
  reasons?: string[];
};

type ScoreChangeProps = {
  title?: string;
  items: ScoreChangeItem[];
};

export default function ScoreChange({
  title = "점수 변화",
  items,
}: ScoreChangeProps) {
  return (
    <section className="score-change-panel">
      <div className="score-change-title">{title}</div>

      <div className="score-change-header">
        <span>참여자</span>
        <span>변화</span>
        <span>결과</span>
      </div>

      <div className="score-change-list">
        {items.length === 0 ? (
          <div className="score-change-empty">점수 변화가 없습니다.</div>
        ) : (
          items.map((item) => {
            const after = item.before + item.change;
            const changeText =
                item.change > 0 ? `+${item.change}` : `${item.change}`;

            return (
                <div className="score-change-row" key={item.playerId}>
                <div className="score-change-main">
                    <span className="score-change-name">{item.name}</span>

                    <strong
                    className={`score-change-value ${
                        item.change > 0 ? "plus" : item.change < 0 ? "minus" : "zero"
                    }`}
                    >
                    {changeText}
                    </strong>

                    <span className="score-change-result">
                    {item.before} → {after}
                    </span>
                </div>

                {item.reasons && item.reasons.length > 0 && (
                    <ul className="score-change-reasons">
                    {item.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                    </ul>
                )}
                </div>
            );
            })
        )}
      </div>
    </section>
  );
}