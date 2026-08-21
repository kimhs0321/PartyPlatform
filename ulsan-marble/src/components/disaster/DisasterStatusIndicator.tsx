import type { ActiveDisasterPenalty } from "../../game/disaster/disasterTypes";
import "./DisasterStatusIndicator.css";

interface DisasterStatusIndicatorProps {
  penalties: ActiveDisasterPenalty[];
  turnNumber: number;
}

export function DisasterStatusIndicator({
  penalties,
  turnNumber,
}: DisasterStatusIndicatorProps) {
  if (penalties.length === 0) return null;

  const nearestExpiry = Math.min(
    ...penalties.map((penalty) => penalty.expiresAfterTurn),
  );
  const remainingTurns = Math.max(0, nearestExpiry - turnNumber + 1);
  const disasterNames = [...new Set(penalties.map((penalty) => penalty.disasterName))];

  return (
    <aside className="disaster-status-indicator">
      <div>
        <small>재난 영향</small>
        <strong>{disasterNames.join(" · ")}</strong>
      </div>
      <span>
        통행료 감소 {penalties.length}곳 · 최소 {remainingTurns}턴 남음
      </span>
    </aside>
  );
}
