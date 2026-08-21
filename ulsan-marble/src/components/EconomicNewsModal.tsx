import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { PlayerTokenData } from "./PlayerToken";
import type { PendingEconomicNewsResolution } from "../game/economicNews/economicNewsTypes";
import "./EconomicNewsModal.css";

interface EconomicNewsModalProps {
  resolution: PendingEconomicNewsResolution | null;
  player: PlayerTokenData | null;
  remainingArticleCount: number;
  cycle: number;
  canInteract: boolean;
  onApply: () => void;
  onClose: () => void;
}

const TONE_LABELS = {
  POSITIVE: "산업 호재",
  NEGATIVE: "시장 악재",
  NEUTRAL: "중립 분석",
} as const;

const APPLY_DELAY_MS = 720;
const AUTO_CLOSE_DELAY_MS = 1400;

function getIssueLabel(
  source: PendingEconomicNewsResolution["source"],
): string {
  switch (source) {
    case "NEWSPAPER":
      return "정규판";
    case "DEV":
      return "개발자 특별판";
    default:
      return "긴급 속보판";
  }
}

export function EconomicNewsModal({
  resolution,
  player,
  remainingArticleCount,
  cycle,
  canInteract,
  onApply,
  onClose,
}: EconomicNewsModalProps) {
  const [isApplying, setIsApplying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsApplying(false);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
 }, [
      resolution?.article.headline,
      resolution?.stage,
    ]);

  useEffect(() => {
    if (!resolution || resolution.stage !== "APPLIED" || !canInteract) return;

    const timerId = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [
    canInteract,
    onClose,
    resolution?.article.headline,
    resolution?.stage,
  ]);
      
  if (!resolution) return null;

  const applied = resolution.stage === "APPLIED";
  const toneClass = resolution.article.tone.toLowerCase();
  const isNewspaperVisit = resolution.source === "NEWSPAPER";
  const resultOwner = isNewspaperVisit
    ? player?.name ?? "플레이어"
    : "울산 시장 전체";
  const editionLabel = getIssueLabel(resolution.source);

  const handleApply = () => {
    if (!canInteract || applied || isApplying) return;

    setIsApplying(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onApply();
    }, APPLY_DELAY_MS);
  };

  return (
    <div
      className="economic-news-modal"
      role="dialog"
      aria-modal="true"
    >
      <section
        className={[
          "economic-news-modal__paper",
          `is-${toneClass}`,
          applied ? "is-applied" : "",
          isApplying ? "is-applying" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="economic-news-modal__masthead">
          <div className="economic-news-modal__edition">
            <span>제 {cycle}호</span>
            <b>{editionLabel}</b>
          </div>

          <div className="economic-news-modal__title">
            <small>ULSAN ECONOMIC DAILY</small>
            <strong>울산경제신문</strong>
            <span>산업도시 울산의 경제를 읽는 가장 빠른 지면</span>
          </div>

          <div className="economic-news-modal__price">
            <span>GAME EDITION</span>
            <b>무료 배포</b>
          </div>
        </header>

        <div className="economic-news-modal__rule" />

        <section className="economic-news-modal__lead">
          <div
            className={`economic-news-modal__tone economic-news-modal__tone--${toneClass}`}
          >
            {TONE_LABELS[resolution.article.tone]}
          </div>

          <h2>{resolution.article.headline}</h2>

          <p className="economic-news-modal__summary">
            {resolution.article.summary}
          </p>
        </section>

        <div className="economic-news-modal__columns">
          <article className="economic-news-modal__article">
            <span className="economic-news-modal__dropcap">
              {resolution.article.summary.trim().charAt(0)}
            </span>
            <p>
              {resolution.article.summary.length > 1
                ? resolution.article.summary.slice(1)
                : resolution.article.summary}
            </p>
            <p>
              이번 기사는 울산 지역 산업과 자산시장에 직접적인
              영향을 줄 수 있습니다. 적용 효과와 지속 기간은
              시장 상황에 따라 반영되며 사전에 모두 공개되지
              않습니다.
            </p>
          </article>

          <aside className="economic-news-modal__market-box">
            <div className="economic-news-modal__market-box-header">
              <span>MARKET IMPACT</span>
              <strong>시장 영향 분석</strong>
            </div>

            <div className="economic-news-modal__market-effect">
              <small>예상 효과</small>
              <strong>
                {resolution.article.effectDescription}
              </strong>
            </div>

            <dl>
              <div>
                <dt>반영 대상</dt>
                <dd>
                  {isNewspaperVisit
                    ? player?.name ?? "방문 플레이어"
                    : "시장 전체"}
                </dd>
              </div>
              <div>
                <dt>적용 시점</dt>
                <dd>뉴스 확인 즉시</dd>
              </div>
              <div>
                <dt>지속 기간</dt>
                <dd>비공개</dd>
              </div>
            </dl>
          </aside>
        </div>

        <section
          className={[
            "economic-news-modal__market-screen",
            applied ? "is-visible" : "",
            isApplying ? "is-running" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-live="polite"
        >
          <div className="economic-news-modal__ticker">
            <span>ULSAN MARKET</span>
            <b>
              {isApplying
                ? "기사 분석 및 시장 반영 중"
                : applied
                  ? "시장 반영 완료"
                  : "반영 대기"}
            </b>
          </div>

          <div className="economic-news-modal__bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>

          {applied && resolution.resultText && (
            <div className="economic-news-modal__result">
              <span>{resultOwner}</span>
              <strong>{resolution.resultText}</strong>
            </div>
          )}
        </section>

        <footer className="economic-news-modal__footer">
          <div>
            <span>
              {isNewspaperVisit
                ? `남은 기사 ${remainingArticleCount}개`
                : "울산경제 속보"}
            </span>
            <small>
              기사 내용은 시장 변동에 즉시 반영될 수 있습니다.
            </small>
          </div>

          <button
            type="button"
            disabled={!canInteract || isApplying}
            onClick={applied ? onClose : handleApply}
          >
            {!canInteract
              ? `${resolution.controllerPlayerId}님의 확인을 기다리는 중`
              : applied
                ? "신문 접기"
                : isApplying
                  ? "시장 반영 중"
                  : isNewspaperVisit
                    ? "기사 확인 및 시장 반영"
                    : "속보 확인"}
          </button>
        </footer>

        <div
          className="economic-news-modal__applied-mark"
          aria-hidden="true"
        >
          <span>MARKET APPLIED</span>
          <strong>시장 반영 완료</strong>
          <small>ULSAN ECONOMIC DAILY</small>
        </div>
      </section>
    </div>
  );
}
