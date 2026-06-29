import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import type { ClientLiarGameState } from "../../../shared/types/liar/liarGame";
import "./LiarGame.css";

type LiarGameProps = {
  state: ClientLiarGameState | null;
};

export default function LiarGame({ state }: LiarGameProps) {
  const [descriptionText, setDescriptionText] = useState("");
  const [chatText, setChatText] = useState("");
  const [guessText, setGuessText] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (!state) {
    return (
      <div className="liar-layout">
        <div className="liar-loading">게임 정보를 불러오는 중...</div>
      </div>
    );
  }

  const remainingSeconds = state.timerEndsAt
    ? Math.max(0, Math.ceil((state.timerEndsAt - now) / 1000))
    : 0;

  

  const isLiar =
    state.liarPlayerIds?.includes(socket.id ?? "") ?? false;

  if (state.phase === "READY_CHECK") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">라이어 게임</span>
          <h2>제시어를 확인하세요</h2>
          <div className="liar-keyword-card">
            <span>내 제시어</span>
            <strong>{state.myKeyword}</strong>
          </div>
          <p>잠시 후 설명 단계가 시작됩니다.</p>
          <div className="liar-countdown">{remainingSeconds}</div>
        </section>
      </div>
    );
  }

  const handleSubmitGuess = () => {
    if (!guessText.trim()) return;

    socket.emit(EVENTS.LIAR_SUBMIT_GUESS, {
      roomId: state.roomId,
      guess: guessText,
    });

    setGuessText("");
  };

  if (state.phase === "LIAR_GUESS") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">라이어 추측</span>

          {isLiar ? (
            <>
              <h2>시민의 제시어를 맞혀보세요.</h2>

              <input
                className="liar-guess-input"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
                placeholder="제시어 입력"
              />

              <button
                className="liar-guess-button"
                onClick={handleSubmitGuess}
              >
                확인
              </button>
            </>
          ) : (
            <>
              <h2>라이어가 제시어를 추측하고 있습니다.</h2>
              <p>잠시 기다려 주세요.</p>
            </>
          )}
        </section>
      </div>
    );
  }

  if (state.phase === "REACTION") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">설명 완료</span>
          <h2>설명 평가 단계입니다</h2>
          <p>잠시 후 토론이 시작됩니다.</p>
          <div className="liar-countdown">{remainingSeconds}</div>
        </section>
      </div>
    );
  }

  if (state.phase === "VOTING") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">투표</span>

          <h2>라이어를 지목하세요</h2>

          <p>가장 수상한 플레이어를 선택하세요.</p>

          <div className="liar-countdown">{remainingSeconds}</div>

          <div className="liar-vote-list">
            {state.players
              .filter((player) => player.playerId !== socket.id)
              .map((player) => (
                <button
                  key={player.playerId}
                  className="liar-vote-button"
                  disabled={Boolean(state.votes[socket.id ?? ""])}
                  onClick={() =>
                    socket.emit(EVENTS.LIAR_SUBMIT_VOTE, {
                      roomId: state.roomId,
                      targetId: player.playerId,
                    })
                  }
                >
                  {player.name}
                </button>
              ))}
          </div>

          {state.votes[socket.id ?? ""] && (
            <p>투표를 완료했습니다.</p>
          )}
        </section>
      </div>
    );
  }  

  if (state.phase === "RESULT") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">라운드 결과</span>

          <h2>{state.resultMessage}</h2>

          <p>투표 결과</p>

          <div className="liar-result-list">
            {state.players.map((player) => {
              const voteCount = state.voteCounts[player.playerId] ?? 0;
              const isTop = state.topVotedPlayerIds.includes(player.playerId);
              const isLiar = state.liarPlayerIds.includes(player.playerId);

              return (
                <div
                  key={player.playerId}
                  className={`liar-result-row ${isTop ? "selected" : ""} ${
                    isLiar ? "liar" : ""
                  }`}
                >
                  <strong>{player.name}</strong>

                  <span>{voteCount}표</span>

                  {isTop && <span>🎯 최다 득표</span>}
                  {isLiar && <span>🕵️ 라이어</span>}
                </div>
              );
            })}
          </div>

          <div className="liar-countdown">{remainingSeconds}</div>
        </section>
      </div>
    );
  }

  const currentPlayerId = state.descriptionOrder[state.currentDescriptionIndex];
  const currentPlayer = state.players.find(
    (player) => player.playerId === currentPlayerId
  );

  const isMyTurn = currentPlayerId === socket.id;
  const canSubmitDescription = state.phase === "DESCRIPTION" && isMyTurn;

  const handleSubmitDescription = () => {
    if (!canSubmitDescription) return;

    socket.emit(EVENTS.LIAR_SUBMIT_DESCRIPTION, {
      roomId: state.roomId,
      text: descriptionText,
    });

    setDescriptionText("");
  };

  const canSendChat = state.phase === "DISCUSSION";

  const handleSendChat = () => {
    if (!canSendChat) return;

    socket.emit(EVENTS.LIAR_SEND_CHAT, {
      roomId: state.roomId,
      text: chatText,
    });

    setChatText("");
  };

  return (
    <div className="liar-layout">
      <section className="liar-topbar">
        <div>
          <span className="liar-muted">라운드</span>
          <strong>{state.round}</strong>
        </div>

        <div>
          <span className="liar-muted">단계</span>
          <strong>{phaseLabel(state.phase)}</strong>
        </div>

        <div>
          <span className="liar-muted">남은 시간</span>
          <strong>{remainingSeconds}초</strong>
        </div>

        <div className="liar-keyword-mini">
          <span className="liar-muted">내 제시어</span>
          <strong>{state.myKeyword}</strong>
        </div>
      </section>

      <section className="liar-main-grid">
        <aside className="liar-side-panel">
          <div className="liar-panel-title">설명 순서</div>

          <div className="liar-order-list">
            {state.descriptionOrder.map((playerId, index) => {
              const player = state.players.find((p) => p.playerId === playerId);
              const isCurrent = playerId === currentPlayerId;

              return (
                <div
                  key={playerId}
                  className={`liar-order-row ${isCurrent ? "active" : ""}`}
                >
                  <span className="liar-order-number">{index + 1}</span>
                  <span className="liar-order-name">
                    {player?.name ?? "알 수 없음"}
                  </span>
                  <span className="liar-order-status">
                    {statusLabel(player?.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="liar-center-panel">
          <div className="liar-current-turn">
            <span className="liar-muted">현재 차례</span>
            <strong>
              {isMyTurn
                ? "내 차례입니다"
                : `${currentPlayer?.name ?? "알 수 없음"}님 설명 중`}
            </strong>
          </div>

          <div className="liar-description-box">
            <div className="liar-panel-title">설명 입력</div>

            <textarea
              value={descriptionText}
              onChange={(event) => setDescriptionText(event.target.value)}
              disabled={!canSubmitDescription}
              maxLength={state.settings.maxDescriptionLength}
              placeholder={
                canSubmitDescription
                  ? "제시어를 직접 쓰지 말고 설명하세요."
                  : "현재 설명 차례가 아닙니다."
              }
            />

            <div className="liar-input-footer">
              <span>
                {descriptionText.length} / {state.settings.maxDescriptionLength}
              </span>

              <button
                onClick={handleSubmitDescription}
                disabled={!canSubmitDescription}
              >
                설명 제출
              </button>
            </div>
          </div>

          <div className="liar-log-panel">
            <div className="liar-panel-title">설명 기록</div>

            {state.descriptions.length === 0 ? (
              <p className="liar-empty">아직 작성된 설명이 없습니다.</p>
            ) : (
              <div className="liar-description-list">
                {state.descriptions.map((description) => (
                  <div
                    className="liar-description-item"
                    key={`${description.playerId}-${description.createdAt}`}
                  >
                    <strong>{description.playerName}</strong>
                    <p>{description.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="liar-side-panel">
          <div className="liar-panel-title">점수판</div>

          <div className="liar-score-list">
            {state.players.map((player) => (
              <div className="liar-score-row" key={player.playerId}>
                <span>{player.name}</span>
                <strong>{player.score}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="liar-bottom-panel">
          <div className="liar-panel-title">일반 채팅</div>

          <div className="liar-chat-list">
            {state.normalChats.length === 0 ? (
              <p className="liar-empty">
                {canSendChat
                  ? "아직 채팅이 없습니다."
                  : "토론 단계에서 활성화됩니다."}
              </p>
            ) : (
              state.normalChats.map((chat) => (
                <div className="liar-chat-item" key={`${chat.playerId}-${chat.createdAt}`}>
                  <strong>{chat.playerName}</strong>
                  <span>{chat.text}</span>
                </div>
              ))
            )}
          </div>

          <div className="liar-chat-input">
            <input
              value={chatText}
              onChange={(event) => setChatText(event.target.value)}
              disabled={!canSendChat}
              placeholder={
                canSendChat
                  ? "토론 내용을 입력하세요."
                  : "토론 단계에서만 채팅할 수 있습니다."
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSendChat();
                }
              }}
            />

            <button onClick={handleSendChat} disabled={!canSendChat}>
              전송
            </button>
          </div>
        </section>
    </div>
  );
}

function phaseLabel(phase: string) {
  switch (phase) {
    case "READY_CHECK":
      return "준비";
    case "DESCRIPTION":
      return "설명";
    case "REACTION":
      return "평가";
    case "DISCUSSION":
      return "토론";
    case "VOTING":
      return "투표";
    case "LIAR_GUESS":
      return "라이어 추측";  
    case "RESULT":
      return "결과";
    default:
      return phase;
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "진행";
    case "DONE":
      return "완료";
    case "WAITING":
      return "대기";
    case "LEFT":
      return "퇴장";
    default:
      return "-";
  }
}