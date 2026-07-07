import PauseButton from "../../components/PauseButton";

type ReadyPhaseProps = {
  myKeyword: string | null;
  remainingSeconds: number;
  paused: boolean;
  onTogglePause: () => void;
};

export default function ReadyPhase({
  myKeyword,
  remainingSeconds,
  paused,
  onTogglePause,
}: ReadyPhaseProps) {
  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">라이어 게임</span>
        <h2>제시어를 확인하세요</h2>

        <div className="liar-keyword-card">
          <span>내 제시어</span>
          <strong>{myKeyword}</strong>
        </div>

        <p>잠시 후 설명 단계가 시작됩니다.</p>

        <div className="liar-countdown">{remainingSeconds}</div>

        <PauseButton paused={paused} onClick={onTogglePause} />
      </section>
    </div>
  );
}
