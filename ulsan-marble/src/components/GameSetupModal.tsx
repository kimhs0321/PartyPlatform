import "./GameSetupModal.css";

import type { GameRoundLimit } from "../game/endGame/endGameTypes";

interface GameSetupModalProps {
  open: boolean;
  selectedRoundLimit: GameRoundLimit;
  onSelectRoundLimit: (roundLimit: GameRoundLimit) => void;
  onStart: () => void;
}

const ROUND_OPTIONS: Array<{
  value: GameRoundLimit;
  label: string;
  description: string;
}> = [
  { value: 30, label: "빠른 경기", description: "30라운드" },
  { value: 50, label: "기본 경기", description: "50라운드" },
  { value: 70, label: "장기 경기", description: "70라운드" },
  {
    value: null,
    label: "무제한 생존전",
    description: "마지막 생존자까지",
  },
];

export function GameSetupModal({
  open,
  selectedRoundLimit,
  onSelectRoundLimit,
  onStart,
}: GameSetupModalProps) {
  if (!open) return null;

  return (
    <div className="game-setup-modal" role="dialog" aria-modal="true" aria-labelledby="game-setup-title">
      <section className="game-setup-modal__panel">
        <header>
          <span>게임 설정</span>
          <h2 id="game-setup-title">게임 방식 선택</h2>
          <p>제한 라운드 경기 또는 마지막 한 명이 남을 때까지 진행하는 무제한 생존전을 선택합니다.</p>
        </header>

        <div className="game-setup-modal__options" role="radiogroup" aria-label="게임 방식">
          {ROUND_OPTIONS.map((option) => (
            <button
              key={option.value ?? "UNLIMITED"}
              type="button"
              role="radio"
              aria-checked={selectedRoundLimit === option.value}
              className={selectedRoundLimit === option.value ? "is-selected" : ""}
              onClick={() => onSelectRoundLimit(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {option.value === 50 && <small>기본값</small>}
            </button>
          ))}
        </div>

        <div className="game-setup-modal__rule">
          <strong>{selectedRoundLimit === null ? "무제한 모드" : "조기 종료"}</strong>
          <span>
            {selectedRoundLimit === null
              ? "라운드 제한과 최종 자산 판정 없이 마지막 생존자 한 명이 남을 때까지 진행합니다."
              : "제한 라운드 전이라도 생존자가 한 명만 남으면 즉시 승리합니다."}
          </span>
        </div>

        <button type="button" className="game-setup-modal__start" onClick={onStart}>
          {selectedRoundLimit === null
            ? "무제한 생존전 시작"
            : `${selectedRoundLimit}라운드 경기 시작`}
        </button>
      </section>
    </div>
  );
}
