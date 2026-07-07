import type { ClientLiarGameState } from "../../../../../shared/types/liar/liarGame";
import PauseButton from "../../components/PauseButton";

type TieSpeechPhaseProps = {
  players: ClientLiarGameState["players"];
  tieCandidates: string[];
  remainingSeconds: number;
  paused: boolean;
  onTogglePause: () => void;
};

export default function TieSpeechPhase({
  players,
  tieCandidates,
  remainingSeconds,
  paused,
  onTogglePause,
}: TieSpeechPhaseProps) {
  const tiePlayers = players.filter((player) =>
    tieCandidates.includes(player.playerId)
  );

  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">동점 발생</span>

        <h2>최후 변론 시간입니다</h2>

        <p>동점 후보들은 자신이 라이어가 아님을 설명하세요.</p>

        <div className="liar-countdown">{remainingSeconds}</div>

        <PauseButton paused={paused} onClick={onTogglePause} />

        <div className="liar-vote-list">
          {tiePlayers.map((player) => (
            <div className="liar-result-row selected" key={player.playerId}>
              <strong>{player.name}</strong>
              <span>동점 후보</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}