import {
  useEffect,
  useRef,
  useState,
} from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import type {
  ClientRelayDrawingGameState,
  RelayDrawingPoint,
  RelayDrawingStroke,
} from "../../../server/src/shared/types/relayDrawing";
import "./RelayDrawingGame.css";

type RelayDrawingGameProps = {
  state: ClientRelayDrawingGameState | null;
};

type RelayDrawingStrokeInput = Omit<
  RelayDrawingStroke,
  "playerId"
>;

const COLORS = [
  "#111111",
  "#e03131",
  "#f76707",
  "#ffd43b",
  "#2f9e44",
  "#1c7ed6",
  "#7048e8",
  "#7B4B2A",
];

const BRUSH_SIZES = [2, 4, 8, 14, 24];

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 560;

export default function RelayDrawingGame({
  state,
}: RelayDrawingGameProps) {
  const [message, setMessage] = useState("");
  const [selectedColor, setSelectedColor] =
    useState("#111111");
  const [brushSize, setBrushSize] = useState(4);
  const [currentStroke, setCurrentStroke] =
    useState<RelayDrawingPoint[]>([]);
  const [now, setNow] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] =
    useState(0);
  const [isEraser, setIsEraser] =
    useState(false);
  const [cursorPoint, setCursorPoint] =
    useState<RelayDrawingPoint | null>(null);

  const isDrawingRef = useRef(false);
  const chatListRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!state) return;

    setServerTimeOffset(
      Date.now() - state.serverNow,
    );
  }, [state?.serverNow]);

  useEffect(() => {
    if (!chatListRef.current) return;

    chatListRef.current.scrollTop =
      chatListRef.current.scrollHeight;
  }, [state?.chats]);

  useEffect(() => {
    /*
     * 그림 담당자가 변경되거나 그림 단계가 끝났을 때
     * 작성 중이던 로컬 선을 제거한다.
     */
    isDrawingRef.current = false;
    setCurrentStroke([]);
    setCursorPoint(null);
  }, [
    state?.currentDrawerPlayerId,
    state?.phase,
  ]);

  if (!state) {
    return (
      <div className="catchmind-loading">
        <h2>
          릴레이 드로잉 정보를 불러오는 중...
        </h2>
      </div>
    );
  }

  const estimatedServerNow =
    now - serverTimeOffset;

  const isCurrentDrawer =
    state.currentDrawerPlayerId === socket.id;

  const isGuesser =
    state.guesserPlayerId === socket.id;

  const canDraw =
    state.phase === "DRAWING" &&
    isCurrentDrawer;

  const canSendChat =
    (
        state.phase === "DRAWING" ||
        state.phase === "FINAL_GUESS"
    ) &&
    isGuesser;

  const guesser = state.players.find(
    (player) =>
      player.playerId === state.guesserPlayerId,
  );

  const currentDrawer = state.players.find(
    (player) =>
      player.playerId ===
      state.currentDrawerPlayerId,
  );

  const gameRemainingSeconds =
    state.gameEndsAt !== null
      ? Math.max(
          0,
          Math.ceil(
            (state.gameEndsAt -
              estimatedServerNow) /
              1000,
          ),
        )
      : 0;

  const phaseEndsAt =
    state.phase === "ROUND_RESULT"
      ? state.resultEndsAt
      : state.turnEndsAt;

  const phaseRemainingSeconds =
    phaseEndsAt !== null
      ? Math.max(
          0,
          Math.ceil(
            (phaseEndsAt -
              estimatedServerNow) /
              1000,
          ),
        )
      : 0;

  const latestResult =
    state.roundResults[
      state.roundResults.length - 1
    ];

  const leftPlayers =
    state.players.slice(0, 4);

  const rightPlayers =
    state.players.slice(4, 8);

  const getCanvasPoint = (
    event: React.MouseEvent<SVGSVGElement>,
  ): RelayDrawingPoint => {
    const svg = event.currentTarget;
    const ctm = svg.getScreenCTM();

    if (!ctm) {
      return {
        x: 0,
        y: 0,
      };
    }

    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformedPoint =
      point.matrixTransform(ctm.inverse());

    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    };
  };

  const handlePointerDown = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (!canDraw) return;

    const point = getCanvasPoint(event);

    setCursorPoint(point);
    isDrawingRef.current = true;
    setCurrentStroke([point]);
  };

  const handlePointerMove = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (!canDraw) return;

    const point = getCanvasPoint(event);

    setCursorPoint(point);

    if (!isDrawingRef.current) return;

    setCurrentStroke((previous) => [
      ...previous,
      point,
    ]);
  };

  const handlePointerEnter = (
    event: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (!canDraw) return;

    setCursorPoint(
      getCanvasPoint(event),
    );
  };

  const handlePointerLeave = () => {
    finishStroke();
    setCursorPoint(null);
  };

  const finishStroke = () => {
    if (
      !canDraw ||
      !isDrawingRef.current
    ) {
      return;
    }

    isDrawingRef.current = false;

    if (currentStroke.length === 0) {
      return;
    }

    const strokePoints =
      currentStroke.length === 1
        ? [
            currentStroke[0],
            currentStroke[0],
          ]
        : currentStroke;

    const stroke: RelayDrawingStrokeInput = {
    color: isEraser
        ? "#ffffff"
        : selectedColor,
    width: isEraser
        ? brushSize * 4
        : brushSize,
    points: strokePoints,
    };

    socket.emit(
      EVENTS.RELAY_DRAWING_DRAW,
      {
        roomId: state.roomId,
        stroke,
      },
    );

    setCurrentStroke([]);
  };

  const handleClearCanvas = () => {
    if (!canDraw) return;

    socket.emit(
      EVENTS.RELAY_DRAWING_CLEAR_CANVAS,
      {
        roomId: state.roomId,
      },
    );
  };

  const handleUndo = () => {
    if (!canDraw) return;

    socket.emit(
      EVENTS.RELAY_DRAWING_UNDO,
      {
        roomId: state.roomId,
      },
    );
  };

  const handleSendMessage = () => {
    if (!canSendChat) return;

    const text = message.trim();

    if (!text) return;

    socket.emit(
      EVENTS.RELAY_DRAWING_SEND_CHAT,
      {
        roomId: state.roomId,
        text,
      },
    );

    setMessage("");
  };

  if (state.phase === "GAME_END") {
    return (
      <RelayFinalResult
        successCount={state.successCount}
        failedCount={state.failedCount}
        roundResults={state.roundResults}
      />
    );
  }

  return (
    <section className="catchmind-game">
      <header className="catchmind-top">
        <div className="catchmind-timer">
          <span>전체 남은 시간</span>
          <strong>
            {gameRemainingSeconds}초
          </strong>
        </div>

        <div className="catchmind-round">
          성공 {state.successCount}개
          {" · "}
          실패 {state.failedCount}개
        </div>

        <div className="catchmind-hint">
          <span>
            {state.answer
              ? "제시어"
              : "제시어"}
          </span>

          <strong>
            {state.answer ?? "???"}
          </strong>
        </div>
      </header>

      <div className="catchmind-status">
        {state.phase ===
          "ROUND_PREPARE" && (
          <>
            문제 준비 중 ·{" "}
            <strong>
              {phaseRemainingSeconds}초
            </strong>
          </>
        )}

        {state.phase === "DRAWING" && (
          <>
            현재 그림 담당자:{" "}
            <strong>
              {currentDrawer?.name ??
                "확인 중"}
            </strong>
            {" · "}
            남은 시간{" "}
            <strong>
              {phaseRemainingSeconds}초
            </strong>
          </>
        )}

        {state.phase ===
          "ROUND_RESULT" && (
          <>
            문제 결과 · 다음 문제까지{" "}
            <strong>
              {phaseRemainingSeconds}초
            </strong>
          </>
        )}
      </div>

      <div className="relay-role-summary">
        <div>
          정답 담당자:{" "}
          <strong>
            {guesser?.name ?? "확인 중"}
          </strong>
          {isGuesser && " (나)"}
        </div>

        <div>
          그림 순서:{" "}
          {state.drawerOrder.map(
            (playerId, index) => {
              const player =
                state.players.find(
                  (candidate) =>
                    candidate.playerId ===
                    playerId,
                );

              const isActive =
                playerId ===
                state.currentDrawerPlayerId;

              return (
                <span
                  key={playerId}
                  className={
                    isActive
                      ? "relay-order-player active"
                      : "relay-order-player"
                  }
                >
                  {index + 1}.{" "}
                  {player?.name ??
                    "알 수 없음"}
                  {isActive ? " ▶" : ""}
                </span>
              );
            },
          )}
        </div>
      </div>

      <main className="catchmind-board-layout">
        <RelayPlayerColumn
          players={leftPlayers}
          guesserId={
            state.guesserPlayerId
          }
          drawerOrder={
            state.drawerOrder
          }
          currentDrawerId={
            state.currentDrawerPlayerId
          }
        />

        <section className="catchmind-center">
          <div className="catchmind-sketchbook">
            <svg
              className={`catchmind-canvas ${
                canDraw ? "drawable" : ""
              }`}
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              onMouseEnter={
                handlePointerEnter
              }
              onMouseDown={
                handlePointerDown
              }
              onMouseMove={
                handlePointerMove
              }
              onMouseUp={finishStroke}
              onMouseLeave={
                handlePointerLeave
              }
            >
              <rect
                x="0"
                y="0"
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="#ffffff"
              />

              {state.strokes.map(
                (stroke, index) => (
                  <PolylineStroke
                    key={index}
                    stroke={stroke}
                  />
                ),
              )}

              {currentStroke.length >=
                2 && (
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

              {canDraw &&
                cursorPoint && (
                  <circle
                    cx={cursorPoint.x}
                    cy={cursorPoint.y}
                    r={
                      isEraser
                        ? (brushSize *
                            4) /
                          2
                        : brushSize /
                          2
                    }
                    fill="none"
                    stroke={
                      isEraser
                        ? "#495057"
                        : selectedColor
                    }
                    strokeWidth={1.5}
                    opacity={0.85}
                    pointerEvents="none"
                  />
                )}
            </svg>

            {state.phase ===
              "ROUND_PREPARE" && (
              <div className="catchmind-result-overlay">
                <div className="catchmind-result-card">
                  <span className="catchmind-result-label">
                    다음 문제 준비
                  </span>

                  <strong className="catchmind-result-answer">
                    {phaseRemainingSeconds}
                  </strong>

                  <span>
                    정답 담당자:{" "}
                    {guesser?.name ??
                      "확인 중"}
                  </span>

                  <span>
                    첫 그림 담당자:{" "}
                    {state.players.find(
                      (player) =>
                        player.playerId ===
                        state.drawerOrder[0],
                    )?.name ??
                      "확인 중"}
                  </span>
                </div>
              </div>
            )}

            {state.phase ===
              "ROUND_RESULT" && (
              <div className="catchmind-result-overlay">
                <div className="catchmind-result-card">
                  <span className="catchmind-result-label">
                    정답
                  </span>

                  <strong className="catchmind-result-answer">
                    {state.answer ??
                      latestResult?.word ??
                      "공개되지 않음"}
                  </strong>

                  {latestResult?.success ? (
                    <span className="catchmind-result-success">
                      🎉 정답 성공
                    </span>
                  ) : (
                    <span className="catchmind-result-fail">
                      정답을 맞히지 못했습니다.
                    </span>
                  )}
                </div>
              </div>
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
                      selectedColor ===
                        color &&
                      !isEraser
                        ? "selected"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        color,
                    }}
                    disabled={!canDraw}
                    onClick={() => {
                      setSelectedColor(
                        color,
                      );
                      setIsEraser(false);
                    }}
                    aria-label={`색상 ${color}`}
                  />
                ))}

                <button
                  type="button"
                  className={`catchmind-eraser-button ${
                    isEraser
                      ? "selected"
                      : ""
                  }`}
                  disabled={!canDraw}
                  onClick={() =>
                    setIsEraser(true)
                  }
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
                {BRUSH_SIZES.map(
                  (size) => (
                    <button
                      key={size}
                      type="button"
                      className={`catchmind-size-button ${
                        brushSize ===
                        size
                          ? "selected"
                          : ""
                      }`}
                      disabled={!canDraw}
                      onClick={() =>
                        setBrushSize(
                          size,
                        )
                      }
                      aria-label={`선 굵기 ${size}`}
                    >
                      <span
                        style={{
                          width:
                            Math.min(
                              22,
                              Math.max(
                                4,
                                size,
                              ),
                            ),
                          height:
                            Math.min(
                              22,
                              Math.max(
                                4,
                                size,
                              ),
                            ),
                        }}
                      />
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="catchmind-tool-actions">
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
                onClick={
                  handleClearCanvas
                }
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
              {state.chats.length ===
              0 ? (
                <p className="catchmind-empty-chat">
                  {isGuesser
                    ? "정답을 입력하세요."
                    : "정답 담당자가 답을 맞히는 중입니다."}
                </p>
              ) : (
                state.chats.map(
                  (chat) => (
                    <p
                      key={`${chat.playerId}-${chat.createdAt}`}
                      className={
                        chat.playerName ===
                        "SYSTEM"
                          ? "catchmind-system-chat"
                          : ""
                      }
                    >
                      {chat.playerName ===
                      "SYSTEM" ? (
                        chat.text
                      ) : (
                        <>
                          <strong>
                            {
                              chat.playerName
                            }
                          </strong>
                          {`: ${chat.text}`}
                        </>
                      )}
                    </p>
                  ),
                )
              )}
            </div>

            <div className="catchmind-chat-input">
              <input
                value={message}
                disabled={!canSendChat}
                placeholder={
                  isGuesser
                    ? state.phase ===
                      "DRAWING"
                      ? "정답을 입력하세요."
                      : "그림 시작을 기다리는 중입니다."
                    : "정답 담당자만 입력할 수 있습니다."
                }
                onChange={(event) =>
                  setMessage(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleSendMessage();
                  }
                }}
              />

              <button
                type="button"
                disabled={!canSendChat}
                onClick={
                  handleSendMessage
                }
              >
                전송
              </button>
            </div>
          </section>
        </section>

        <RelayPlayerColumn
          players={rightPlayers}
          guesserId={
            state.guesserPlayerId
          }
          drawerOrder={
            state.drawerOrder
          }
          currentDrawerId={
            state.currentDrawerPlayerId
          }
        />
      </main>
    </section>
  );
}

type DrawableStroke = Pick<
  RelayDrawingStroke,
  "color" | "width" | "points"
>;


function PolylineStroke({
  stroke,
}: {
  stroke: DrawableStroke;
}) {
  const points = stroke.points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
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

function RelayPlayerColumn({
  players,
  guesserId,
  drawerOrder,
  currentDrawerId,
}: {
  players:
    ClientRelayDrawingGameState["players"];
  guesserId: string | null;
  drawerOrder: string[];
  currentDrawerId: string | null;
}) {
  return (
    <aside className="catchmind-player-column">
      {players.map((player) => {
        const drawerIndex =
          drawerOrder.indexOf(
            player.playerId,
          );

        const isGuesser =
          player.playerId === guesserId;

        const isCurrentDrawer =
          player.playerId ===
          currentDrawerId;

        return (
          <div
            className={`catchmind-player-card ${
              isCurrentDrawer
                ? "drawer"
                : ""
            }`}
            key={player.playerId}
          >
            <div className="catchmind-avatar">
              {player.name.slice(0, 1)}
            </div>

            <div className="catchmind-player-info">
              <strong>
                {player.name}
              </strong>

              <span>
                {!player.isConnected
                  ? "나감"
                  : isGuesser
                    ? "🎯 정답 담당"
                    : drawerIndex >= 0
                      ? `${drawerIndex + 1}번째 그림`
                      : "대기 중"}
              </span>

              {isCurrentDrawer && (
                <strong>
                  ✏ 현재 그림 중
                </strong>
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function RelayFinalResult({
  successCount,
  failedCount,
  roundResults,
}: {
  successCount: number;
  failedCount: number;
  roundResults:
    ClientRelayDrawingGameState["roundResults"];
}) {
  return (
    <section className="catchmind-final-result">
      <div className="catchmind-winner-panel">
        <div className="catchmind-winner-trophy">
          🤝
        </div>

        <span className="catchmind-winner-label">
          릴레이 드로잉 종료
        </span>

        <div className="catchmind-winner-score">
          성공 {successCount}개
        </div>

        <div>
          실패 {failedCount}개
        </div>
      </div>

      <div className="catchmind-final-ranking">
        <div className="catchmind-final-ranking-header">
          <span>문제</span>
          <span>제시어</span>
          <span>결과</span>
        </div>

        {roundResults.map((result) => (
          <div
            key={result.roundNumber}
            className="catchmind-final-ranking-row"
          >
            <span>
              {result.roundNumber}
            </span>

            <strong>
              {result.word}
            </strong>

            <span>
              {result.success
                ? "✅ 성공"
                : "❌ 실패"}
            </span>
          </div>
        ))}
      </div>

      <p className="catchmind-final-return">
        잠시 후 방으로 돌아갑니다.
      </p>
    </section>
  );
}