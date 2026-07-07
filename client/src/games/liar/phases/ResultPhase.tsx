import type { ClientLiarGameState } from "../../../../../shared/types/liar/liarGame";
import PauseButton from "../../components/PauseButton";
import { formatScore } from "../utils/liarHelpers";
import ScoreChange from "../../components/ScoreChange";

type ResultPhaseProps = {
  state: ClientLiarGameState;
  remainingSeconds: number;
  paused: boolean;
  onTogglePause: () => void;
};

export default function ResultPhase({
  state,
  remainingSeconds,
  paused,
  onTogglePause,
}: ResultPhaseProps) {
  const liarPlayer = state.players.find((player) =>
    state.liarPlayerIds.includes(player.playerId)
  );

  const sortedPlayers = [...state.players].sort(
    (a, b) =>
      (state.voteCounts[b.playerId] ?? 0) -
      (state.voteCounts[a.playerId] ?? 0)
  );

  const scoreChangedPlayers = [...state.players]
    .filter((player) => player.scoreDelta !== 0)
    .sort((a, b) => {
      if (b.scoreDelta !== a.scoreDelta) {
        return b.scoreDelta - a.scoreDelta;
      }

      return b.score - a.score;
    });

    const scoreChangeItems = scoreChangedPlayers.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      before: player.score - player.scoreDelta,
      change: player.scoreDelta,
      reasons: player.scoreReasons,
    }));

  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">
          Round {state.round} Result
        </span>

        <h1 className="liar-result-title">
          {state.resultMessage}
        </h1>

        <div className="liar-result-info">
          <div className="liar-result-card">
            <span>🕵️ 라이어</span>
            <strong className="liar-name">{liarPlayer?.name}</strong>
          </div>

          <div className="liar-result-card">
            <span>📝 시민 제시어</span>
            <strong>{state.citizenKeyword}</strong>
          </div>

          <div className="liar-result-card">
            <span>❓ 라이어 추측</span>
            <strong>{state.liarGuess ?? "-"}</strong>
          </div>
        </div>

        <div className="liar-panel-title">
          득표 결과
        </div>

        <div className="liar-result-list">
          {sortedPlayers.map((player) => {
            const voteCount = state.voteCounts[player.playerId] ?? 0;
            const isTop = state.topVotedPlayerIds.includes(player.playerId);
            const isLiar = state.liarPlayerIds.includes(player.playerId);

            return (
              <div
                key={player.playerId}
                className={`liar-result-row ${isTop ? "selected" : ""} ${
                  isLiar ? "liar" : ""
                }`}
              >
                <strong>{player.name}</strong>

                <span>{voteCount}표</span>

                {isTop && <span>🎯 최다 득표</span>}
                {isLiar && <span>🕵️ 라이어</span>}
              </div>
            );
          })}
        </div>

        <ScoreChange
          items={scoreChangeItems}
        />

        <p className="liar-next-round">
          다음 라운드 시작까지
        </p>

        <div className="liar-countdown">
          {remainingSeconds}
        </div>

        <PauseButton
          paused={paused}
          onClick={onTogglePause}
        />
      </section>
    </div>
  );
}