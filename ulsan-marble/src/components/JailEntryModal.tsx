import { useEffect, useMemo, useState } from "react";

import "./JailEntryModal.css";

import type { PlayerTokenData } from "./PlayerToken";

interface JailEntryModalProps {
  player:
    PlayerTokenData | null;
  canConfirm: boolean;
  onConfirm: () => void;
}

const ENTRY_READY_DELAY = 500;

export function JailEntryModal({
  player,
  canConfirm,
  onConfirm,
}: JailEntryModalProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);

    if (!player) return;

    const timerId = window.setTimeout(() => {
      setIsReady(true);
    }, ENTRY_READY_DELAY);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [player?.id]);

  const detaineeNumber = useMemo(() => {
    if (!player) return "------";

    const id = String(player.id)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6)
      .toUpperCase();

    return id.padStart(6, "0");
  }, [player]);

  if (!player) return null;

  return (
    <div className="jail-entry-overlay">
      <div className="jail-entry-overlay__warning" aria-hidden="true">
        DETENTION AREA
      </div>

      <section
        className={`jail-entry-modal${isReady ? " is-ready" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jail-entry-title"
      >
        <header className="jail-entry-modal__header">
          <div>
            <span>ULSAN MARBLE DETENTION CENTER</span>
            <strong>울산마블 구치소</strong>
          </div>
          <b>입소 처리</b>
        </header>

        <div className="jail-entry-modal__scene">
          <div className="jail-entry-modal__warning-light" aria-hidden="true" />

          <div className="jail-entry-modal__cell">
            <div
              className="jail-entry-modal__silhouette"
              aria-hidden="true"
            >
              <i className="jail-entry-modal__silhouette-head" />
              <i className="jail-entry-modal__silhouette-neck" />

              <div className="jail-entry-modal__silhouette-torso">
                <i className="jail-entry-modal__silhouette-shoulder jail-entry-modal__silhouette-shoulder--left" />
                <i className="jail-entry-modal__silhouette-chest" />
                <i className="jail-entry-modal__silhouette-shoulder jail-entry-modal__silhouette-shoulder--right" />
              </div>
            </div>

            <div className="jail-entry-modal__height-lines" aria-hidden="true">
              <i>180</i>
              <i>160</i>
              <i>140</i>
            </div>

            <div className="jail-entry-modal__bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>

          <div className="jail-entry-modal__booking-board">
            <small>DETAINEE RECORD</small>
            <h2 id="jail-entry-title">{player.name}</h2>
            <dl>
              <div>
                <dt>수감번호</dt>
                <dd>{detaineeNumber}</dd>
              </div>
              <div>
                <dt>처리 상태</dt>
                <dd>차례 즉시 종료</dd>
              </div>
            </dl>
          </div>
        </div>

        <section className="jail-entry-modal__rules">
          <div>
            <span>01</span>
            <p>
              다음 자기 차례부터 <strong>더블 탈출</strong>에 도전합니다.
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              최대 3회 실패 시 <strong>150만원 벌금</strong>을 납부합니다.
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              수감 중 보유 부동산의 통행료 수익은 <strong>30% 감소</strong>합니다.
            </p>
          </div>
        </section>

        <button
          type="button"
          className="jail-entry-modal__confirm"
          disabled={!isReady || !canConfirm}
          onClick={onConfirm}
        >
          {isReady ? "수감 처리 완료" : "철문 폐쇄 중"}
        </button>
      </section>
    </div>
  );
}
