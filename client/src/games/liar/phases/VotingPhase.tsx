import type { ClientLiarGameState } from "../../../../../shared/types/liar/liarGame";
import PauseButton from "../../components/PauseButton";

type VotingPhaseProps = {
  state: ClientLiarGameState;
  myPlayerId: string;
  remainingSeconds: number;
  paused: boolean;
  onVote: (targetId: string) => void;
  onTogglePause: () => void;
};

export default function VotingPhase({
  state,
  myPlayerId,
  remainingSeconds,
  paused,
  onVote,
  onTogglePause,
}: VotingPhaseProps) {
  const isRevote = state.phase === "REVOTE";

  const votePlayers = isRevote
    ? state.players.filter((player) =>
        state.tieCandidates.includes(player.playerId)
      )
    : state.players;

  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">{isRevote ? "재투표" : "투표"}</span>

        <h2>{isRevote ? "동점 후보 중 다시 지목하세요" : "라이어를 지목하세요"}</h2>

        <p>
          {isRevote
            ? "최후 변론을 듣고 다시 투표하세요."
            : "가장 수상한 플레이어를 선택하세요."}
        </p>

        <div className="liar-countdown">{remainingSeconds}</div>

        <PauseButton paused={paused} onClick={onTogglePause} />

        <div className="liar-vote-list">
          {votePlayers
            .filter((player) => player.playerId !== myPlayerId)
            .map((player) => (
              <button
                key={player.playerId}
                className="liar-vote-button"
                disabled={Boolean(state.votes[myPlayerId])}
                onClick={() => onVote(player.playerId)}
              >
                {player.name}
              </button>
            ))}
        </div>

        {state.votes[myPlayerId] && (
          <p>{isRevote ? "재투표를 완료했습니다." : "투표를 완료했습니다."}</p>
        )}
      </section>
    </div>
  );
}