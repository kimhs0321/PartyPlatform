import PauseButton from "../../components/PauseButton";

type LiarGuessPhaseProps = {
  amILiar: boolean;
  guessText: string;
  paused: boolean;
  onChangeGuess: (value: string) => void;
  onSubmitGuess: () => void;
  onTogglePause: () => void;
};

export default function LiarGuessPhase({
  amILiar,
  guessText,
  paused,
  onChangeGuess,
  onSubmitGuess,
  onTogglePause,
}: LiarGuessPhaseProps) {
  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">라이어 추측</span>

        {amILiar ? (
          <>
            <h2>시민의 제시어를 맞혀보세요.</h2>

            <input
              className="liar-guess-input"
              value={guessText}
              onChange={(e) => onChangeGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guessText.trim()) {
                  onSubmitGuess();
                }
              }}
              placeholder="제시어 입력"
            />

            <button
              className="liar-guess-button"
              disabled={!guessText.trim()}
              onClick={onSubmitGuess}
            >
              확인
            </button>
          </>
        ) : (
          <>
            <h2>라이어가 제시어를 추측하고 있습니다.</h2>
            <p>잠시 기다려 주세요.</p>
          </>
        )}

        <PauseButton paused={paused} onClick={onTogglePause} />
      </section>
    </div>
  );
}