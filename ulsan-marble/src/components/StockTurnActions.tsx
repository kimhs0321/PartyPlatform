import "./StockTurnActions.css";

interface StockTurnActionsProps {
  visible: boolean;
  onOpenMarket: () => void;
  onEndTurn: () => void;
}

export function StockTurnActions({
  visible,
  onOpenMarket,
  onEndTurn,
}: StockTurnActionsProps) {
  if (!visible) return null;

  return (
    <div className="stock-turn-actions" aria-label="주식 거래 단계">
      <button
        type="button"
        className="stock-turn-actions__market"
        onClick={onOpenMarket}
      >
        주식 거래
      </button>
      <button
        type="button"
        className="stock-turn-actions__end"
        onClick={onEndTurn}
      >
        턴 종료
      </button>
    </div>
  );
}
