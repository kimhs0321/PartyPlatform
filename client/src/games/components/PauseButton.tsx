type PauseButtonProps = {
  paused: boolean;
  onClick: () => void;
};

export default function PauseButton({ paused, onClick }: PauseButtonProps) {
  return (
    <button className="liar-pause-button" onClick={onClick}>
      {paused ? "▶ 계속하기" : "⏸ 일시정지"}
    </button>
  );
}