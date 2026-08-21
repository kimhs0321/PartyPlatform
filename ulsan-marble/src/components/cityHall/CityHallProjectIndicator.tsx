import type { PlayerTokenData } from "../PlayerToken";
import type { StockIndustryData } from "../../game/stock/stockTypes";
import { getActiveCityHallTerm } from "../../game/cityHall/cityHallRules";
import type {
  CityHallProjectDefinition,
  CityHallState,
} from "../../game/cityHall/cityHallTypes";
import "./CityHallProjectIndicator.css";

interface CityHallProjectIndicatorProps {
  state: CityHallState;
  turnNumber: number;
  players: PlayerTokenData[];
  industries: StockIndustryData[];
}

function getIndicatorEffectDescription(
  project: CityHallProjectDefinition,
): string {
  const effects = project.effects;

  if (effects.propertyMarketChangeBias !== undefined) {
    return "전체 부동산 시세에 상승 보정 적용";
  }

  if (effects.stockIndustryChangeBias !== undefined) {
    return "선택한 주식 테마에 상승 보정 적용";
  }

  if (effects.oneTimeStockIndustryBoost !== undefined) {
    return "다음 주식시장 정산에서 선택 테마에 상승 보정 적용";
  }

  return project.effectDescription;
}

export function CityHallProjectIndicator({
  state,
  turnNumber,
  players,
  industries,
}: CityHallProjectIndicatorProps) {
  const activeTerm = getActiveCityHallTerm(state, turnNumber);
  if (!activeTerm) return null;

  const triggerName =
    players.find(
      (player) => player.id === activeTerm.selectedByPlayerId,
    )?.name ?? "플레이어";

  const targetIndustryName = activeTerm.targetIndustryId
    ? industries.find(
        (industry) => industry.id === activeTerm.targetIndustryId,
      )?.name ?? activeTerm.targetIndustryId
    : null;

  const remainingTurns = Math.max(
    0,
    activeTerm.expiresAfterTurn - turnNumber + 1,
  );

  const effectDescription =
    getIndicatorEffectDescription(activeTerm.project);

  return (
    <aside className="city-hall-project-indicator">
      <div className="city-hall-project-indicator__badge">
        <span>울산시청</span>
        <strong>단기 시정사업</strong>
      </div>

      <div className="city-hall-project-indicator__content">
        <small>
          {triggerName} 시청 도착으로 자동 발동
          {targetIndustryName ? ` · ${targetIndustryName}` : ""}
        </small>

        <strong>{activeTerm.project.name}</strong>
        <em>{effectDescription}</em>
      </div>

      <div className="city-hall-project-indicator__turns">
        <b>{remainingTurns}</b>
        <span>턴 남음</span>
      </div>
    </aside>
  );
}