import { useEffect } from "react";
import type {
  DisasterEventResult,
  DisasterType,
} from "../../game/disaster/disasterTypes";
import "./DisasterEffectLayer.css";

interface DisasterEffectLayerProps {
  event: DisasterEventResult | null;
  onComplete: (eventId: string) => void;
}

interface DisasterNewsContent {
  modifier: string;
  label: string;
  headline: string;
  message: string;
  ticker: string;
  imageSrc: string;
  imageAlt: string;
}

export const DISASTER_EFFECT_DURATION: Record<DisasterType, number> = {
  EARTHQUAKE: 5_000,
  HEAVY_RAIN: 5_000,
  WILDFIRE: 5_000,
  TYPHOON: 5_000,
};

/**
 * UlsanBoard의 기존 클래스 생성 코드와 호환하기 위해 유지한다.
 * 뉴스특보 전환 후에는 CSS 애니메이션에는 사용하지 않는다.
 */
export function getDisasterEffectModifier(type: DisasterType): string {
  return type.toLowerCase().replace(/_/g, "-");
}

const DISTRICT_NAMES: Record<string, string> = {
  JUNG: "중구",
  NAM: "남구",
  DONG: "동구",
  BUK: "북구",
  ULJU: "울주군",
};

const DISASTER_NEWS_CONTENT: Record<DisasterType, DisasterNewsContent> = {
  TYPHOON: {
    modifier: "typhoon",
    label: "태풍 경보",
    headline: "태풍이 울산 해안으로 접근 중입니다",
    message:
      "강한 바람과 많은 비가 예상됩니다. 해안과 저지대의 추가 피해에 주의해 주세요.",
    ticker:
      "강풍과 폭우로 피해 지역의 부동산 가치와 통행료에 재난 효과가 적용됩니다.",
    imageSrc: "/assets/disaster/typhoon-weather-map.png",
    imageAlt: "한반도로 접근하는 태풍 기상도",
  },
  HEAVY_RAIN: {
    modifier: "heavy-rain",
    label: "집중호우 경보",
    headline: "강한 비구름이 울산 지역에 머물고 있습니다",
    message:
      "짧은 시간에 많은 비가 집중되고 있습니다. 침수와 하천 범람 피해에 주의해 주세요.",
    ticker:
      "집중호우로 피해 지역의 부동산 가치와 통행료에 재난 효과가 적용됩니다.",
    imageSrc: "/assets/disaster/heavy-rain-radar.png",
    imageAlt: "울산 일대에 강한 비구름이 표시된 강수 레이더",
  },
  WILDFIRE: {
    modifier: "wildfire",
    label: "산불 확산 경보",
    headline: "산불이 인접 산림 지역으로 확산 중입니다",
    message:
      "건조한 날씨와 바람으로 산불의 확산 속도가 빨라지고 있습니다.",
    ticker:
      "산불로 피해 지역의 부동산 가치와 통행료에 재난 효과가 적용됩니다.",
    imageSrc: "/assets/disaster/wildfire-scene.png",
    imageAlt: "산 능선을 따라 확산하는 산불 피해 현장",
  },
  EARTHQUAKE: {
    modifier: "earthquake",
    label: "지진 발생",
    headline: "울산 지역에서 지진 피해가 확인됐습니다",
    message:
      "도로 균열과 일부 외벽 손상이 발생했습니다. 여진과 낙하물에 주의해 주세요.",
    ticker:
      "지진으로 피해 지역의 부동산 가치와 통행료에 재난 효과가 적용됩니다.",
    imageSrc: "/assets/disaster/earthquake-damage.png",
    imageAlt: "지진으로 도로가 갈라지고 일부 건물 외벽이 손상된 거리",
  },
};

function getDistrictLabel(event: DisasterEventResult): string {
  if (event.affectedDistrictIds.length === 0) {
    return "울산 전역";
  }

  return event.affectedDistrictIds
    .map((districtId) => DISTRICT_NAMES[districtId] ?? districtId)
    .join(" · ");
}

export function DisasterEffectLayer({
  event,
  onComplete,
}: DisasterEffectLayerProps) {
  useEffect(() => {
    if (!event) return;

    const eventId = event.id;
    const timerId = window.setTimeout(() => {
      onComplete(eventId);
    }, DISASTER_EFFECT_DURATION[event.type]);

    return () => window.clearTimeout(timerId);
  }, [event?.id, event?.type, onComplete]);

  if (!event) return null;

  const content = DISASTER_NEWS_CONTENT[event.type];

  return (
    <div
      className={`disaster-effect-layer disaster-effect-layer--${content.modifier}`}
      role="status"
      aria-live="assertive"
    >
      <section
        className={`disaster-news disaster-news--${content.modifier}`}
        aria-label={`${content.label} 재난특보`}
      >
        <header className="disaster-news__header">
          <div className="disaster-news__brand">
            <span className="disaster-news__live">● LIVE</span>
            <strong>울산마블 재난특보</strong>
          </div>

          <span className="disaster-news__turn">
            {event.turnNumber}턴 속보
          </span>
        </header>

        <div className="disaster-news__body">
          <figure className="disaster-news__visual">
            <img
              src={content.imageSrc}
              alt={content.imageAlt}
            />
            <figcaption>{content.label}</figcaption>
          </figure>

          <div className="disaster-news__report">
            <span className="disaster-news__warning">
              {content.label}
            </span>

            <h2>{content.headline}</h2>
            <p>{content.message}</p>

            <dl className="disaster-news__facts">
              <div>
                <dt>영향 지역</dt>
                <dd>{getDistrictLabel(event)}</dd>
              </div>

              <div>
                <dt>피해 부동산</dt>
                <dd>{event.propertyDamages.length}개</dd>
              </div>
            </dl>

            <div className="disaster-news__notice">
              <small>재난 안내</small>
              <strong>{event.description}</strong>
            </div>
          </div>
        </div>

        <footer className="disaster-news__ticker">
          <b>재난속보</b>
          <span>{content.ticker}</span>
        </footer>
      </section>
    </div>
  );
}