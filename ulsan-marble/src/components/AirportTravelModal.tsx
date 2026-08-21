import { useEffect, useMemo, useState } from "react";
import type { BoardTile } from "../types";
import { AIRPORT_TICKET_PRICE } from "../game/airport/airportRules";
import type {
  AirportTravelError,
  PendingAirportTravel,
} from "../game/airport/airportTypes";
import type { PlayerTokenData } from "./PlayerToken";
import "./AirportTravelModal.css";

interface AirportTravelModalProps {
  travel: PendingAirportTravel | null;
  player: PlayerTokenData | null;
  destinations: BoardTile[];
  error: AirportTravelError | null;
  onTravel: (destinationPosition: number) => void;
  onClose: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getTileTypeLabel(type: BoardTile["type"]): string {
  switch (type) {
    case "PROPERTY":
      return "부동산";
    case "GOLDEN_KEY":
      return "황금열쇠";
    case "LOTTERY_SHOP":
      return "복권판매소";
    case "INSURANCE":
      return "보험사";
    case "PORT":
      return "울산항";
    case "FREE_REST":
      return "무료휴식";
    case "BANK":
      return "은행";
    case "CITY_HALL":
      return "울산시청";
    case "REAL_ESTATE":
      return "부동산 중개소";
    case "AUCTION":
      return "경매장";
    case "NEWS":
      return "경제신문";
    case "MINIGAME":
      return "미니게임";
    default:
      return "특별칸";
  }
}

function getErrorMessage(error: AirportTravelError | null): string | null {
  switch (error) {
    case "NO_PENDING_AIRPORT":
      return "현재 이용할 수 있는 공항이 없습니다.";
    case "PLAYER_NOT_FOUND":
      return "이동할 플레이어를 찾지 못했습니다.";
    case "INVALID_DESTINATION":
      return "선택할 수 없는 목적지입니다.";
    case "INSUFFICIENT_FUNDS":
      return "항공권을 구매할 현금이 부족합니다.";
    case "PAYMENT_FAILED":
      return "항공권 결제에 실패했습니다.";
    default:
      return null;
  }
}

export function AirportTravelModal({
  travel,
  player,
  destinations,
  error,
  onTravel,
  onClose,
}: AirportTravelModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isBoarding, setIsBoarding] = useState(false);

  useEffect(() => {
    setSelectedPosition(null);
    setIsBoarding(false);
  }, [travel?.playerId, travel?.airportPosition]);

  useEffect(() => {
    if (error) setIsBoarding(false);
  }, [error]);

  const selectedTile = useMemo(
    () =>
      destinations.find((tile) => tile.id === selectedPosition) ?? null,
    [destinations, selectedPosition],
  );

  if (!travel || !player) return null;

  const errorMessage = getErrorMessage(error);
  const canAfford = player.money >= AIRPORT_TICKET_PRICE;
  const canTravel = selectedTile !== null && canAfford && !isBoarding;
  const balanceAfterPurchase = Math.max(
    player.money - AIRPORT_TICKET_PRICE,
    0,
  );

  return (
    <div className="airport-travel-overlay" role="dialog" aria-modal="true">
      <section className="airport-travel-modal">
        <div className="airport-boarding-pass">
          <div className="airport-boarding-pass__main">
            <header className="airport-boarding-pass__header">
              <div>
                <span>ULSAN AIR</span>
                <strong>BOARDING PASS</strong>
              </div>
              <b>울산공항</b>
            </header>

            <div className="airport-boarding-pass__route">
              <div>
                <small>FROM</small>
                <strong>USN</strong>
                <span>울산공항</span>
              </div>

              <div className="airport-boarding-pass__route-line" aria-hidden="true">
                <span />
                <b>✈</b>
                <span />
              </div>

              <div className={!selectedTile ? "is-empty" : ""}>
                <small>TO</small>
                <strong>{selectedTile ? String(selectedTile.id).padStart(2, "0") : "--"}</strong>
                <span>{selectedTile?.name ?? "목적지 선택"}</span>
              </div>
            </div>

            <label className="airport-boarding-pass__destination-select">
              <span>DESTINATION</span>
              <select
                value={selectedPosition ?? ""}
                disabled={isBoarding}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedPosition(value === "" ? null : Number(value));
                  setIsBoarding(false);
                }}
              >
                <option value="">이동할 목적지를 선택하세요</option>
                {destinations.map((tile) => (
                  <option key={tile.id} value={tile.id}>
                    {tile.id}번 · {tile.name} · {getTileTypeLabel(tile.type)}
                  </option>
                ))}
              </select>
            </label>

            <div className="airport-boarding-pass__details">
              <dl>
                <div>
                  <dt>PASSENGER</dt>
                  <dd>{player.name}</dd>
                </div>
                <div>
                  <dt>FARE</dt>
                  <dd>{formatMoney(AIRPORT_TICKET_PRICE)}</dd>
                </div>
                <div>
                  <dt>BALANCE</dt>
                  <dd>{formatMoney(player.money)}</dd>
                </div>
                <div>
                  <dt>ARRIVAL</dt>
                  <dd>
                    {selectedTile
                      ? `${getTileTypeLabel(selectedTile.type)} 효과 적용`
                      : "목적지 미선택"}
                  </dd>
                </div>
              </dl>

              <p>
                출발점을 지나도 월급은 지급되지 않습니다. 착륙한 뒤 목적지 칸의
                효과가 정상적으로 처리됩니다.
              </p>
            </div>
          </div>

          <aside className="airport-boarding-pass__stub">
            <span>ULSAN AIR</span>
            <strong>{selectedTile?.name ?? "OPEN"}</strong>
            <dl>
              <div>
                <dt>GATE</dt>
                <dd>A1</dd>
              </div>
              <div>
                <dt>SEAT</dt>
                <dd>{player.shortName}</dd>
              </div>
              <div>
                <dt>AFTER</dt>
                <dd>{formatMoney(balanceAfterPurchase)}</dd>
              </div>
            </dl>
            <div className="airport-boarding-pass__barcode" aria-hidden="true" />
          </aside>
        </div>

        {selectedTile && (
          <div className="airport-travel-modal__selected">
            <span>{selectedTile.id}번 칸</span>
            <strong>{selectedTile.name}</strong>
            <small>{getTileTypeLabel(selectedTile.type)} 도착 효과 적용</small>
          </div>
        )}

        {!canAfford && (
          <p className="airport-travel-modal__error" role="alert">
            항공권 구매에 {formatMoney(AIRPORT_TICKET_PRICE - player.money)}이 부족합니다.
          </p>
        )}

        {errorMessage && (
          <p className="airport-travel-modal__error" role="alert">
            {errorMessage}
          </p>
        )}

        <footer className="airport-travel-modal__footer">
          <button
            type="button"
            className="is-secondary"
            disabled={isBoarding}
            onClick={onClose}
          >
            이동하지 않기
          </button>
          <button
            type="button"
            disabled={!canTravel}
            onClick={() => {
              if (selectedPosition === null || isBoarding) return;
              setIsBoarding(true);
              onTravel(selectedPosition);
            }}
          >
            {isBoarding
              ? "탑승 처리 중…"
              : selectedTile
                ? `${selectedTile.name}행 탑승`
                : "목적지 선택"}
          </button>
        </footer>
      </section>
    </div>
  );
}
