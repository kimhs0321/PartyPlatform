import type {
  AuctionItemId,
  AuctionItemInstance,
  AuctionTargetEffects,
} from "../../game/auction/auctionTypes";
import { getAuctionItemDefinition } from "../../game/auction/auctionItems";
import "./AuctionItemActionPanel.css";

interface AuctionItemActionPanelProps {
  items: AuctionItemInstance[];
  targetEffects: AuctionTargetEffects;
  playerId: string;
  enabled: boolean;
  onUseTargetedItem: (itemId: AuctionItemId) => void;
}

const TARGETED_IDS: AuctionItemId[] = [
  "EMERGENCY_FLIGHT",
  "TOLL_BOOST",
  "PROPERTY_DEFENSE",
  "STOCK_LOSS_PROTECTION",
];

function getItemSymbol(itemId: AuctionItemId): string {
  switch (itemId) {
    case "EMERGENCY_FLIGHT":
      return "AIR";
    case "TOLL_BOOST":
      return "×1.5";
    case "PROPERTY_DEFENSE":
      return "DEF";
    case "STOCK_LOSS_PROTECTION":
      return "STK";
    default:
      return "ITEM";
  }
}

export function AuctionItemActionPanel({
  items,
  targetEffects,
  playerId,
  enabled,
  onUseTargetedItem,
}: AuctionItemActionPanelProps) {
  const targetedItems = items.filter((item) =>
    TARGETED_IDS.includes(item.itemId),
  );
  const armedLabels = [
    targetEffects.tollBoostPropertyByPlayer[playerId]
      ? "통행료 증폭 대기"
      : null,
    targetEffects.propertyDefenseByPlayer[playerId]
      ? "부동산 방어 대기"
      : null,
    targetEffects.stockLossIndustryByPlayer[playerId]
      ? "주식 손실보전 대기"
      : null,
  ].filter((label): label is string => Boolean(label));

  if (
    targetedItems.length === 0 &&
    armedLabels.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="auction-item-actions"
      aria-label="사용 가능한 경매 아이템"
    >
      <div className="auction-item-actions__title">
        <span>A</span>
        <strong>경매 아이템</strong>
      </div>

      <div className="auction-item-actions__content">
        {armedLabels.map((label) => (
          <span
            key={label}
            className="auction-item-actions__armed"
          >
            <i />
            {label}
          </span>
        ))}

        {targetedItems.map((item) => {
          const definition =
            getAuctionItemDefinition(item.itemId);

          return (
            <button
              key={item.instanceId}
              type="button"
              className={
                definition.rarity === "RARE"
                  ? "is-rare"
                  : "is-common"
              }
              disabled={!enabled}
              title={definition.description}
              onClick={() =>
                onUseTargetedItem(item.itemId)
              }
            >
              <span>{getItemSymbol(item.itemId)}</span>
              <strong>{definition.name}</strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}
