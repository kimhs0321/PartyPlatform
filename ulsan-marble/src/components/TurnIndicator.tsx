import type { TurnPhase } from "../game/turn/turnTypes";
import "./TurnIndicator.css";

import type { BoardTile } from "../types";
import type { PlayerTokenData } from "./PlayerToken";

interface TurnIndicatorProps {
  turnNumber: number;
  roundLimit?: number;
  phase: TurnPhase;
  player: PlayerTokenData;
  tile: BoardTile;
  lastMove: number | null;
}

function getTurnStatus(
  phase: TurnPhase,
  tile: BoardTile,
  lastMove: number | null,
): string {
  switch (phase) {
    case "ROLLING_DICE":
      return "주사위 굴리는 중";
    case "RESOLVING_JAIL":
      return "구치소 처리 중";
    case "MOVING":
      return `${lastMove ?? 0}칸 이동 중`;
    case "ARRIVED":
      return `${tile.name} 도착`;
    case "RESOLVING_TILE":
      return `${tile.name} 처리 중`;
    case "STOCK_TRADING":
      return "주식 거래 또는 턴 종료";
    case "RESOLVING_TAX":
      return "정기 세금 정산 중";
    case "RESOLVING_MARKET":
      return "부동산 시세 변동 중";
    case "RESOLVING_STOCK_MARKET":
      return "주식시장 변동 중";
    case "RESOLVING_PORT_SETTLEMENT":
      return "울산항 화물 운송 정산 중";
    case "RESOLVING_LOTTO_DRAW":
      return "로또 추첨 중";
    case "RESOLVING_MAYOR_ELECTION":
      return "울산시장 선거 진행 중";
    case "RESOLVING_DISASTER":
      return "자연재해 피해 정산 중";
    default:
      return `${tile.name} · ${tile.id}번 칸`;
  }
}

export function TurnIndicator({
  turnNumber,
  roundLimit,
  phase,
  player,
  tile,
  lastMove,
}: TurnIndicatorProps) {
  return (
    <div className="turn-indicator" aria-live="polite">
      <span
        className="turn-indicator__token"
        style={{ ["--player-color" as string]: player.color }}
      >
        {player.shortName}
      </span>
      <div>
        <strong>{turnNumber}{roundLimit ? `/${roundLimit}` : ""}라운드 · {player.name}</strong>
        <small>{getTurnStatus(phase, tile, lastMove)}</small>
      </div>
    </div>
  );
}
