import "./MarketChangeModal.css";

import type { PropertyMarketCycle } from "../game/market/marketTypes";
import type { PropertiesData } from "../types";

interface MarketChangeModalProps {
  cycle: PropertyMarketCycle | null;
  districts: PropertiesData["districts"];
  devMode: boolean;
  canConfirm: boolean;
  onConfirm: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

export function MarketChangeModal({
  cycle,
  districts,
  devMode,
  canConfirm,
  onConfirm,
}: MarketChangeModalProps) {
  if (!cycle) return null;

  const risingProperties = [...cycle.propertyChanges]
    .filter((change) => change.appliedChangeRate > 0)
    .sort(
      (first, second) =>
        second.appliedChangeRate - first.appliedChangeRate,
    )
    .slice(0, 3);
  const fallingProperties = [...cycle.propertyChanges]
    .filter((change) => change.appliedChangeRate < 0)
    .sort(
      (first, second) =>
        first.appliedChangeRate - second.appliedChangeRate,
    )
    .slice(0, 3);

  return (
    <div className="market-change-overlay">
      <section
        className="market-change-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-change-title"
      >
        <div className="market-change-modal__eyebrow">
          {devMode ? "DEV 강제 변동" : `${cycle.turnNumber}턴 정기 변동`}
        </div>

        <h2 id="market-change-title">울산 부동산 시세 변동</h2>
        <p className="market-change-modal__description">
          권역 흐름과 개별 지역 요인이 함께 반영되었습니다.
        </p>

        <div className="market-change-modal__districts">
          {cycle.districtChanges.map((change) => {
            const directionClass =
              change.changeRate > 0
                ? "is-up"
                : change.changeRate < 0
                  ? "is-down"
                  : "is-flat";

            return (
              <div
                className={`market-district-change ${directionClass}`}
                key={change.districtId}
              >
                <span>
                  {districts[change.districtId]?.name ?? change.districtId}
                </span>
                <strong>{formatRate(change.changeRate)}</strong>
              </div>
            );
          })}
        </div>

        <div className="market-change-modal__highlights">
          <section>
            <h3>상승 상위</h3>
            {risingProperties.length === 0 ? (
              <p className="market-change-modal__empty">상승 지역 없음</p>
            ) : (
              risingProperties.map((change) => (
                <article className="market-property-change is-up" key={change.propertyId}>
                  <div>
                    <strong>{change.propertyName}</strong>
                    <span>
                      {districts[change.districtId]?.name ?? change.districtId}
                    </span>
                  </div>
                  <div>
                    <b>{formatRate(change.appliedChangeRate)}</b>
                    <small>
                      {formatMoney(change.previousPrice)} → {formatMoney(change.currentPrice)}
                    </small>
                  </div>
                </article>
              ))
            )}
          </section>

          <section>
            <h3>하락 상위</h3>
            {fallingProperties.length === 0 ? (
              <p className="market-change-modal__empty">하락 지역 없음</p>
            ) : (
              fallingProperties.map((change) => (
                <article className="market-property-change is-down" key={change.propertyId}>
                  <div>
                    <strong>{change.propertyName}</strong>
                    <span>
                      {districts[change.districtId]?.name ?? change.districtId}
                    </span>
                  </div>
                  <div>
                    <b>{formatRate(change.appliedChangeRate)}</b>
                    <small>
                      {formatMoney(change.previousPrice)} → {formatMoney(change.currentPrice)}
                    </small>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>

        <p className="market-change-modal__note">
          새 시세는 구매가격·통행료·세금·매각가·평가자산에 적용되며,
          건설비는 기준가를 유지합니다.
        </p>

        <button
          type="button"
          className="market-change-modal__confirm"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {canConfirm
            ? devMode
              ? "확인"
              : "다음 턴 시작"
            : "현재 플레이어 확인 대기"}
        </button>
      </section>
    </div>
  );
}
