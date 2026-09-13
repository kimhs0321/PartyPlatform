import type {
  StockIndustryData,
  StockMarketCycle,
} from "../game/stock/stockTypes";
import "./StockMarketChangeModal.css";

interface StockMarketChangeModalProps {
  cycle: StockMarketCycle | null;
  industries: StockIndustryData[];
  devMode: boolean;
  canConfirm: boolean;
  actionLabel?: string;
  onConfirm: () => void;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

export function StockMarketChangeModal({
  cycle,
  industries,
  devMode,
  actionLabel = "확인",
  canConfirm,
  onConfirm,
}: StockMarketChangeModalProps) {
  if (!cycle) return null;

  const industryMap = new Map(
    industries.map((industry) => [industry.id, industry.name]),
  );

  return (
    <div className="stock-change-overlay" role="dialog" aria-modal="true">
      <section className="stock-change-modal">
        <header>
          <span>{devMode ? "DEV STOCK CYCLE" : `${cycle.turnNumber}턴 마감`}</span>
          <h2>주식시장 변동</h2>
          <p>산업 테마 흐름과 종목별 변동이 함께 반영됐습니다.</p>
        </header>

        <div className="stock-change-modal__industries">
          {cycle.industryTrends.map((trend) => (
            <div key={trend.industryId}>
              <span>{industryMap.get(trend.industryId) ?? trend.industryId}</span>
              <strong className={trend.changeRate > 0 ? "is-up" : trend.changeRate < 0 ? "is-down" : ""}>
                {formatRate(trend.changeRate)}
              </strong>
            </div>
          ))}
        </div>

        <div className="stock-change-modal__movers">
          <section>
            <h3>상승 상위</h3>
            {cycle.topGainers.map((mover) => (
              <div key={mover.companyId}>
                <span>{mover.companyName}<small>{mover.ticker}</small></span>
                <b className="is-up">{formatRate(mover.changeRate)}</b>
              </div>
            ))}
          </section>
          <section>
            <h3>하락 상위</h3>
            {cycle.topLosers.map((mover) => (
              <div key={mover.companyId}>
                <span>{mover.companyName}<small>{mover.ticker}</small></span>
                <b className="is-down">{formatRate(mover.changeRate)}</b>
              </div>
            ))}
          </section>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {canConfirm
            ? actionLabel
            : "진행 플레이어 확인 대기 중"}
        </button>
      </section>
    </div>
  );
}
