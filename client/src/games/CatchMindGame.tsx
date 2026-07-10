import { useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import type {
  ClientCatchMindGameState,
  DrawingPoint,
  DrawingStroke,
} from "../../../server/src/games/catchMind/types/catchMindGame";
import "./CatchMindGame.css";

type CatchMindGameProps = {
  state: ClientCatchMindGameState | null;
};

const COLORS = [
  "#111111", // 검정
  "#e03131", // 빨강
  "#1c7ed6", // 파랑
  "#2f9e44", // 초록
  "#ffd43b", // 노랑
];

const BRUSH_SIZES = [2, 4, 8];

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 560;

export default function CatchMindGame({ state }: CatchMindGameProps) {
  const [message, setMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(4);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
  const [now, setNow] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isEraser, setIsEraser] = useState(false);

  const isDrawingRef = useRef(false);
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!state) return;

    setServerTimeOffset(Date.now() - state.serverNow);
  }, [state?.serverNow]);

  useEffect(() => {
    if (!chatListRef.current) return;

    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [state?.chats]);

  if (!state) {
    return (
      <div className="catchmind-loading">
        <h2>캐치마인드 게임 정보를 불러오는 중...</h2>
      </div>
    );
  }

  const isDrawer = state.currentDrawerPlayerId === socket.id;
  const canDraw = state.phase === "DRAWING" && isDrawer;

  const currentDrawer = state.players.find(
    (player) => player.playerId === state.currentDrawerPlayerId
  );

  const leftPlayers = state.players.slice(0, 4);
  const rightPlayers = state.players.slice(4, 8);

  const getCanvasPoint = (
    event: React.MouseEvent<SVGSVGElement>
  ): DrawingPoint => {
    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();

    if (!ctm) {
      return { x: 0, y: 0 };
    }

    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformedPoint = point.matrixTransform(ctm.inverse());

    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    };
  };

  const handlePointerDown = (
    event: React.MouseEvent<SVGSVGElement>
  ) => {
    if (!canDraw) return;

    isDrawingRef.current = true;
    setCurrentStroke([getCanvasPoint(event)]);
  };

  const handlePointerMove = (
    event: React.MouseEvent<SVGSVGElement>
  ) => {
    if (!canDraw || !isDrawingRef.current) return;

    const point = getCanvasPoint(event);

    setCurrentStroke((prev) => [...prev, point]);
  };

  const finishStroke = () => {
    if (!canDraw || !isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (currentStroke.length < 2) {
      setCurrentStroke([]);
      return;
    }

    const stroke: DrawingStroke = {
      color: isEraser ? "#ffffff" : selectedColor,
      width: isEraser ? brushSize * 4 : brushSize,
      points: currentStroke,
    };

    socket.emit(EVENTS.CATCH_MIND_DRAW, {
      roomId: state.roomId,
      stroke,
    });

    setCurrentStroke([]);
  };

  const handleClearCanvas = () => {
    if (!canDraw) return;

    socket.emit(EVENTS.CATCH_MIND_CLEAR_CANVAS, {
      roomId: state.roomId,
    });
  };

  const handleUndo = () => {
    if (!canDraw) return;

    socket.emit(EVENTS.CATCH_MIND_UNDO, {
      roomId: state.roomId,
    });
  };

  const handleSkip = () => {
    if (!canDraw) return;
    if (!state.settings.allowDrawerSkip) return;

    socket.emit(EVENTS.CATCH_MIND_SKIP, {
      roomId: state.roomId,
    });
};
  const handleSendMessage = () => {
    const text = message.trim();

    if (!text) return;

    socket.emit(EVENTS.CATCH_MIND_SEND_CHAT, {
      roomId: state.roomId,
      text,
    });

    setMessage("");
  };

  const handleSelectWord = (word: string) => {
    socket.emit(EVENTS.CATCH_MIND_SELECT_WORD, {
      roomId: state.roomId,
      word,
    });
  };

  const displayRemainingSeconds =
    state.timerEndsAt !== null
      ? Math.max(
          0,
          Math.ceil(
            (state.timerEndsAt - (now - serverTimeOffset)) / 1000
          )
        )
      : state.remainingSeconds;

  return (
    <section className="catchmind-game">
      <header className="catchmind-top">
        <div className="catchmind-timer">
          <span>남은 시간</span>
          <strong>{displayRemainingSeconds}초</strong>
        </div>

        <div className="catchmind-round">
          Round {state.round} / {state.settings.roundCount}
        </div>

        <div className="catchmind-hint">
          <span>{isDrawer ? "제시어" : "힌트"}</span>

          <strong>
            {isDrawer
              ? state.answer || "준비 중"
              : state.hint || "준비 중"}
          </strong>
        </div>
      </header>

      <div className="catchmind-status">
        현재 출제자:{" "}
        <strong>{currentDrawer?.name ?? "확인 중"}</strong>

        {!canDraw && isDrawer && " · 그림 단계가 아닙니다"}
        {!isDrawer && " · 정답을 입력하세요"}
      </div>

      <main className="catchmind-board-layout">
        <PlayerColumn
          players={leftPlayers}
          drawerId={state.currentDrawerPlayerId}
          phase={state.phase}
        />

        <section className="catchmind-center">
          <div className="catchmind-sketchbook">
            {state.phase === "WORD_SELECT" ? (
              <div className="catchmind-word-select">
                <h3>제시어를 선택하세요</h3>

                {isDrawer ? (
                  <div className="catchmind-word-options">
                    {state.wordCandidates.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => handleSelectWord(word)}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>출제자가 제시어를 선택하는 중입니다.</p>
                )}
              </div>
            ) : (
              <>
                <svg
                  className={`catchmind-canvas ${
                    canDraw ? "drawable" : ""
                  }`}
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={finishStroke}
                  onMouseLeave={finishStroke}
                >
                  <rect
                    x="0"
                    y="0"
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    fill="#ffffff"
                  />

                  {state.strokes.map((stroke, index) => (
                    <PolylineStroke
                      key={index}
                      stroke={stroke}
                    />
                  ))}

                  {currentStroke.length >= 2 && (
                    <PolylineStroke
                      stroke={{
                        color: isEraser
                          ? "#ffffff"
                          : selectedColor,
                        width: isEraser
                          ? brushSize * 4
                          : brushSize,
                        points: currentStroke,
                      }}
                    />
                  )}
                </svg>

                {state.phase === "ROUND_RESULT" && (
                  <div className="catchmind-result-overlay">
                    <div className="catchmind-result-card">
                      <span className="catchmind-result-label">
                        정답
                      </span>

                      <strong className="catchmind-result-answer">
                        {state.answer ?? "공개되지 않음"}
                      </strong>

                      {state.guessedPlayerIds.length > 0 ? (
                        <>
                          <span className="catchmind-result-success">
                            🎉 정답자가 나왔습니다
                          </span>

                          {state.players
                            .filter((player) =>
                              state.guessedPlayerIds.includes(
                                player.playerId
                              )
                            )
                            .map((player) => (
                              <div
                                className="catchmind-result-winner"
                                key={player.playerId}
                              >
                                <strong>{player.name}</strong>
                                <span>
                                  +{player.scoreDelta}점
                                </span>
                              </div>
                            ))}
                        </>
                      ) : (
                        <span className="catchmind-result-fail">
                          아무도 정답을 맞히지 못했습니다.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="catchmind-tools">
            <div className="catchmind-tool-group">
              <span className="catchmind-tool-label">
                색상
              </span>

              <div className="catchmind-color-list">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`catchmind-color-button ${
                      selectedColor === color && !isEraser
                        ? "selected"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={!canDraw}
                    onClick={() => {
                      setSelectedColor(color);
                      setIsEraser(false);
                    }}
                    aria-label={`색상 ${color}`}
                  />
                ))}

                <button
                  type="button"
                  className={`catchmind-eraser-button ${
                    isEraser ? "selected" : ""
                  }`}
                  disabled={!canDraw}
                  onClick={() => setIsEraser(true)}
                  aria-label="지우개"
                  title="지우개"
                >
                  🧽
                </button>
              </div>
            </div>

            <div className="catchmind-tool-group">
              <span className="catchmind-tool-label">
                굵기
              </span>

              <div className="catchmind-size-list">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`catchmind-size-button ${
                      brushSize === size ? "selected" : ""
                    }`}
                    disabled={!canDraw}
                    onClick={() => setBrushSize(size)}
                    aria-label={`선 굵기 ${size}`}
                  >
                    <span
                      style={{
                        width: size * 3,
                        height: size * 3,
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="catchmind-tool-actions">
              {state.settings.allowDrawerSkip && isDrawer && (
                <button
                  type="button"
                  className="catchmind-skip-button"
                  disabled={!canDraw}
                  onClick={handleSkip}
                  title="이번 문제 스킵"
                >
                  스킵
                </button>
              )}

              <button
                type="button"
                className="catchmind-undo-button"
                disabled={!canDraw}
                onClick={handleUndo}
                title="마지막 선 취소"
              >
                ↶
              </button>

              <button
                type="button"
                className="catchmind-clear-button"
                disabled={!canDraw}
                onClick={handleClearCanvas}
                title="전체 지우기"
              >
                🗑
              </button>
            </div>
          </div>
          
          <section className="catchmind-chat">
            <div
              className="catchmind-chat-list"
              ref={chatListRef}
            >
              {state.chats.length === 0 ? (
                <p className="catchmind-empty-chat">
                  아직 채팅이 없습니다.
                </p>
              ) : (
                state.chats.map((chat) => (
                  <p
                    key={`${chat.playerId}-${chat.createdAt}`}
                    className={
                      chat.playerName === "SYSTEM"
                        ? "catchmind-system-chat"
                        : ""
                    }
                  >
                    {chat.playerName === "SYSTEM" ? (
                      chat.text
                    ) : (
                      <>
                        <strong>{chat.playerName}</strong>
                        {`: ${chat.text}`}
                      </>
                    )}
                  </p>
                ))
              )}
            </div>

            <div className="catchmind-chat-input">
              <input
                value={message}
                placeholder="정답 또는 채팅을 입력하세요."
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleSendMessage}
              >
                전송
              </button>
            </div>
          </section>
        </section>

        <PlayerColumn
          players={rightPlayers}
          drawerId={state.currentDrawerPlayerId}
          phase={state.phase}
        />
      </main>
    </section>
  );
}

function PolylineStroke({
  stroke,
}: {
  stroke: DrawingStroke;
}) {
  const points = stroke.points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <polyline
      points={points}
      fill="none"
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function PlayerColumn({
  players,
  drawerId,
  phase,
}: {
  players: ClientCatchMindGameState["players"];
  drawerId: string | null;
  phase: ClientCatchMindGameState["phase"];
}) {
  return (
    <aside className="catchmind-player-column">
      {players.map((player) => (
        <div
          className={`catchmind-player-card ${
            player.playerId === drawerId ? "drawer" : ""
          } ${
            player.status === "GUESSED"
              ? "guessed"
              : ""
          }`}
          key={player.playerId}
        >
          <div className="catchmind-avatar">
            {player.name.slice(0, 1)}
          </div>

          <div className="catchmind-player-info">
            <strong>{player.name}</strong>

            <div className="catchmind-score-row">
              <span>점수 {player.score}</span>

              {phase === "ROUND_RESULT" && player.scoreDelta > 0 && (
                <strong className="catchmind-score-delta">
                  +{player.scoreDelta}
                </strong>
              )}
            </div>

            <span>
              {player.playerId === drawerId
                ? "✏ 출제자"
                : player.status === "GUESSED"
                  ? "✅ 정답"
                  : player.status === "LEFT"
                    ? "나감"
                    : "도전 중"}
            </span>
          </div>
        </div>
      ))}
    </aside>
  );
}