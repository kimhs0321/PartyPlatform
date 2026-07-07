import type { ClientLiarGameState } from "../../../../../shared/types/liar/liarGame";
import PauseButton from "../../components/PauseButton";

type ReactionPhaseProps = {
  descriptions: ClientLiarGameState["descriptions"];
  remainingSeconds: number;
  paused: boolean;
  myPlayerId: string;
  onReaction: (
    targetPlayerId: string,
    reaction: "LIKE" | "DISLIKE"
  ) => void;
  onTogglePause: () => void;
};

export default function ReactionPhase({
  descriptions,
  remainingSeconds,
  paused,
  myPlayerId,
  onReaction,
  onTogglePause,
}: ReactionPhaseProps) {
  return (
    <div className="liar-layout">
      <section className="liar-ready-card">
        <span className="liar-muted">설명 완료</span>
        <h2>설명 평가 단계입니다</h2>
        <p>가장 좋은 설명과 가장 수상한 설명을 선택하세요.</p>

        <div className="liar-countdown">{remainingSeconds}</div>

        <PauseButton paused={paused} onClick={onTogglePause} />

        <div className="liar-reaction-list">
          {descriptions.map((description) => {
            const isMine = description.playerId === myPlayerId;
            const liked = description.likes.includes(myPlayerId);
            const disliked = description.dislikes.includes(myPlayerId);

            return (
              <div
                className={`liar-reaction-item
                  ${isMine ? "mine" : ""}
                  ${liked ? "liked" : ""}
                  ${disliked ? "disliked" : ""}
                `}
                key={`${description.playerId}-${description.createdAt}`}
              >
                <strong>{description.playerName}</strong>
                <p>{description.text}</p>

                <div className="liar-reaction-actions">
                  <button
                    disabled={isMine}
                    className={liked ? "active" : ""}
                    onClick={() => onReaction(description.playerId, "LIKE")}
                  >
                    👍 {description.likes.length}
                  </button>

                  <button
                    disabled={isMine}
                    className={disliked ? "active danger" : "danger"}
                    onClick={() => onReaction(description.playerId, "DISLIKE")}
                  >
                    👎 {description.dislikes.length}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}