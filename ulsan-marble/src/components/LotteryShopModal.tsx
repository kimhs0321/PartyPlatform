import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { PlayerTokenData } from "./PlayerToken";
import {
  LOTTO_NUMBER_MAX,
  LOTTO_TICKET_PRICE,
  MAX_LOTTO_PURCHASES_PER_VISIT,
  MAX_SCRATCH_PURCHASES_PER_VISIT,
  SCRATCH_TICKET_PRICE,
} from "../game/lottery/lotteryRules";
import type {
  LottoState,
  LottoTicket,
  LotteryShopError,
  PendingLotteryShop,
} from "../game/lottery/lotteryTypes";
import "./LotteryShopModal.css";

interface LotteryShopModalProps {
  shop: PendingLotteryShop | null;
  player: PlayerTokenData | null;
  lottoState: LottoState;
  playerTickets: LottoTicket[];
  error: LotteryShopError | null;
  onBuyScratch: () => void;
  onBuyLotto: (quantity: number) => void;
  onClose: () => void;
}

const SCRATCH_REVEAL_THRESHOLD = 0.48;
const SCRATCH_BRUSH_SIZE = 42;

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: LotteryShopError | null): string | null {
  switch (error) {
    case "NO_PENDING_SHOP":
      return "현재 이용할 수 있는 복권판매소가 없습니다.";
    case "INVALID_QUANTITY":
      return "구매 수량을 확인해 주세요.";
    case "INSUFFICIENT_FUNDS":
      return "복권을 구매할 현금이 부족합니다.";
    case "SCRATCH_LIMIT_REACHED":
      return `한 번 방문할 때 즉석복권은 최대 ${MAX_SCRATCH_PURCHASES_PER_VISIT}장까지 구매할 수 있습니다.`;
    case "LOTTO_LIMIT_REACHED":
      return `한 번 방문할 때 로또는 최대 ${MAX_LOTTO_PURCHASES_PER_VISIT}장까지 구매할 수 있습니다.`;
    default:
      return null;
  }
}

function getLottoBallClass(number: number): string {
  if (number <= 10) return "is-yellow";
  if (number <= 20) return "is-blue";
  if (number <= 30) return "is-red";
  if (number <= 40) return "is-gray";
  return "is-green";
}

export function LotteryShopModal({
  shop,
  player,
  lottoState,
  playerTickets,
  error,
  onBuyScratch,
  onBuyLotto,
  onClose,
}: LotteryShopModalProps) {
  const [lottoQuantity, setLottoQuantity] = useState(1);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [scratching, setScratching] = useState(false);

  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousScratchPointRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const scratchStrokeCountRef = useRef(0);

  const latestScratchResult = shop?.latestScratchResult ?? null;
  const latestScratchResultId = latestScratchResult?.id ?? null;

  const remainingScratchCount = shop
    ? Math.max(
        MAX_SCRATCH_PURCHASES_PER_VISIT - shop.scratchPurchaseCount,
        0,
      )
    : 0;
  const remainingLottoCount = shop
    ? Math.max(
        MAX_LOTTO_PURCHASES_PER_VISIT - shop.lottoPurchaseCount,
        0,
      )
    : 0;
  const safeLottoQuantity = Math.min(
    Math.max(Math.trunc(lottoQuantity), 1),
    Math.max(remainingLottoCount, 1),
  );
  const lottoPurchaseCost = safeLottoQuantity * LOTTO_TICKET_PRICE;
  const errorMessage = getErrorMessage(error);

  const currentDrawTickets = useMemo(
    () =>
      [...playerTickets].sort((first, second) =>
        first.id.localeCompare(second.id),
      ),
    [playerTickets],
  );

  const drawScratchCoating = useCallback(() => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 150);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalCompositeOperation = "source-over";

    const coating = context.createLinearGradient(0, 0, width, height);
    coating.addColorStop(0, "#dfe5e8");
    coating.addColorStop(0.28, "#9ea8ad");
    coating.addColorStop(0.52, "#f2f5f6");
    coating.addColorStop(0.78, "#879298");
    coating.addColorStop(1, "#d7dde0");
    context.fillStyle = coating;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 255, 255, 0.34)";
    for (let index = 0; index < 240; index += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 1.2 + 0.3;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(63, 73, 78, 0.76)";
    context.font = `900 ${Math.max(19, width * 0.048)}px sans-serif`;
    context.fillText("여기를 긁어주세요", width / 2, height / 2 - 9);

    context.fillStyle = "rgba(63, 73, 78, 0.52)";
    context.font = `800 ${Math.max(9, width * 0.021)}px sans-serif`;
    context.fillText("SCRATCH HERE", width / 2, height / 2 + 23);

    scratchStrokeCountRef.current = 0;
    previousScratchPointRef.current = null;
  }, []);

  useEffect(() => {
    setLottoQuantity(1);
  }, [shop?.playerId]);

  useLayoutEffect(() => {
    if (!latestScratchResultId) {
      setScratchRevealed(false);
      setScratching(false);
      return;
    }

    setScratchRevealed(false);
    setScratching(false);

    drawScratchCoating();
  }, [
    drawScratchCoating,
    latestScratchResultId,
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (latestScratchResultId && !scratchRevealed) {
        drawScratchCoating();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [drawScratchCoating, latestScratchResultId, scratchRevealed]);

  if (!shop || !player) return null;

  const scratchPending = Boolean(latestScratchResult && !scratchRevealed);
  const scratchSerial = latestScratchResult
    ? latestScratchResult.id.slice(-8).toUpperCase()
    : "--------";

  const measureScratchProgress = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context) return;

    const { data } = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );

    let transparentPixelCount = 0;
    let sampledPixelCount = 0;

    for (let index = 3; index < data.length; index += 64) {
      sampledPixelCount += 1;
      if (data[index] < 50) {
        transparentPixelCount += 1;
      }
    }

    if (
      sampledPixelCount > 0 &&
      transparentPixelCount / sampledPixelCount >=
        SCRATCH_REVEAL_THRESHOLD
    ) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      setScratchRevealed(true);
      setScratching(false);
      previousScratchPointRef.current = null;
    }
  };

  const eraseScratchCoating = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = scratchCanvasRef.current;
    if (!canvas || scratchRevealed) return;

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const previousPoint = previousScratchPointRef.current;

    context.save();
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = SCRATCH_BRUSH_SIZE;

    context.beginPath();
    if (previousPoint) {
      context.moveTo(previousPoint.x, previousPoint.y);
      context.lineTo(x, y);
    } else {
      context.arc(x, y, SCRATCH_BRUSH_SIZE / 2, 0, Math.PI * 2);
    }
    context.stroke();
    context.fill();
    context.restore();

    previousScratchPointRef.current = { x, y };
    scratchStrokeCountRef.current += 1;

    if (scratchStrokeCountRef.current % 7 === 0) {
      measureScratchProgress();
    }
  };

  const handleScratchPointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (scratchRevealed) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setScratching(true);
    previousScratchPointRef.current = null;
    eraseScratchCoating(event);
  };

  const handleScratchPointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (!scratching || scratchRevealed) return;

    event.preventDefault();
    eraseScratchCoating(event);
  };

  const handleScratchPointerEnd = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setScratching(false);
    previousScratchPointRef.current = null;
    measureScratchProgress();
  };

  return (
    <div className="lottery-shop-overlay" role="dialog" aria-modal="true">
      <section className="lottery-shop-modal">
        <header className="lottery-shop-modal__header">
          <div className="lottery-shop-modal__brand">
            <span className="lottery-shop-modal__brand-mark">LUCKY</span>
            <div>
              <small>ULSAN MARBLE OFFICIAL LOTTERY</small>
              <h2>울산 복권판매소</h2>
            </div>
          </div>

          <div className="lottery-shop-modal__player">
            <span>{player.name}</span>
            <strong>{formatMoney(player.money)}</strong>
          </div>
        </header>

        <div className="lottery-shop-modal__ticker">
          <span>행운은 준비된 사람에게 옵니다</span>
          <b>제{lottoState.drawNumber}회 울산 로또 판매 중</b>
          <strong>
            1등 누적 {formatMoney(lottoState.jackpot)}
          </strong>
        </div>

        <div className="lottery-shop-modal__products">
          <article className="lottery-product lottery-product--scratch">
            <div className="lottery-product__title">
              <div>
                <span>ULSAN INSTANT WIN</span>
                <h3>행운 긁기</h3>
              </div>
              <strong>{formatMoney(SCRATCH_TICKET_PRICE)}</strong>
            </div>

            <p>
              복권을 구매한 뒤 은박 영역을 직접 긁어 당첨 결과를
              확인합니다.
            </p>

            <div
              className={[
                "scratch-ticket",
                latestScratchResult && scratchRevealed
                  ? `is-${latestScratchResult.tier.toLowerCase()}`
                  : latestScratchResult
                    ? "is-pending"
                    : "is-empty",
                scratchRevealed ? "is-revealed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="scratch-ticket__top">
                <div>
                  <small>ULSAN LUCKY</small>
                  <strong>행운 긁기</strong>
                </div>
                <span>₩</span>
              </div>

              <div className="scratch-ticket__result">
                {latestScratchResult ? (
                  <>
                    <small>당첨 결과</small>
                    <strong>
                      {latestScratchResult.label}
                    </strong>
                    <span>
                      {latestScratchResult.prizeAmount > 0
                        ? formatMoney(
                            latestScratchResult.prizeAmount,
                          )
                        : "다음 기회에"}
                    </span>

                    <canvas
                      ref={scratchCanvasRef}
                      className="scratch-ticket__coating"
                      aria-label="즉석복권 긁기 영역"
                      onPointerDown={handleScratchPointerDown}
                      onPointerMove={handleScratchPointerMove}
                      onPointerUp={handleScratchPointerEnd}
                      onPointerCancel={handleScratchPointerEnd}
                      onPointerLeave={(event) => {
                        if (scratching) {
                          handleScratchPointerEnd(event);
                        }
                      }}
                    />
                  </>
                ) : (
                  <>
                    <small>복권 구매 대기</small>
                    <strong>?</strong>
                    <span>구매 후 직접 긁어주세요</span>
                  </>
                )}
              </div>

              <div className="scratch-ticket__bottom">
                <span>NO. {scratchSerial}</span>
                <b>
                  {scratchPending
                    ? "은박을 48% 이상 긁으면 공개"
                    : scratchRevealed
                      ? "결과 확인 완료"
                      : "GOOD LUCK"}
                </b>
              </div>
            </div>

            <button
              type="button"
              className="lottery-product__primary lottery-product__primary--scratch"
              disabled={
                remainingScratchCount <= 0 ||
                player.money < SCRATCH_TICKET_PRICE ||
                scratchPending
              }
              onClick={onBuyScratch}
            >
              {scratchPending
                ? "현재 복권을 먼저 긁어주세요"
                : "즉석복권 1장 구매"}
            </button>

            <small className="lottery-product__limit">
              이번 방문 남은 구매 {remainingScratchCount}장
            </small>
          </article>

          <article className="lottery-product lottery-product--lotto">
            <div className="lottery-product__title">
              <div>
                <span>LOTTO 6/45 · {lottoState.drawNumber}회</span>
                <h3>울산 로또</h3>
              </div>
              <strong>{formatMoney(LOTTO_TICKET_PRICE)} / 장</strong>
            </div>

            <p>
              1부터 {LOTTO_NUMBER_MAX}까지 6개 번호를 자동 발급합니다.
              5턴마다 추첨하며 1등이 없으면 당첨금이 이월됩니다.
            </p>

            <div className="lotto-jackpot">
              <span>이번 회차 1등 누적 당첨금</span>
              <strong>{formatMoney(lottoState.jackpot)}</strong>
              <small>제{lottoState.drawNumber}회 추첨 예정</small>
            </div>

            <div className="lotto-purchase-panel">
              <div className="lotto-quantity-stepper">
                <button
                  type="button"
                  disabled={safeLottoQuantity <= 1}
                  onClick={() =>
                    setLottoQuantity((quantity) =>
                      Math.max(1, quantity - 1),
                    )
                  }
                  aria-label="구매 수량 줄이기"
                >
                  −
                </button>
                <strong>{safeLottoQuantity}</strong>
                <span>장</span>
                <button
                  type="button"
                  disabled={
                    safeLottoQuantity >=
                    Math.max(remainingLottoCount, 1)
                  }
                  onClick={() =>
                    setLottoQuantity((quantity) =>
                      Math.min(
                        Math.max(remainingLottoCount, 1),
                        quantity + 1,
                      ),
                    )
                  }
                  aria-label="구매 수량 늘리기"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="lottery-product__primary lottery-product__primary--lotto"
                disabled={
                  remainingLottoCount <= 0 ||
                  player.money < lottoPurchaseCost
                }
                onClick={() => onBuyLotto(safeLottoQuantity)}
              >
                자동 {safeLottoQuantity}게임 구매
                <small>{formatMoney(lottoPurchaseCost)}</small>
              </button>
            </div>

            <div className="lotto-ticket-book">
              <div className="lotto-ticket-book__header">
                <span>MY LOTTO TICKETS</span>
                <strong>{currentDrawTickets.length}장 보유</strong>
              </div>

              <div className="lotto-ticket-list">
                {currentDrawTickets.length === 0 ? (
                  <small>현재 회차 보유 티켓이 없습니다.</small>
                ) : (
                  currentDrawTickets
                    .slice(-5)
                    .map((ticket, index) => (
                      <div key={ticket.id} className="lotto-ticket-row">
                        <span>
                          {currentDrawTickets.length -
                            Math.min(
                              5,
                              currentDrawTickets.length,
                            ) +
                            index +
                            1}
                        </span>
                        <div>
                          {ticket.numbers.map((number) => (
                            <b
                              key={number}
                              className={getLottoBallClass(number)}
                            >
                              {number}
                            </b>
                          ))}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <small className="lottery-product__limit">
              이번 방문 남은 구매 {remainingLottoCount}장
            </small>
          </article>
        </div>

        {errorMessage && (
          <p className="lottery-shop-modal__error">{errorMessage}</p>
        )}

        <footer className="lottery-shop-modal__footer">
          {scratchPending && (
            <span>현재 즉석복권을 긁어 결과를 확인해 주세요.</span>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={scratchPending}
          >
            구매 종료
          </button>
        </footer>
      </section>
    </div>
  );
}
