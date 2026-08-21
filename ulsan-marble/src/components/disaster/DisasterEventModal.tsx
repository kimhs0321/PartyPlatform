import type { PlayerTokenData } from "../PlayerToken";
import type { DistrictId } from "../../types";
import type { DisasterEventResult } from "../../game/disaster/disasterTypes";
import { getDevelopmentStageLabel } from "../../game/property/propertyDevelopment";
import "./DisasterEventModal.css";

interface DisasterEventModalProps {
  event: DisasterEventResult | null;
  players: PlayerTokenData[];
  districts: Record<DistrictId, { name: string; colorKey: string }>;
  canConfirm: boolean;
  onConfirm: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function DisasterEventModal({
  event,
  players,
  districts,
  canConfirm,
  onConfirm,
}: DisasterEventModalProps) {
  if (!event) return null;

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const totalInsuranceCoverage = event.propertyDamages.reduce(
    (total, damage) => total + damage.insuranceCoverage,
    0,
  );

  return (
    <div className="disaster-event-overlay">
      <section
        className="disaster-event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disaster-event-title"
      >
        <div className="disaster-event-modal__eyebrow">
          {event.turnNumber}턴 전역 이벤트
        </div>

        <div className="disaster-event-modal__heading">
          <div className="disaster-event-modal__icon" aria-hidden="true">
            {event.type === "TYPHOON"
              ? "🌀"
              : event.type === "HEAVY_RAIN"
                ? "🌧️"
                : event.type === "EARTHQUAKE"
                  ? "🏚️"
                  : "🔥"}
          </div>
          <div>
            <h2 id="disaster-event-title">{event.name} 발생</h2>
            <p>{event.description}</p>
          </div>
        </div>

        <div className="disaster-event-modal__districts">
          {event.affectedDistrictIds.map((districtId) => (
            <span key={districtId}>{districts[districtId]?.name ?? districtId}</span>
          ))}
        </div>

        <div className="disaster-event-modal__summary">
          <div>
            <span>피해 부동산</span>
            <strong>{event.propertyDamages.length}개</strong>
          </div>
          <div>
            <span>복구비 대상</span>
            <strong>{event.playerAssessments.length}명</strong>
          </div>
          <div>
            <span>보험 보상</span>
            <strong>{formatMoney(totalInsuranceCoverage)}</strong>
          </div>
          <div>
            <span>최종 복구비</span>
            <strong>{formatMoney(event.totalRepairCost)}</strong>
          </div>
        </div>

        <div className="disaster-event-modal__list">
          {event.propertyDamages.map((damage) => {
            const owner = damage.ownerPlayerId
              ? playerMap.get(damage.ownerPlayerId)
              : null;

            return (
              <article className="disaster-damage-row" key={damage.propertyId}>
                <div>
                  <strong>{damage.propertyName}</strong>
                  <span>
                    {districts[damage.districtId]?.name ?? damage.districtId}
                    {damage.stage
                      ? ` · ${getDevelopmentStageLabel(damage.stage)}`
                      : " · 미소유"}
                    {owner ? ` · ${owner.name}` : ""}
                  </span>
                </div>
                <div className="disaster-damage-row__numbers">
                  <b>{formatRate(damage.marketChangeRate)}</b>
                  <span>
                    통행료 {Math.round(damage.tollMultiplier * 100)}% · {damage.tollPenaltyUntilTurn}턴까지
                  </span>
                  {damage.insuranceCoverage > 0 && (
                    <em>보험 -{formatMoney(damage.insuranceCoverage)}</em>
                  )}
                  {damage.finalRepairCost > 0 && (
                    <em>최종 부담 {formatMoney(damage.finalRepairCost)}</em>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="disaster-event-modal__confirm"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {event.playerAssessments.length > 0 ? "피해 정산 진행" : "확인"}
        </button>
      </section>
    </div>
  );
}
