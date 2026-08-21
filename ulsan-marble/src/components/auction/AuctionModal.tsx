import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PlayerTokenData } from "../PlayerToken";
import {
  AUCTION_MINIMUM_INCREMENT,
  AUCTION_RESPONSE_TIME_MS,
  AUCTION_START_PRICE,
  MAX_AUCTION_ITEMS_PER_PLAYER,
  getAuctionItemDefinition,
} from "../../game/auction/auctionItems";
import type {
  AuctionError,
  AuctionInventoryMap,
  PendingAuction,
} from "../../game/auction/auctionTypes";
import "./AuctionModal.css";

interface AuctionModalProps {
  auction: PendingAuction | null;
  players: PlayerTokenData[];
  inventories: AuctionInventoryMap;
  error: AuctionError | null;

  localPlayerId?: string;

  onBid: (amount: number) => void;
  onPass: () => void;
  onDiscard: (instanceId: string) => void;
  onClose: () => void;
}

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: AuctionError | null): string | null {
  switch (error) {
    case "NOT_CURRENT_BIDDER":
      return "현재 입찰 차례가 아닙니다.";
    case "INVALID_BID":
      return "최소 입찰가와 10만원 단위를 확인해 주세요.";
    case "INSUFFICIENT_CASH":
      return "현금이 부족합니다. 일반예금은 자동으로 사용되지 않습니다.";
    case "DUPLICATE_ITEM":
      return "이미 같은 아이템을 보유해 입찰할 수 없습니다.";
    case "PLAYER_NOT_FOUND":
      return "플레이어 정보를 찾지 못했습니다.";
    case "PAYMENT_FAILED":
      return "낙찰대금 처리에 실패했습니다.";
    case "INVALID_DISCARD":
      return "폐기할 아이템을 다시 선택해 주세요.";
    case "NO_PENDING_AUCTION":
      return "진행 중인 경매가 없습니다.";
    default:
      return null;
  }
}

function getUseModeLabel(
  useMode: "AUTOMATIC" | "REACTION" | "TARGETED",
): string {
  switch (useMode) {
    case "AUTOMATIC":
      return "자동 발동";
    case "REACTION":
      return "반응형";
    case "TARGETED":
      return "대상 지정";
  }
}

function getItemSymbol(itemId: string): string {
  switch (itemId) {
    case "DICE_REROLL":
      return "↻";
    case "TOLL_EXEMPTION":
      return "FREE";
    case "CONSTRUCTION_SUPPORT":
      return "BUILD";
    case "TAX_DISCOUNT":
      return "TAX";
    case "DISASTER_SUPPORT":
      return "SAFE";
    case "SAVINGS_GRACE":
      return "SAVE";
    case "EMERGENCY_FLIGHT":
      return "AIR";
    case "TOLL_BOOST":
      return "×1.5";
    case "PROPERTY_DEFENSE":
      return "SHIELD";
    case "PORT_CARGO_INSURANCE":
      return "PORT";
    case "DEPOSIT_BONUS":
      return "×2";
    case "STOCK_LOSS_PROTECTION":
      return "STOCK";
    default:
      return "ITEM";
  }
}

export function AuctionModal({
  auction,
  players,
  inventories,
  error,
  localPlayerId,
  onBid,
  onPass,
  onDiscard,
  onClose,
}: AuctionModalProps) {
  const [bidAmount, setBidAmount] = useState(AUCTION_START_PRICE);
  const [remainingMs, setRemainingMs] = useState(
    AUCTION_RESPONSE_TIME_MS,
  );
  const timeoutHandledRef = useRef<string | null>(null);

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const itemDefinition = auction
    ? getAuctionItemDefinition(auction.item.itemId)
    : null;
  const currentBidder = auction?.currentBidderId
    ? playerMap.get(auction.currentBidderId) ?? null
    : null;
  const highestBidder = auction?.highestBidderId
    ? playerMap.get(auction.highestBidderId) ?? null
    : null;
  const winner = auction?.winnerPlayerId
    ? playerMap.get(auction.winnerPlayerId) ?? null
    : null;
  const minimumBid = auction
    ? auction.currentBid > 0
      ? auction.currentBid + AUCTION_MINIMUM_INCREMENT
      : AUCTION_START_PRICE
    : AUCTION_START_PRICE;

  const canControlCurrentBidder =
    !localPlayerId ||
    auction?.currentBidderId ===
      localPlayerId;

  const canControlWinner =
    !localPlayerId ||
    auction?.winnerPlayerId ===
      localPlayerId;

  const canCloseAuction =
    !localPlayerId ||
    auction?.arrivalPlayerId ===
      localPlayerId;  

  useEffect(() => {
    if (!auction || auction.stage !== "BIDDING") return;
    setBidAmount(minimumBid);
  }, [
    auction?.currentBidderId,
    auction?.currentBid,
    auction?.stage,
    minimumBid,
  ]);

  useEffect(() => {
    if (
      !auction ||
      auction.stage !== "BIDDING" ||
      !auction.deadlineAt
    ) {
      return;
    }

    const key = `${auction.currentBidderId}-${auction.deadlineAt}`;
    timeoutHandledRef.current = null;

    const update = () => {
      const remaining = Math.max(
        0,
        auction.deadlineAt! - Date.now(),
      );
      setRemainingMs(remaining);

      if (
        remaining <= 0 &&
        canControlCurrentBidder &&
        timeoutHandledRef.current !== key
      ) {
        timeoutHandledRef.current = key;
        onPass();
      }
    };

    update();
    const intervalId = window.setInterval(update, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    auction,
    canControlCurrentBidder,
    onPass,
  ]);

  if (!auction || !itemDefinition) return null;

  const errorMessage = getErrorMessage(error);
  const currentItems = currentBidder
    ? inventories[currentBidder.id] ?? []
    : [];
  const ownsDuplicate = currentItems.some(
    (item) => item.itemId === auction.item.itemId,
  );
  const canBid = Boolean(
    canControlCurrentBidder &&
      currentBidder &&
      !ownsDuplicate &&
      currentBidder.money >=
        minimumBid,
  );
  const countdownSeconds = Math.max(
    0,
    Math.ceil(remainingMs / 1000),
  );
  const timerProgress = Math.max(
    0,
    Math.min(1, remainingMs / AUCTION_RESPONSE_TIME_MS),
  );
  const lotNumber = auction.item.instanceId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase()
    .padStart(8, "0");

  const setQuickBid = (increment: number) => {
    const nextAmount = Math.max(
      minimumBid,
      minimumBid + increment,
    );
    setBidAmount(nextAmount);
  };

  return (
    <div className="auction-overlay">
      <section
        className={[
          "auction-modal",
          `is-${auction.stage.toLowerCase()}`,
          itemDefinition.rarity === "RARE"
            ? "is-rare"
            : "is-common",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-title"
      >
        <header className="auction-modal__header">
          <div className="auction-modal__brand">
            <span className="auction-modal__brand-mark">A</span>
            <div>
              <small>ULSAN MARBLE AUCTION HOUSE</small>
              <strong>울산마블 경매장</strong>
            </div>
          </div>

          <div className="auction-modal__lot">
            <span>LOT NO.</span>
            <b>{lotNumber}</b>
          </div>
        </header>

        {auction.stage === "BIDDING" && (
          <div className="auction-modal__bidding-layout">
            <section className="auction-modal__showcase">
              <div
                className="auction-modal__spotlight"
                aria-hidden="true"
              />

              <div className="auction-modal__item-card">
                <span className="auction-modal__rarity">
                  {itemDefinition.rarity === "RARE"
                    ? "RARE ITEM"
                    : "COMMON ITEM"}
                </span>
                <strong className="auction-modal__item-symbol">
                  {getItemSymbol(itemDefinition.id)}
                </strong>
                <h2 id="auction-title">
                  {itemDefinition.name}
                </h2>
                <p>{itemDefinition.description}</p>
                <div className="auction-modal__item-meta">
                  <span>
                    {getUseModeLabel(itemDefinition.useMode)}
                  </span>
                  <b>보유 한도 {MAX_AUCTION_ITEMS_PER_PLAYER}개</b>
                </div>
              </div>

              <div className="auction-modal__gavel">
                <i key={auction.currentBid} />
                <span>LIVE AUCTION</span>
              </div>
            </section>

            <section className="auction-modal__bid-board">
              <div className="auction-modal__price-board">
                <span>현재 최고 입찰가</span>
                <strong>
                  {auction.currentBid > 0
                    ? formatMoney(auction.currentBid)
                    : formatMoney(AUCTION_START_PRICE)}
                </strong>
                <small>
                  최고 입찰자{" "}
                  <b>{highestBidder?.name ?? "없음"}</b>
                </small>
              </div>

              <div className="auction-modal__timer">
                <div>
                  <span>현재 응찰자</span>
                  <strong>
                    {currentBidder?.name ?? "참가자 없음"}
                  </strong>
                  {currentBidder && (
                    <small>
                      보유 현금 {formatMoney(currentBidder.money)}
                    </small>
                  )}
                </div>

                <b
                  className={
                    countdownSeconds <= 3 ? "is-urgent" : ""
                  }
                >
                  {countdownSeconds}
                </b>

                <i
                  style={{
                    ["--timer-progress" as string]:
                      timerProgress,
                  }}
                />
              </div>

              <div className="auction-modal__participants">
                {auction.eligibleBidderIds.map((playerId) => {
                  const participant = playerMap.get(playerId);
                  const isActive =
                    auction.activeBidderIds.includes(playerId);
                  const isCurrent =
                    auction.currentBidderId === playerId;
                  const isHighest =
                    auction.highestBidderId === playerId;

                  return (
                    <div
                      key={playerId}
                      className={[
                        isActive ? "is-active" : "is-out",
                        isCurrent ? "is-current" : "",
                        isHighest ? "is-highest" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span
                        style={{
                          ["--player-color" as string]:
                            participant?.color ?? "#687985",
                        }}
                      >
                        {participant?.shortName ?? "?"}
                      </span>
                      <strong>
                        {participant?.name ?? playerId}
                      </strong>
                      <small>
                        {isHighest
                          ? "최고가"
                          : isCurrent
                            ? "응찰 중"
                            : isActive
                              ? "대기"
                              : "포기"}
                      </small>
                    </div>
                  );
                })}
              </div>

              {ownsDuplicate && (
                <p className="auction-modal__notice">
                  같은 아이템을 이미 보유해 이번 경매에는
                  입찰할 수 없습니다.
                </p>
              )}

              <div className="auction-modal__bid-entry">
                <div className="auction-modal__quick-bids">
                  <button
                    type="button"
                    disabled={!canBid}
                    onClick={() => setBidAmount(minimumBid)}
                  >
                    최소가
                  </button>
                  <button
                    type="button"
                    disabled={!canBid}
                    onClick={() =>
                      setQuickBid(AUCTION_MINIMUM_INCREMENT)
                    }
                  >
                    +{AUCTION_MINIMUM_INCREMENT}
                  </button>
                  <button
                    type="button"
                    disabled={!canBid}
                    onClick={() => setQuickBid(50)}
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    disabled={!canBid}
                    onClick={() => setQuickBid(100)}
                  >
                    +100
                  </button>
                </div>

                <div className="auction-modal__bid-controls">
                  <label>
                    <span>응찰 금액</span>
                    <input
                      type="number"
                      min={minimumBid}
                      step={AUCTION_MINIMUM_INCREMENT}
                      value={bidAmount}
                      disabled={!canBid}
                      aria-label="입찰 금액"
                      onChange={(event) =>
                        setBidAmount(Number(event.target.value))
                      }
                    />
                    <small>만원</small>
                  </label>

                  <button
                    type="button"
                    className="auction-modal__bid"
                    disabled={
                      !canBid ||
                      bidAmount < minimumBid ||
                      bidAmount %
                        AUCTION_MINIMUM_INCREMENT !==
                        0 ||
                      bidAmount >
                        (currentBidder?.money ?? 0)
                    }
                    onClick={() => onBid(bidAmount)}
                  >
                    <span>패들 올리기</span>
                    <strong>{formatMoney(bidAmount)} 응찰</strong>
                  </button>

                  <button
                    type="button"
                    className="auction-modal__pass"
                    disabled={
                      !canControlCurrentBidder
                    }
                    onClick={onPass}
                  >
                    {canControlCurrentBidder
                      ? "이번 경매 포기"
                      : "다른 플레이어 응찰 대기"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {auction.stage === "CHOOSE_DISCARD" && winner && (
          <div className="auction-modal__result-layout">
            <section className="auction-modal__sold-card">
              <span>SOLD</span>
              <strong>{itemDefinition.name}</strong>
              <p>
                <b>{winner.name}</b>에게{" "}
                {formatMoney(auction.currentBid)}에 낙찰
              </p>
              <small>
                새 아이템을 받기 위해 기존 아이템 하나를
                반납해야 합니다.
              </small>
            </section>

            <section className="auction-modal__inventory-check">
              <div>
                <span>INVENTORY CHECK</span>
                <strong>반납할 아이템 선택</strong>
              </div>

              <div className="auction-modal__discard-list">
                {(inventories[winner.id] ?? []).map((item) => {
                  const definition =
                    getAuctionItemDefinition(item.itemId);

                  return (
                    <button
                      key={item.instanceId}
                      type="button"
                      disabled={
                        !canControlWinner
                      }
                      onClick={() =>
                        onDiscard(item.instanceId)
                      }
                    >
                      <span>
                        {getItemSymbol(definition.id)}
                      </span>
                      <div>
                        <strong>{definition.name}</strong>
                        <small>{definition.description}</small>
                      </div>
                      <b>반납</b>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {auction.stage === "RESULT" && (
          <div className="auction-modal__final-result">
            <div
              className={`auction-modal__result-stamp is-${(
                auction.result ?? "UNSOLD"
              ).toLowerCase()}`}
            >
              <span>
                {auction.result === "SOLD"
                  ? "SOLD"
                  : "PASSED"}
              </span>
              <strong>
                {auction.result === "SOLD"
                  ? "낙찰 완료"
                  : "유찰"}
              </strong>
            </div>

            <div className="auction-modal__final-item">
              <span>{getItemSymbol(itemDefinition.id)}</span>
              <div>
                <small>
                  {itemDefinition.rarity === "RARE"
                    ? "희귀 아이템"
                    : "일반 아이템"}
                </small>
                <h2>{itemDefinition.name}</h2>
                <p>
                  {auction.result === "SOLD" && winner
                    ? `${winner.name}이 ${formatMoney(
                        auction.currentBid,
                      )}에 낙찰했습니다.`
                    : "모든 참가자가 포기해 이번 경매는 유찰됐습니다."}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="auction-modal__close"
              disabled={
                !canCloseAuction
              }
              onClick={onClose}
            >
              {canCloseAuction
                ? "경매 종료"
                : "경매 종료 대기"}
            </button>
          </div>
        )}

        {errorMessage && (
          <p className="auction-modal__error" role="alert">
            {errorMessage}
          </p>
        )}
      </section>
    </div>
  );
}
