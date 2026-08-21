import { useEffect, useState } from "react";
import type { PlayerTokenData } from "./PlayerToken";
import type {
  GoldenKeyCategory,
  GoldenKeyPoolGroup,
  PendingGoldenKeyResolution,
} from "../game/goldenKey/goldenKeyTypes";
import {
  GOLDEN_KEY_CARDS,
  GOLDEN_KEY_GAME_DECK_SIZE,
  GOLDEN_KEY_POOL_SIZE,
} from "../game/goldenKey/goldenKeyDeck";
import "./GoldenKeyModal.css";

interface GoldenKeyModalProps {
  resolution: PendingGoldenKeyResolution | null;
  player: PlayerTokenData | null;
  remainingCardCount: number;
  cycle: number;
  canInteract: boolean;
  onApply: () => void;
  onClose: () => void;
}

type GoldenKeyRevealPhase =
  | "DECK"
  | "DRAWING"
  | "HOLDING"
  | "FLIPPING"
  | "REVEALED";

const DECK_DURATION_MS = 650;
const DRAW_DURATION_MS = 1300;
const HOLD_DURATION_MS = 450;
const FLIP_DURATION_MS = 850;

const CATEGORY_LABELS: Record<GoldenKeyCategory, string> = {
  POSITIVE: "행운",
  SITUATION: "상황",
  NEGATIVE: "주의",
};

const POOL_GROUP_LABELS: Record<GoldenKeyPoolGroup, string> = {
  CASH_SUPPORT: "지원·보상",
  COST_LOSS: "비용·손실",
  MOVEMENT: "이동",
  PROPERTY: "부동산",
  STOCK: "주식",
};

const POOL_GROUP_EMBLEMS: Record<GoldenKeyPoolGroup, string> = {
  CASH_SUPPORT: "₩",
  COST_LOSS: "!",
  MOVEMENT: "➜",
  PROPERTY: "◆",
  STOCK: "↗",
};

function getCardNumber(cardId: string): string {
  const index = GOLDEN_KEY_CARDS.findIndex((card) => card.id === cardId);
  return String(index >= 0 ? index + 1 : 0).padStart(2, "0");
}

export function GoldenKeyModal({
  resolution,
  player,
  remainingCardCount,
  cycle,
  canInteract,
  onApply,
  onClose,
}: GoldenKeyModalProps) {
  const [revealPhase, setRevealPhase] =
    useState<GoldenKeyRevealPhase>("DECK");

  useEffect(() => {
    if (!resolution) {
      setRevealPhase("DECK");
      return;
    }

    if (resolution.stage === "RESOLVED") {
      setRevealPhase("REVEALED");
      return;
    }

    setRevealPhase("DECK");

    const drawTimer = window.setTimeout(() => {
      setRevealPhase("DRAWING");
    }, DECK_DURATION_MS);

    const holdTimer = window.setTimeout(() => {
      setRevealPhase("HOLDING");
    }, DECK_DURATION_MS + DRAW_DURATION_MS);

    const flipTimer = window.setTimeout(() => {
      setRevealPhase("FLIPPING");
    }, DECK_DURATION_MS + DRAW_DURATION_MS + HOLD_DURATION_MS);

    const revealTimer = window.setTimeout(() => {
      setRevealPhase("REVEALED");
    }, DECK_DURATION_MS + DRAW_DURATION_MS + HOLD_DURATION_MS + FLIP_DURATION_MS);

    return () => {
      window.clearTimeout(drawTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(flipTimer);
      window.clearTimeout(revealTimer);
    };
  }, [resolution?.card.id]);

  if (!resolution) return null;

  const resolved = resolution.stage === "RESOLVED";
  const revealed = resolved || revealPhase === "REVEALED";
  const category = resolution.card.category.toLowerCase();
  const poolGroup = resolution.card.poolGroup.toLowerCase();
  const cardNumber = getCardNumber(resolution.card.id);
  const groupLabel = POOL_GROUP_LABELS[resolution.card.poolGroup];
  const emblem = POOL_GROUP_EMBLEMS[resolution.card.poolGroup];

  return (
    <div className="golden-key-modal" role="dialog" aria-modal="true">
      <div
        className={`golden-key-modal__scene golden-key-modal__scene--${revealPhase.toLowerCase()}`}
      >
        <div className="golden-key-modal__deck" aria-hidden="true">
          <strong>황금열쇠</strong>
        </div>

        <div className="golden-key-modal__draw-card">
          <div className="golden-key-modal__draw-card-inner">
            <div className="golden-key-modal__card-back" aria-hidden="true">
              <span className="golden-key-modal__card-back-kicker">
                ULSAN MARBLE
              </span>

              <div className="golden-key-modal__card-back-seal">
                <span className="golden-key-modal__card-back-ring" />
                <span className="golden-key-modal__card-back-shaft" />
                <span className="golden-key-modal__card-back-tooth" />
              </div>

              <strong>GOLDEN KEY</strong>
              <small>행운의 카드를 공개합니다</small>
            </div>

            <section
              className={`golden-key-modal__card golden-key-modal__card--${category} golden-key-modal__card--${poolGroup}`}
            >
              <span className="golden-key-modal__corner golden-key-modal__corner--tl" />
              <span className="golden-key-modal__corner golden-key-modal__corner--tr" />
              <span className="golden-key-modal__corner golden-key-modal__corner--bl" />
              <span className="golden-key-modal__corner golden-key-modal__corner--br" />

              <header className="golden-key-modal__header">
                <div className="golden-key-modal__topline">
                  <span>ULSAN GOLDEN KEY</span>
                  <span>No.{cardNumber}</span>
                </div>

                <div className="golden-key-modal__heading-row">
                  <div className="golden-key-modal__badge">
                    <span>{CATEGORY_LABELS[resolution.card.category]}</span>
                  </div>

                  <div className="golden-key-modal__heading-copy">
                    <span>황금열쇠</span>
                    <h2>{resolution.card.title}</h2>
                  </div>

                  <div className="golden-key-modal__cycle-seal">
                    <strong>{cycle}</strong>
                    <span>DECK</span>
                  </div>
                </div>
              </header>

              <div className="golden-key-modal__divider" aria-hidden="true">
                <span />
                <b>◆</b>
                <span />
              </div>

              <div className="golden-key-modal__artwork" aria-hidden="true">
                <div className="golden-key-modal__sunburst" />
                <div className="golden-key-modal__key-ring" />
                <div className="golden-key-modal__key-shaft" />
                <div className="golden-key-modal__key-tooth" />
                <div className="golden-key-modal__effect-emblem">{emblem}</div>
                <div className="golden-key-modal__group-ribbon">{groupLabel}</div>
              </div>

              <div
                className={`golden-key-modal__description-panel ${
                  resolved && resolution.resultText
                    ? "golden-key-modal__description-panel--resolved"
                    : ""
                }`}
                aria-live="polite"
              >
                {resolved && resolution.resultText ? (
                  <>
                    <span className="golden-key-modal__description-label">
                      적용 결과
                    </span>

                    <strong className="golden-key-modal__result-player">
                      {player?.name ?? "플레이어"}
                    </strong>

                    <p className="golden-key-modal__result-text">
                      {resolution.resultText}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="golden-key-modal__description-label">
                      CARD EFFECT
                    </span>

                    <p className="golden-key-modal__description">
                      {resolution.card.description}
                    </p>
                  </>
                )}
              </div>

              <footer className="golden-key-modal__footer">
                <div className="golden-key-modal__deck-status">
                  <span>
                    남은 카드 <strong>{remainingCardCount}</strong>장
                  </span>
                  <span>
                    게임 덱 <strong>{GOLDEN_KEY_GAME_DECK_SIZE}</strong>장
                  </span>
                  <span>
                    전체 풀 <strong>{GOLDEN_KEY_POOL_SIZE}</strong>장
                  </span>
                </div>

                {canInteract && (
                  <button
                    type="button"
                    className="golden-key-modal__action"
                    disabled={!revealed}
                    onClick={resolved ? onClose : onApply}
                  >
                    {resolved
                      ? "확인"
                      : revealed
                        ? "효과 적용"
                        : "카드 공개 중..."}
                  </button>
                )}
                <div className="golden-key-modal__signature">
                  <span>ULSAN MARBLE</span>
                  <span>GOLDEN KEY CARD</span>
                </div>
              </footer>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
