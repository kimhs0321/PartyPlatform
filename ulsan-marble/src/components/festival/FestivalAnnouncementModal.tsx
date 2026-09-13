import { useEffect, useState } from "react";
import "./FestivalAnnouncementModal.css";

import { getFestivalDefinition } from "../../game/festival/festivalData";
import type { PendingFestivalAnnouncement } from "../../game/festival/festivalTypes";

const CONFETTI_COUNT = 18;
const INTRO_DURATION_MS = 2200;


interface FestivalAnnouncementModalProps {
  announcement:
    PendingFestivalAnnouncement | null;

  canConfirm: boolean;

  onConfirm: () => void;
}

export function FestivalAnnouncementModal({
  announcement,
  canConfirm,
  onConfirm,
}: FestivalAnnouncementModalProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!announcement) return;

    const timeoutId = window.setTimeout(() => {
      setReady(true);
    }, INTRO_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [announcement]);

  if (!announcement) return null;

  const festival = getFestivalDefinition(
    announcement.festivalId,
  );

  return (
    <section
      className={`festival-announcement festival-announcement--${festival.theme.toLowerCase()}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="festival-announcement-title"
    >
      <div className="festival-announcement__backdrop" />

      <div className="festival-announcement__confetti" aria-hidden="true">
        {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
          <i key={index} style={{ ["--confetti-index" as string]: index }} />
        ))}
      </div>

      <article className="festival-announcement__panel">
        {festival.assets.symbolSrc && (
          <img
            className="festival-announcement__symbol"
            src={festival.assets.symbolSrc}
            alt=""
            aria-hidden="true"
          />
        )}

        <header className="festival-announcement__header">
          <span>{festival.kicker}</span>
          <strong>FESTIVAL OPEN</strong>
        </header>

        <div className="festival-announcement__mascot-stage">
          {festival.assets.mascots.map((mascot, index) => (
            <img
              key={`${mascot.src}-${index}`}
              className={`festival-announcement__mascot festival-announcement__mascot--${mascot.role.toLowerCase()}`}
              src={mascot.src}
              alt={mascot.alt}
              style={{ ["--mascot-index" as string]: index }}
            />
          ))}
        </div>

        <div className="festival-announcement__copy">
          {festival.assets.logoSrc && (
            <img
              className="festival-announcement__logo"
              src={festival.assets.logoSrc}
              alt=""
              aria-hidden="true"
            />
          )}

          <p>울산마블 축제 개최</p>
          <h2 id="festival-announcement-title">
            {festival.name}
          </h2>
          <span>{festival.description}</span>

          <div className="festival-announcement__effect">
            <small>축제 효과</small>
            <strong>{festival.effectLabel}</strong>
          </div>

          <div className="festival-announcement__departure">
            {festival.assets.departureMascotSrc && (
              <img
                src={festival.assets.departureMascotSrc}
                alt="관광객 출발을 알리는 동구 마스코트"
              />
            )}
            <div>
              <small>TOURIST NPC</small>
              <strong>관광객이 출발합니다!</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={
            !ready ||
            !canConfirm
          }
          onClick={onConfirm}
        >
          {!ready
            ? "축제 준비 중…"
            : canConfirm
              ? "축제 시작"
              : "현재 플레이어 확인 대기…"}
        </button>
      </article>
    </section>
  );
}
