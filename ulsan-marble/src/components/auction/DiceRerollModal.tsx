import type { PlayerTokenData } from "../PlayerToken";
import type { PendingDiceReroll } from "../../game/auction/auctionTypes";
import "./DiceRerollModal.css";

interface DiceRerollModalProps {
  pending: PendingDiceReroll | null;
  player: PlayerTokenData | null;
  onKeep: () => void;
  onReroll: () => void;
}

const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function DiceRerollModal({
  pending,
  player,
  onKeep,
  onReroll,
}: DiceRerollModalProps) {
  if (!pending || !player) return null;

  const [first, second] = pending.diceValues;

  return (
    <div className="dice-reroll-overlay">
      <section
        className="dice-reroll-modal"
        role="dialog"
        aria-modal="true"
      >
        <header className="dice-reroll-modal__header">
          <span>AUCTION ITEM ACTIVATION</span>
          <strong>주사위 재굴림권</strong>
        </header>

        <div className="dice-reroll-modal__ticket">
          <div className="dice-reroll-modal__owner">
            <span
              style={{
                ["--player-color" as string]: player.color,
              }}
            >
              {player.shortName}
            </span>
            <div>
              <small>아이템 사용자</small>
              <strong>{player.name}</strong>
            </div>
          </div>

          <h2>현재 주사위를 다시 굴릴까요?</h2>

          <div className="dice-reroll-modal__dice">
            <span>{DICE[first]}</span>
            <b>+</b>
            <span>{DICE[second]}</span>
          </div>

          <div className="dice-reroll-modal__total">
            <span>현재 합계</span>
            <strong>{first + second}</strong>
          </div>

          <p>
            재굴림을 선택하면 현재 결과는 취소되며,
            새로 나온 두 주사위 결과를 반드시 적용합니다.
          </p>
        </div>

        <div className="dice-reroll-modal__actions">
          <button type="button" onClick={onKeep}>
            현재 결과 유지
          </button>
          <button
            type="button"
            className="is-primary"
            onClick={onReroll}
          >
            아이템 사용 후 재굴림
          </button>
        </div>
      </section>
    </div>
  );
}
