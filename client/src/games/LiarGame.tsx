import { useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import type { ClientLiarGameState } from "../../../server/src/games/liar/types/liarGame";
import "./LiarGame.css";
import { useGameTimer } from "../hooks/useGameTimer";
import ChatPanel from "../components/chat/ChatPanel";
import ReactionPhase from "./liar/phases/ReactionPhase";
import ReadyPhase from "./liar/phases/ReadyPhase";
import VotingPhase from "./liar/phases/VotingPhase";
import PauseButton from "./components/PauseButton";
import TieSpeechPhase from "./liar/phases/TieSpeechPhase";
import LiarGuessPhase from "./liar/phases/LiarGuessPhase";
import GameEndPhase from "./liar/phases/GameEndPhase";
import ResultPhase from "./liar/phases/ResultPhase";
import {phaseLabel, statusLabel, formatScore,} from "./liar/utils/liarHelpers";
import ScoreBoard from "./components/ScoreBoard";

type LiarGameProps = {
  state: ClientLiarGameState | null;
};

export default function LiarGame({ state }: LiarGameProps) {
  const [descriptionText, setDescriptionText] = useState("");
  const [chatText, setChatText] = useState("");
  const [guessText, setGuessText] = useState("");
  const { remainingSeconds } = useGameTimer({
    timerEndsAt: state?.timerEndsAt ?? null,
    serverNow: state?.serverNow,
    paused: state?.paused ?? false,
    remainingTimeMs: state?.remainingTimeMs ?? null,
  });

  
  if (!state) {
    return (
      <div className="liar-layout">
        <div className="liar-loading">게임 정보를 불러오는 중...</div>
      </div>
    );
  }

  const handleSubmitVote = (targetId: string) => {
    socket.emit(EVENTS.LIAR_SUBMIT_VOTE, {
      roomId: state.roomId,
      targetId,
    });
  };    

  const handleTogglePause = () => {
    socket.emit(EVENTS.LIAR_TOGGLE_PAUSE, {
      roomId: state.roomId,
    });
  };  
      

  const amILiar =
    state.liarPlayerIds?.includes(socket.id ?? "") ?? false;

  if (state.phase === "READY_CHECK") {
    return (
      <ReadyPhase
        myKeyword={state.myKeyword}
        remainingSeconds={remainingSeconds}
        paused={state.paused}
        onTogglePause={handleTogglePause}
      />
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

  const canSendChat = state.phase !== "GAME_END";

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
    <LiarGuessPhase
      amILiar={amILiar}
      guessText={guessText}
      paused={state.paused}
      onChangeGuess={setGuessText}
      onSubmitGuess={handleSubmitGuess}
      onTogglePause={handleTogglePause}
    />
  );
}

  if (state.phase === "REACTION") {
    return (
      <ReactionPhase
        descriptions={state.descriptions}
        remainingSeconds={remainingSeconds}
        paused={state.paused}
        myPlayerId={socket.id ?? ""}
        onReaction={handleSubmitReaction}
        onTogglePause={handleTogglePause}
      />
    );
  }

  if (state.phase === "TIE_SPEECH") {
    return (
      <TieSpeechPhase
        players={state.players}
        tieCandidates={state.tieCandidates}
        remainingSeconds={remainingSeconds}
        paused={state.paused}
        onTogglePause={handleTogglePause}
      />
    );
  }

  if (state.phase === "VOTING" || state.phase === "REVOTE") {
    return (
      <VotingPhase
        state={state}
        myPlayerId={socket.id ?? ""}
        remainingSeconds={remainingSeconds}
        paused={state.paused}
        onVote={handleSubmitVote}
        onTogglePause={handleTogglePause}
      />
    );
  }

  if (state.phase === "RESULT") {
    return (
      <ResultPhase
        state={state}
        remainingSeconds={remainingSeconds}
        paused={state.paused}
        onTogglePause={handleTogglePause}
      />
    );
  }  


  if (state.phase === "GAME_END") {
    return <GameEndPhase players={state.players} />;
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

      <ScoreBoard
        players={scorePlayers}
        formatScore={formatScore}
      />
      </section>

      <ChatPanel
        title="일반 채팅"
        messages={state.normalChats}
        value={chatText}
        placeholder={
          canSendChat
            ? "채팅을 입력하세요."
            : "아직 채팅할 수 없습니다."
        }
        disabled={!canSendChat}
        emptyText={
          canSendChat
            ? "아직 채팅이 없습니다."
            : "아직 채팅할 수 없습니다."
        }
        onChange={setChatText}
        onSend={handleSendChat}
      />
    </div>
  );
}



