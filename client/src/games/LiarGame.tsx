import { useEffect, useRef, useState } from "react";
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
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!chatListRef.current) return;

      chatListRef.current.scrollTo({
        top: chatListRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [state?.normalChats]);

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

  const handleTogglePause = () => {
    socket.emit(EVENTS.LIAR_TOGGLE_PAUSE, {
      roomId: state.roomId,
    });
  };  
      

  const amILiar =
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
          <PauseButton
              paused={state.paused}
              onClick={handleTogglePause}
          />
        </section>
      </div>
    );
  }

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

  const handleSubmitReaction = (
    targetPlayerId: string,
    reaction: "LIKE" | "DISLIKE"
  ) => {
    socket.emit(EVENTS.LIAR_SUBMIT_REACTION, {
      roomId: state.roomId,
      targetPlayerId,
      reaction,
    });
  };
  

  const handleSubmitGuess = () => {
  if (!guessText.trim()) return;

  socket.emit(EVENTS.LIAR_SUBMIT_GUESS, {
    roomId: state.roomId,
    guess: guessText,
  });

    setGuessText("");
  };

  const currentPlayerId =
    state.descriptionOrder.length > 0
      ? state.descriptionOrder[
          state.currentDescriptionIndex % state.descriptionOrder.length
        ]
      : undefined;
      
  const currentPlayer = state.players.find(
    (player) => player.playerId === currentPlayerId
  );

  const isMyTurn = currentPlayerId === socket.id;
  const canSubmitDescription = state.phase === "DESCRIPTION" && isMyTurn;
  const scorePlayers = [...state.players].sort(
    (a, b) => b.score - a.score
  );



  if (state.phase === "LIAR_GUESS") {
    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">라이어 추측</span>

          {amILiar ? (
            <>
              <h2>시민의 제시어를 맞혀보세요.</h2>

              <input
                className="liar-guess-input"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
                onKeyDown={(e)=>{
                  if (e.key === "Enter" && guessText.trim()) {
                              handleSubmitGuess();
                    }
                }}
                placeholder="제시어 입력"
              />

              <button
                  className="liar-guess-button"
                  disabled={!guessText.trim()}
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
        <PauseButton
          paused={state.paused}
          onClick={handleTogglePause}
        />

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

          <p>가장 좋은 설명과 가장 수상한 설명을 선택하세요.</p>

          <div className="liar-countdown">{remainingSeconds}</div>
          <PauseButton
              paused={state.paused}
              onClick={handleTogglePause}
          />

          <div className="liar-reaction-list">
            {state.descriptions.map((description) => {
              const isMine = description.playerId === socket.id;
              const liked = description.likes.includes(socket.id ?? "");
              const disliked = description.dislikes.includes(socket.id ?? "");

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
                      onClick={() =>
                        handleSubmitReaction(description.playerId, "LIKE")
                      }
                    >
                      👍 {description.likes.length}
                    </button>

                    <button
                      disabled={isMine}
                      className={disliked ? "active danger" : "danger"}
                      onClick={() =>
                        handleSubmitReaction(description.playerId, "DISLIKE")
                      }
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

  if (state.phase === "TIE_SPEECH") {
    const tiePlayers = state.players.filter((player) =>
      state.tieCandidates.includes(player.playerId)
    );

    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">동점 발생</span>

          <h2>최후 변론 시간입니다</h2>

          <p>동점 후보들은 자신이 라이어가 아님을 설명하세요.</p>

          <div className="liar-countdown">{remainingSeconds}</div>
          <PauseButton
            paused={state.paused}
            onClick={handleTogglePause}
          />

          <div className="liar-vote-list">
            {tiePlayers.map((player) => (
              <div className="liar-result-row selected" key={player.playerId}>
                <strong>{player.name}</strong>
                <span>동점 후보</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (state.phase === "VOTING" || state.phase === "REVOTE") {
    const isRevote = state.phase === "REVOTE";

    const votePlayers = isRevote
      ? state.players.filter((player) =>
          state.tieCandidates.includes(player.playerId)
        )
      : state.players;

    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">{isRevote ? "재투표" : "투표"}</span>

          <h2>
            {isRevote
              ? "동점 후보 중 다시 지목하세요"
              : "라이어를 지목하세요"}
          </h2>

          <p>
            {isRevote
              ? "최후 변론을 듣고 다시 투표하세요."
              : "가장 수상한 플레이어를 선택하세요."}
          </p>

          <div className="liar-countdown">{remainingSeconds}</div>
          <PauseButton
              paused={state.paused}
              onClick={handleTogglePause}
          />    


          <div className="liar-vote-list">
            {votePlayers
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
            <p>{isRevote ? "재투표를 완료했습니다." : "투표를 완료했습니다."}</p>
          )}
        </section>
      </div>
    );
  } 

  if (state.phase === "RESULT") {
    const liarPlayer = state.players.find(player =>
      state.liarPlayerIds.includes(player.playerId)
    );  

      const sortedPlayers = [...state.players].sort(
      (a, b) =>
        (state.voteCounts[b.playerId] ?? 0) -
        (state.voteCounts[a.playerId] ?? 0)    
    );

      const scoreChangedPlayers = [...state.players]
        .filter((player) => player.scoreDelta !== 0)
        .sort((a, b) => {
          if (b.scoreDelta !== a.scoreDelta) {
            return b.scoreDelta - a.scoreDelta;
          }

          return b.score - a.score;
        });

    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">
            Round {state.round} Result
          </span>

          <h1 className="liar-result-title">
            {state.resultMessage}
          </h1>

          <div className="liar-result-info">

            <div className="liar-result-card">
              <span>🕵️ 라이어</span>

              <strong className="liar-name">
                    {liarPlayer?.name}
              </strong>
            </div>

            <div className="liar-result-card">
              <span>📝 시민 제시어</span>

              <strong>{state.citizenKeyword}</strong>
            </div>

            <div className="liar-result-card">
              <span>❓ 라이어 추측</span>

              <strong>{state.liarGuess ?? "-"}</strong>
            </div>

          </div>

          <div className="liar-panel-title">
              득표 결과
          </div>
    
          <div className="liar-result-list">
              {sortedPlayers.map((player) => {
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

          <div className="liar-panel-title">
            점수 변화
          </div>

          <div className="liar-score-change-list">
            {scoreChangedPlayers.length === 0 ? (
              <p className="liar-empty">점수 변화가 없습니다.</p>
            ) : (
              scoreChangedPlayers.map((player) => (
                <div className="liar-score-change-item" key={player.playerId}>
                  <div>
                    <strong>{player.name}</strong>
                    <span>
                      {player.scoreDelta > 0 ? "+" : ""}
                      {formatScore(player.scoreDelta)}점
                    </span>
                  </div>

                  <ul>
                    {player.scoreReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          <p className="liar-next-round">
          다음 라운드 시작까지
          </p>
          <div className="liar-countdown">
            {remainingSeconds}
          </div>
          <PauseButton
              paused={state.paused}
              onClick={handleTogglePause}
          />
        </section>
      </div>
    );
  }

  if (state.phase === "GAME_END") {
    const rankedPlayers = [...state.players].sort(
      (a, b) => b.score - a.score
    );

    const winner = rankedPlayers[0];

    return (
      <div className="liar-layout">
        <section className="liar-ready-card">
          <span className="liar-muted">Game End</span>

          <h1 className="liar-result-title">🏆 게임 종료</h1>

          <div className="liar-result-card">
            <span>최종 우승자</span>
            <strong className="liar-name">{winner?.name}</strong>
          </div>

          <div className="liar-panel-title">최종 순위</div>

          <div className="liar-result-list">
            {rankedPlayers.map((player, index) => (
              <div
                className={`liar-result-row ${index === 0 ? "selected" : ""}`}
                key={player.playerId}
              >
                <strong>
                  {index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `${index + 1}위`}{" "}
                  {player.name}
                </strong>

                 <span>{formatScore(player.score)}점</span>
              </div>
            ))}
          </div>

          <p className="liar-next-round">
            방장이 게임 종료 버튼을 누르면 대기실로 돌아갑니다.
          </p>
        </section>
      </div>
    );
  }  
  

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

        <PauseButton
            paused={state.paused}
            onClick={handleTogglePause}
        />
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
            <span className="liar-muted">
              {state.phase === "DISCUSSION" ? "토론 시간" : "현재 차례"}
            </span>

            <strong>
              {state.phase === "DISCUSSION"
                ? "토론 채팅으로 라이어를 찾아보세요"
                : isMyTurn
                ? "내 차례입니다"
                : `${currentPlayer?.name ?? "알 수 없음"}님 설명 중`}
            </strong>
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
        </main>

       

        <aside className="liar-side-panel">
          <div className="liar-panel-title">점수판</div>

          <div className="liar-score-list">
            {scorePlayers.map((player) => (
              <div className="liar-score-row" key={player.playerId}>
                <span>{player.name}</span>
                <strong>{formatScore(player.score)}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="liar-bottom-panel">
          <div className="liar-panel-title">일반 채팅</div>

          <div className="liar-chat-list" ref={chatListRef}>
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
                if (event.key === "Enter" && chatText.trim()) {
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
    case "TIE_SPEECH":
      return "최후 변론";
    case "REVOTE":
      return "재투표";
    case "GAME_END":
      return "게임 종료";   
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

function formatScore(score: number) {
  return Number.isInteger(score)
    ? score.toString()
    : score.toFixed(1);
}

function PauseButton({
  paused,
  onClick,
}: {
  paused: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="liar-pause-button"
      onClick={onClick}
    >
      {paused ? "▶ 계속하기" : "⏸ 일시정지"}
    </button>
  );
}