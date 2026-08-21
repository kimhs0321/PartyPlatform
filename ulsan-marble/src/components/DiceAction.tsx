import type { TurnPhase } from "../game/turn/turnTypes";
import "./DiceAction.css";


interface DiceActionProps {
  phase: TurnPhase;
  onRoll: () => void;
  disabled?: boolean;
}

function getButtonLabel(phase: TurnPhase): string {
  switch (phase) {
    case "ROLLING_DICE":
      return "주사위 굴리는 중...";
    case "MOVING":
    case "ARRIVED":
      return "이동 중...";
    case "RESOLVING_TILE":
      return "칸 처리 중...";
    case "RESOLVING_TAX":
      return "세금 정산 중...";
    case "RESOLVING_MARKET":
      return "부동산 시세 정산 중...";
    case "RESOLVING_STOCK_MARKET":
      return "주식 시세 정산 중...";
    case "STOCK_TRADING":
      return "주식 거래 단계";
    default:
      return "주사위 굴리기";
  }
}

export function DiceAction({ phase, onRoll, disabled = false }: DiceActionProps) {
  if (phase === "STOCK_TRADING") return null;

  const canRoll = phase === "WAITING_FOR_ROLL" && !disabled;

  return (
    <div className="dice-action">
      <button
        type="button"
        className="dice-roll-button"
        onClick={onRoll}
        disabled={!canRoll}
      >
        {getButtonLabel(phase)}
      </button>
    </div>
  );
}
