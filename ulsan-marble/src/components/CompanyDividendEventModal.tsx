import type {
  CompanyDividendEvent,
  CompanyDividendEventType,
} from "../game/stock/companyDividendTypes";

import "./CompanyDividendEventModal.css";


interface CompanyDividendEventModalProps {
  event:
    CompanyDividendEvent
    | null;

  onConfirm: () => void;
}


const EVENT_LABELS:
  Record<
    CompanyDividendEventType,
    string
  > = {
    DIVIDEND_UP:
      "배당 확대",

    DIVIDEND_DOWN:
      "배당 축소",

    SPECIAL_DIVIDEND:
      "특별배당",

    DIVIDEND_SUSPENDED:
      "배당 중단",
  };


function getEventModifier(
  type:
    CompanyDividendEventType,
): string {
  switch (type) {
    case "DIVIDEND_UP":
    case "SPECIAL_DIVIDEND":
      return "positive";

    case "DIVIDEND_DOWN":
    case "DIVIDEND_SUSPENDED":
      return "negative";
  }
}


function formatRatePoint(
  rate: number,
): string {
  const percentage =
    rate * 100;

  const sign =
    percentage > 0
      ? "+"
      : "";

  return `${sign}${percentage.toFixed(
    1,
  )}%p`;
}


function getEffectText(
  event:
    CompanyDividendEvent,
): string {
  switch (event.type) {
    case "DIVIDEND_UP":
      return `정기 배당률 ${formatRatePoint(
        event.persistentRateDelta,
      )}`;

    case "DIVIDEND_DOWN":
      return `정기 배당률 ${formatRatePoint(
        event.persistentRateDelta,
      )}`;

    case "SPECIAL_DIVIDEND":
      return `다음 정기 배당에 ${formatRatePoint(
        event.specialDividendRate,
      )} 특별배당`;

    case "DIVIDEND_SUSPENDED":
      return "다음 정기 배당 1회 중단";
  }
}


export function CompanyDividendEventModal({
  event,
  onConfirm,
}: CompanyDividendEventModalProps) {
  if (!event) {
    return null;
  }

  const modifier =
    getEventModifier(
      event.type,
    );

  return (
    <div
      className="company-dividend-event-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-dividend-event-title"
    >
      <section
        className={[
          "company-dividend-event-modal",
          `is-${modifier}`,
        ].join(" ")}
      >
        <header className="company-dividend-event-modal__header">
          <div>
            <span>
              ULSAN EXCHANGE
            </span>

            <strong>
              COMPANY DISCLOSURE
            </strong>
          </div>

          <small>
            {event.turnNumber}턴
          </small>
        </header>

        <div className="company-dividend-event-modal__rule" />

        <section className="company-dividend-event-modal__company">
          <div>
            <span>
              {event.ticker}
            </span>

            <strong>
              {event.companyName}
            </strong>
          </div>

          <div
            className={[
              "company-dividend-event-modal__badge",
              `is-${modifier}`,
            ].join(" ")}
          >
            {EVENT_LABELS[
              event.type
            ]}
          </div>
        </section>

        <section className="company-dividend-event-modal__news">
          <span>
            기업 공시
          </span>

          <h2
            id="company-dividend-event-title"
          >
            {event.headline}
          </h2>

          <p>
            {event.summary}
          </p>
        </section>

        <section className="company-dividend-event-modal__effect">
          <span>
            DIVIDEND POLICY
          </span>

          <small>
            배당정책 변경
          </small>

          <strong>
            {getEffectText(
              event,
            )}
          </strong>

          <p>
            정기 배당금은 보유 주식 수와
            배당 정산 시점의 주가를 기준으로
            계산됩니다.
          </p>
        </section>

        <footer className="company-dividend-event-modal__footer">
          <div>
            <span>
              울산 증권거래소 기업공시
            </span>

            <small>
              ULSAN EXCHANGE
            </small>
          </div>

          <button
            type="button"
            onClick={onConfirm}
          >
            확인
          </button>
        </footer>
      </section>
    </div>
  );
}