import "./TouristTurnModal.css";

import { getFestivalDefinition } from "../../game/festival/festivalData";
import type { PendingTouristTurnResult } from "../../game/festival/festivalTypes";

const DICE_FACE: Record<number, string> = {
  1: "⚀",
  2: "⚁",
  3: "⚂",
  4: "⚃",
  5: "⚄",
  6: "⚅",
};

interface TouristTurnModalProps {
  result:
    PendingTouristTurnResult | null;

  canConfirm: boolean;

  onConfirm: () => void;
}

export function TouristTurnModal({
  result,
  canConfirm,
  onConfirm,
}: TouristTurnModalProps) {
  if (!result) return null;

  const festival = getFestivalDefinition(result.festivalId);
  const resultText = result.completedLap
    ? "관광객이 출발점을 통과해 한 바퀴를 완주했습니다."
    : result.landingKind === "OWNED_PROPERTY"
      ? `${result.ownerName} 소유의 ${result.propertyName}에 도착했습니다.`
      : result.landingKind === "UNOWNED_PROPERTY"
        ? `${result.propertyName}에 도착했지만 소유자가 없습니다.`
        : `${result.landedTileName}에 도착했습니다. 특수 타일 효과는 적용하지 않습니다.`;

  const mascotSrc = result.completedLap
    ? festival.assets.completionMascotSrc
    : festival.assets.departureMascotSrc;

  return (
    <section
      className="tourist-turn-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tourist-turn-title"
    >
      <article>
        <header>
          <span>TOURIST NPC TURN</span>
          <strong>{festival.shortName}</strong>
        </header>

        <div className="tourist-turn-modal__dice" aria-label={`주사위 ${result.diceValues[0]}, ${result.diceValues[1]}`}>
          <b>{DICE_FACE[result.diceValues[0]]}</b>
          <b>{DICE_FACE[result.diceValues[1]]}</b>
        </div>

        {mascotSrc && (
          <img
            className="tourist-turn-modal__mascot"
            src={mascotSrc}
            alt="축제 관광객 안내 마스코트"
          />
        )}

        <div className="tourist-turn-modal__copy">
          <p>{result.diceValues[0] + result.diceValues[1]}칸 이동</p>
          <h2 id="tourist-turn-title">
            {result.completedLap ? "축제 종료" : result.landedTileName}
          </h2>
          <span>{resultText}</span>
        </div>

        {result.landingKind === "OWNED_PROPERTY" && (
          <div className="tourist-turn-modal__settlement">
            <span>
              <small>축제 적용 통행료</small>
              <strong>{result.finalToll.toLocaleString("ko-KR")}만원</strong>
            </span>
            <i aria-hidden="true">× 60%</i>
            <span>
              <small>은행 관광 수익 지급</small>
              <strong>+{result.bankPayout.toLocaleString("ko-KR")}만원</strong>
            </span>
          </div>
        )}

        {result.completedLap && (
          <div className="tourist-turn-modal__finish">
            관광객 NPC가 사라지고 {festival.name} 효과가 종료됩니다.
          </div>
        )}

        <button
          type="button"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {canConfirm
            ? "확인"
            : "현재 플레이어 확인 대기…"}
        </button>
      </article>
    </section>
  );
}
