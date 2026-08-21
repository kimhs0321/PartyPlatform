import { getAuctionItemDefinition } from "../../game/auction/auctionItems";
import type { PendingAuctionTargetSelection } from "../../game/auction/auctionTypes";
import type { PlayerTokenData } from "../PlayerToken";
import "./AuctionItemTargetModal.css";

interface AuctionItemTargetModalProps {
  selection: PendingAuctionTargetSelection | null;
  player: PlayerTokenData | null;
  onSelect: (targetId: string) => void;
  onCancel: () => void;
}

function getTargetLabel(itemId: string): string {
  switch (itemId) {
    case "EMERGENCY_FLIGHT":
      return "이동 목적지";
    case "TOLL_BOOST":
      return "증폭 대상 부동산";
    case "PROPERTY_DEFENSE":
      return "방어 대상 부동산";
    case "STOCK_LOSS_PROTECTION":
      return "손실보전 대상 테마";
    default:
      return "적용 대상";
  }
}

function getItemSymbol(itemId: string): string {
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

export function AuctionItemTargetModal({
  selection,
  player,
  onSelect,
  onCancel,
}: AuctionItemTargetModalProps) {
  if (!selection || !player) return null;

  const item = getAuctionItemDefinition(selection.itemId);

  return (
    <div className="auction-target-overlay">
      <section
        className="auction-target-modal"
        role="dialog"
        aria-modal="true"
      >
        <header className="auction-target-modal__header">
          <span>AUCTION ITEM APPLICATION</span>
          <strong>경매 아이템 사용 신청서</strong>
        </header>

        <div className="auction-target-modal__body">
          <aside className="auction-target-modal__item">
            <span>{getItemSymbol(item.id)}</span>
            <small>
              {item.rarity === "RARE"
                ? "RARE ITEM"
                : "COMMON ITEM"}
            </small>
            <h2>{item.name}</h2>
            <p>{item.description}</p>

            <div className="auction-target-modal__owner">
              <span
                style={{
                  ["--player-color" as string]: player.color,
                }}
              >
                {player.shortName}
              </span>
              <div>
                <small>사용자</small>
                <strong>{player.name}</strong>
              </div>
            </div>
          </aside>

          <section className="auction-target-modal__selection">
            <div>
              <small>SELECT TARGET</small>
              <strong>{getTargetLabel(selection.itemId)}</strong>
            </div>

            <div className="auction-target-modal__options">
              {selection.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                >
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{option.label}</strong>
                    {option.description && (
                      <small>{option.description}</small>
                    )}
                  </div>
                  <b>선택</b>
                </button>
              ))}
            </div>

            {selection.options.length === 0 && (
              <div className="auction-target-modal__empty">
                현재 선택할 수 있는 대상이 없습니다.
              </div>
            )}

            <button
              type="button"
              className="auction-target-modal__cancel"
              onClick={onCancel}
            >
              아이템 사용 취소
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
