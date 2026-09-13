import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlayerTokenData } from "../PlayerToken";
import {
  createDiceValue,
  DICE_SYMBOLS,
  type DiceValue,
} from "../../game/dice";
import {
  getCurrentMiniGamePlayerId,
  getMiniGameDefinition,
  MINI_GAME_BET_OPTIONS,
  MINI_GAME_PRIZE_AMOUNT,
} from "../../game/minigame/minigameRules";
import type {
  HighLowChoice,
  MiniGameError,
  OddEvenChoice,
  PendingMiniGame,
} from "../../game/minigame/minigameTypes";
import {
  MiniGameDiceStage,
  MINI_GAME_DICE_ROLL_MS,
  MINI_GAME_DICE_SETTLE_MS,
} from "./MiniGameDiceStage";
import "./MiniGameModal.css";

interface MiniGameModalProps {
  game: PendingMiniGame | null;
  players: PlayerTokenData[];
  localPlayerId?: string;
  error: MiniGameError | null;
  onTimingStop: (distance: number, responseMs: number) => void;
  onRollTargetDice: (
    values: [DiceValue, DiceValue],
  ) => void;
  onBetOddEven: (
    choice: OddEvenChoice,
    amount: number,
  ) => void;
  onBetHighLow: (
    choice: HighLowChoice,
    amount: number,
  ) => void;
  onPassBet: () => void;
  onClose: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(
  error: MiniGameError | null,
): string | null {
  switch (error) {
    case "NOT_CURRENT_PLAYER":
      return "현재 참가자의 차례가 아닙니다.";
    case "INVALID_BET":
      return "배팅 선택과 금액을 확인해 주세요.";
    case "INSUFFICIENT_CASH":
      return "현금이 부족합니다. 일반예금은 자동으로 사용되지 않습니다.";
    case "PAYMENT_FAILED":
      return "상금 또는 배팅금 정산에 실패했습니다.";
    case "WRONG_GAME":
      return "현재 미니게임에서 사용할 수 없는 행동입니다.";
    case "NO_PENDING_MINIGAME":
      return "진행 중인 미니게임이 없습니다.";
    default:
      return null;
  }
}

function getTimingPosition(elapsedMs: number): number {
  const phase =
    ((Math.max(0, elapsedMs) % 2_000) + 2_000) %
    2_000;
  return phase <= 1_000
    ? phase / 1_000
    : 2 - phase / 1_000;
}

function getGameClassName(
  gameId: PendingMiniGame["gameId"],
): string {
  return gameId.toLowerCase().replace(/_/g, "-");
}

const TIMING_STOP_HOLD_MS = 1_000;
const HIGH_LOW_FIRST_FLIP_DELAY_MS = 180;
const HIGH_LOW_SECOND_FLIP_DELAY_MS = 900;
const HIGH_LOW_RESULT_REVEAL_MS = 1_750;

interface HighLowCardProps {
  label: string;
  value: number | string;
  flipped: boolean;
  tone: "first" | "second";
}

function HighLowCard({
  label,
  value,
  flipped,
  tone,
}: HighLowCardProps) {
  return (
    <div
      className={`arena-high-low-card arena-high-low-card--${tone}${
        flipped ? " is-flipped" : ""
      }`}
      aria-label={
        flipped
          ? `${label} ${value}`
          : `${label} 비공개 카드`
      }
    >
      <div className="arena-high-low-card__inner">
        <div
          className="arena-high-low-card__face arena-high-low-card__back"
          aria-hidden={flipped}
        >
          <span>ULSAN MARBLE</span>
          <strong>
            HIGH
            <br />
            LOW
          </strong>
          <small>UM CARD</small>
        </div>

        <div
          className="arena-high-low-card__face arena-high-low-card__front"
          aria-hidden={!flipped}
        >
          <span>{label}</span>
          <strong>{value}</strong>
          <small>
            {tone === "first" ? "BASE CARD" : "RESULT CARD"}
          </small>
        </div>
      </div>
    </div>
  );
}

export function MiniGameModal({
  game,
  players,
  localPlayerId,
  error,
  onTimingStop,
  onRollTargetDice,
  onBetOddEven,
  onBetHighLow,
  onPassBet,
  onClose,
}: MiniGameModalProps) {
  const [betAmount, setBetAmount] = useState<number>(
    MINI_GAME_BET_OPTIONS[0],
  );
  const [oddEvenChoice, setOddEvenChoice] =
    useState<OddEvenChoice>("ODD");
  const [highLowChoice, setHighLowChoice] =
    useState<HighLowChoice>("HIGH");
  const [targetDiceValues, setTargetDiceValues] =
    useState<[DiceValue, DiceValue]>([1, 1]);
  const [targetDiceRolling, setTargetDiceRolling] =
    useState(false);
  const [targetDiceSettling, setTargetDiceSettling] =
    useState(false);
  const [resultDiceRolling, setResultDiceRolling] =
    useState(false);
  const [resultRevealPending, setResultRevealPending] =
    useState(false);
  const [timingMarkerPosition, setTimingMarkerPosition] =
    useState(0);
  const [timingStopPending, setTimingStopPending] =
    useState(false);
  const [highLowFirstFlipped, setHighLowFirstFlipped] =
    useState(false);
  const [highLowSecondFlipped, setHighLowSecondFlipped] =
    useState(false);

  const actionStartedAtRef = useRef(Date.now());
  const timingStartedAtRef = useRef(performance.now());
  const actionHandledRef = useRef(false);
  const targetRollTimeoutRef = useRef<number | null>(
    null,
  );
  const targetSettleTimeoutRef = useRef<number | null>(
    null,
  );
  const resultRevealTimeoutRef = useRef<number | null>(
    null,
  );
  const timingAnimationFrameRef = useRef<number | null>(
    null,
  );
  const timingStopTimeoutRef = useRef<number | null>(
    null,
  );
  const highLowFirstFlipTimeoutRef = useRef<number | null>(
    null,
  );
  const highLowSecondFlipTimeoutRef = useRef<number | null>(
    null,
  );

  const playerMap = useMemo(
    () =>
      new Map(
        players.map((player) => [player.id, player]),
      ),
    [players],
  );

  const currentPlayerId =
    getCurrentMiniGamePlayerId(game);
  const currentPlayer = currentPlayerId
    ? playerMap.get(currentPlayerId) ?? null
    : null;
  const canControlCurrentPlayer =
    !localPlayerId ||
    currentPlayerId ===
      localPlayerId;

  const canCloseMiniGame =
    !localPlayerId ||
    game?.arrivalPlayerId ===
    localPlayerId;
  const actionKey = game
    ? `${game.gameId}-${game.round}-${game.currentPlayerIndex}-${game.stage}`
    : "none";
  const resultKey =
    game?.stage === "RESULT"
      ? `${game.gameId}-${game.round}-${game.resultText ?? ""}`
      : "none";

  const startTargetDiceRoll = useCallback(() => {
    if (
      !canControlCurrentPlayer ||
      actionHandledRef.current
    ) {
      return;
    }

    actionHandledRef.current = true;
    const nextValues: [DiceValue, DiceValue] = [
      createDiceValue(),
      createDiceValue(),
    ];

    setTargetDiceValues(nextValues);
    setTargetDiceRolling(true);
    setTargetDiceSettling(false);

    if (targetRollTimeoutRef.current !== null) {
      window.clearTimeout(targetRollTimeoutRef.current);
      targetRollTimeoutRef.current = null;
    }

    if (targetSettleTimeoutRef.current !== null) {
      window.clearTimeout(
        targetSettleTimeoutRef.current,
      );
      targetSettleTimeoutRef.current = null;
    }

    targetRollTimeoutRef.current =
      window.setTimeout(() => {
        setTargetDiceRolling(false);
        setTargetDiceSettling(true);
        targetRollTimeoutRef.current = null;

        targetSettleTimeoutRef.current =
          window.setTimeout(() => {
            onRollTargetDice(nextValues);
            setTargetDiceSettling(false);
            targetSettleTimeoutRef.current = null;
          }, MINI_GAME_DICE_SETTLE_MS);
      }, MINI_GAME_DICE_ROLL_MS);
  }, [onRollTargetDice,canControlCurrentPlayer,]);

  const holdTimingStop = useCallback(
    (position: number, responseMs: number) => {
      if (actionHandledRef.current) return;

      actionHandledRef.current = true;
      setTimingMarkerPosition(position);
      setTimingStopPending(true);

      if (timingAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          timingAnimationFrameRef.current,
        );
        timingAnimationFrameRef.current = null;
      }

      if (timingStopTimeoutRef.current !== null) {
        window.clearTimeout(
          timingStopTimeoutRef.current,
        );
      }

      timingStopTimeoutRef.current =
        window.setTimeout(() => {
          setTimingStopPending(false);
          onTimingStop(
            Math.abs(position - 0.5),
            responseMs,
          );
          timingStopTimeoutRef.current = null;
        }, TIMING_STOP_HOLD_MS);
    },
    [onTimingStop],
  );

  useEffect(() => {
    if (!game || game.stage !== "PLAYING") return;

    if (targetRollTimeoutRef.current !== null) {
      window.clearTimeout(targetRollTimeoutRef.current);
      targetRollTimeoutRef.current = null;
    }
    if (targetSettleTimeoutRef.current !== null) {
      window.clearTimeout(
        targetSettleTimeoutRef.current,
      );
      targetSettleTimeoutRef.current = null;
    }
    if (timingStopTimeoutRef.current !== null) {
      window.clearTimeout(
        timingStopTimeoutRef.current,
      );
      timingStopTimeoutRef.current = null;
    }

    actionStartedAtRef.current = Date.now();
    timingStartedAtRef.current = performance.now();
    actionHandledRef.current = false;
    setBetAmount(MINI_GAME_BET_OPTIONS[0]);
    setOddEvenChoice("ODD");
    setHighLowChoice("HIGH");
    setTargetDiceRolling(false);
    setTargetDiceSettling(false);
    setTimingMarkerPosition(0);
    setTimingStopPending(false);
  }, [actionKey, game]);

  useEffect(() => {
    if (timingAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(
        timingAnimationFrameRef.current,
      );
      timingAnimationFrameRef.current = null;
    }

    if (
      !game ||
      game.stage !== "PLAYING" ||
      game.gameId !== "TIMING_STOP"
    ) {
      return;
    }

    const updateTimingMarker = () => {
      const elapsed =
        performance.now() - timingStartedAtRef.current;

      setTimingMarkerPosition(
        getTimingPosition(elapsed),
      );

      if (!actionHandledRef.current) {
        timingAnimationFrameRef.current =
          window.requestAnimationFrame(
            updateTimingMarker,
          );
      } else {
        timingAnimationFrameRef.current = null;
      }
    };

    timingAnimationFrameRef.current =
      window.requestAnimationFrame(
        updateTimingMarker,
      );

    return () => {
      if (timingAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          timingAnimationFrameRef.current,
        );
        timingAnimationFrameRef.current = null;
      }
    };
  }, [actionKey, game]);

  useEffect(() => {
    if (highLowFirstFlipTimeoutRef.current !== null) {
      window.clearTimeout(
        highLowFirstFlipTimeoutRef.current,
      );
      highLowFirstFlipTimeoutRef.current = null;
    }

    if (highLowSecondFlipTimeoutRef.current !== null) {
      window.clearTimeout(
        highLowSecondFlipTimeoutRef.current,
      );
      highLowSecondFlipTimeoutRef.current = null;
    }

    if (
      !game ||
      game.stage !== "PLAYING" ||
      game.gameId !== "HIGH_LOW"
    ) {
      return;
    }

    setHighLowFirstFlipped(false);
    setHighLowSecondFlipped(false);

    highLowFirstFlipTimeoutRef.current =
      window.setTimeout(() => {
        setHighLowFirstFlipped(true);
        highLowFirstFlipTimeoutRef.current = null;
      }, HIGH_LOW_FIRST_FLIP_DELAY_MS);

    return () => {
      if (highLowFirstFlipTimeoutRef.current !== null) {
        window.clearTimeout(
          highLowFirstFlipTimeoutRef.current,
        );
        highLowFirstFlipTimeoutRef.current = null;
      }
    };
  }, [actionKey, game]);

  useEffect(() => {
    if (resultRevealTimeoutRef.current !== null) {
      window.clearTimeout(
        resultRevealTimeoutRef.current,
      );
      resultRevealTimeoutRef.current = null;
    }

    if (
      !game ||
      game.stage !== "RESULT" ||
      (game.gameId !== "ODD_EVEN" &&
        game.gameId !== "HIGH_LOW")
    ) {
      setResultDiceRolling(false);
      setResultRevealPending(false);
      return;
    }

    setResultRevealPending(true);

    if (game.gameId === "ODD_EVEN") {
      setResultDiceRolling(true);

      resultRevealTimeoutRef.current =
        window.setTimeout(() => {
          setResultDiceRolling(false);

          resultRevealTimeoutRef.current =
            window.setTimeout(() => {
              setResultRevealPending(false);
              resultRevealTimeoutRef.current = null;
            }, MINI_GAME_DICE_SETTLE_MS);
        }, MINI_GAME_DICE_ROLL_MS);

      return;
    }

    setResultDiceRolling(false);
    setHighLowFirstFlipped(false);
    setHighLowSecondFlipped(false);

    highLowFirstFlipTimeoutRef.current =
      window.setTimeout(() => {
        setHighLowFirstFlipped(true);
        highLowFirstFlipTimeoutRef.current = null;
      }, HIGH_LOW_FIRST_FLIP_DELAY_MS);

    highLowSecondFlipTimeoutRef.current =
      window.setTimeout(() => {
        setHighLowSecondFlipped(true);
        highLowSecondFlipTimeoutRef.current = null;
      }, HIGH_LOW_SECOND_FLIP_DELAY_MS);

    resultRevealTimeoutRef.current =
      window.setTimeout(() => {
        setResultRevealPending(false);
        resultRevealTimeoutRef.current = null;
      }, HIGH_LOW_RESULT_REVEAL_MS);
  }, [resultKey]);

  useEffect(
    () => () => {
      if (targetRollTimeoutRef.current !== null) {
        window.clearTimeout(
          targetRollTimeoutRef.current,
        );
      }

      if (targetSettleTimeoutRef.current !== null) {
        window.clearTimeout(
          targetSettleTimeoutRef.current,
        );
      }

      if (resultRevealTimeoutRef.current !== null) {
        window.clearTimeout(
          resultRevealTimeoutRef.current,
        );
      }

      if (timingAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          timingAnimationFrameRef.current,
        );
      }

      if (timingStopTimeoutRef.current !== null) {
        window.clearTimeout(
          timingStopTimeoutRef.current,
        );
      }

      if (highLowFirstFlipTimeoutRef.current !== null) {
        window.clearTimeout(
          highLowFirstFlipTimeoutRef.current,
        );
      }

      if (highLowSecondFlipTimeoutRef.current !== null) {
        window.clearTimeout(
          highLowSecondFlipTimeoutRef.current,
        );
      }
    },
    [],
  );

  if (!game) return null;

  const definition =
    getMiniGameDefinition(game.gameId);
  const errorMessage = getErrorMessage(error);
  const winner = game.winnerPlayerId
    ? playerMap.get(game.winnerPlayerId) ?? null
    : null;
  const participantIds =
    game.gameId === "TIMING_STOP" ||
    game.gameId === "TARGET_DICE"
      ? game.roundPlayerIds
      : game.eligiblePlayerIds;
  const completedCount =
    game.gameId === "TIMING_STOP" ||
    game.gameId === "TARGET_DICE"
      ? game.attempts.length
      : game.bets.length;

  const lastTargetAttempt =
    game.gameId === "TARGET_DICE" &&
    game.attempts.length > 0
      ? game.attempts[game.attempts.length - 1]
      : null;
  const targetDisplayValues =
    targetDiceRolling || targetDiceSettling
      ? targetDiceValues
      : lastTargetAttempt?.diceValues ??
        targetDiceValues;

  const handleTimingStop = () => {
    if (
      !canControlCurrentPlayer ||
      actionHandledRef.current
    ) {
      return;
    }

    const elapsed =
      performance.now() - timingStartedAtRef.current;
    const position = getTimingPosition(elapsed);
    holdTimingStop(
      position,
      Date.now() - actionStartedAtRef.current,
    );
  };

  const handleOddEvenBet = () => {
    if (
      !canControlCurrentPlayer ||
      actionHandledRef.current
    ) {
      return;
    }
    actionHandledRef.current = true;
    onBetOddEven(oddEvenChoice, betAmount);
  };

  const handleHighLowBet = () => {
    if (
      !canControlCurrentPlayer ||
      actionHandledRef.current
    ) {
      return;
    }
    actionHandledRef.current = true;
    onBetHighLow(highLowChoice, betAmount);
  };

  const handlePassBet = () => {
    if (
      !canControlCurrentPlayer ||
      actionHandledRef.current
    ) {
      return;
    }
    actionHandledRef.current = true;
    onPassBet();
  };

  const winnerTargetAttempt =
    game.gameId === "TARGET_DICE" &&
    game.winnerPlayerId
      ? game.attempts.find(
          (attempt) =>
            attempt.playerId ===
            game.winnerPlayerId,
        ) ?? null
      : null;

  return (
    <div className="minigame-arena-overlay">
      <section
        className={`minigame-arena minigame-arena--${getGameClassName(
          game.gameId,
        )}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="minigame-arena-title"
      >
        <header className="minigame-arena__header">
          <div className="minigame-arena__brand">
            <span>UM</span>
            <div>
              <small>ULSAN MINI GAME ARENA</small>
              <strong>울산 미니게임 경기장</strong>
            </div>
          </div>

          <div className="minigame-arena__title">
            <span>
              {definition.category === "PRIZE"
                ? "순위 경쟁"
                : "현금 배팅"}
              {game.round > 1
                ? ` · ${game.round}라운드 재대결`
                : ""}
            </span>
            <h2 id="minigame-arena-title">
              {definition.name}
            </h2>
            <p>{definition.description}</p>
          </div>

          <div className="minigame-arena__reward">
            <small>
              {definition.category === "PRIZE"
                ? "우승 상금"
                : "배당 기준"}
            </small>
            <strong>
              {definition.category === "PRIZE"
                ? formatMoney(
                    MINI_GAME_PRIZE_AMOUNT,
                  )
                : "적중 시 2배"}
            </strong>
          </div>
        </header>

        <div className="minigame-arena__status">
          <div className="minigame-arena__participants">
            {participantIds.map(
              (playerId, index) => {
                const player =
                  playerMap.get(playerId);
                const isCurrent =
                  game.stage === "PLAYING" &&
                  index ===
                    game.currentPlayerIndex;
                const isCompleted =
                  index < completedCount;

                return (
                  <span
                    key={playerId}
                    className={[
                      isCurrent
                        ? "is-current"
                        : "",
                      isCompleted
                        ? "is-completed"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <b>{index + 1}</b>
                    {player?.name ?? playerId}
                  </span>
                );
              },
            )}
          </div>

          {game.stage === "PLAYING" &&
            currentPlayer && (
              <div className="minigame-arena__turn">
                <span>
                  현재 참가자
                  <strong>
                    {currentPlayer.name}
                  </strong>
                  <small>
                    현금{" "}
                    {formatMoney(
                      currentPlayer.money,
                    )}
                  </small>
                </span>

                <b>
                  {targetDiceRolling
                    ? "ROLL"
                    : targetDiceSettling
                      ? "RESULT"
                      : "진행 중"}
                </b>
              </div>
            )}
        </div>

        {game.resultText &&
          game.stage === "PLAYING" && (
            <p className="minigame-arena__notice">
              {game.resultText}
            </p>
          )}

        {game.stage === "PLAYING" && (
          <div className="minigame-arena__play-layout">
            <main className="minigame-arena__stage">
              {game.gameId ===
                "TIMING_STOP" && (
                <div
                  className="arena-timing"
                  key={actionKey}
                >
                  <div className="arena-timing__instruction">
                    <span>목표</span>
                    <strong>
                      {timingStopPending
                        ? "정지 위치 확인"
                        : "중앙의 금색 구간에서 정지"}
                    </strong>
                    <small>
                      {timingStopPending
                        ? `중앙 오차 ${Math.abs(
                            timingMarkerPosition - 0.5,
                          ).toFixed(3)} · 잠시 후 다음 참가자로 넘어갑니다.`
                        : "표시가 중앙에 가까울수록 기록이 좋아집니다."}
                    </small>
                  </div>

                  <div className="arena-timing__board">
                    <div className="arena-timing__scale">
                      <span>0.500</span>
                      <b>정확한 중앙</b>
                      <span>0.500</span>
                    </div>
                    <div className="arena-timing__track">
                      <div
                        className="arena-timing__safe"
                        aria-hidden="true"
                      />
                      <div
                        className="arena-timing__center"
                        aria-hidden="true"
                      />
                      <div
                        className="arena-timing__marker"
                        style={{
                          left: `calc(${timingMarkerPosition * 100}% - 10px)`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="minigame-arena__primary-action"
                    disabled={!canControlCurrentPlayer || timingStopPending}
                    onClick={handleTimingStop}
                  >
                    {timingStopPending
                      ? "정지!"
                      : "지금 멈추기"}
                  </button>
                </div>
              )}

              {game.gameId ===
                "TARGET_DICE" && (
                <div className="arena-target-dice">
                  <div className="arena-target-dice__target">
                    <span>이번 목표 합계</span>
                    <strong>
                      {game.targetNumber}
                    </strong>
                    <small>
                      두 주사위의 합을 목표에
                      가장 가깝게 만드세요.
                    </small>
                  </div>

                  <MiniGameDiceStage
                    values={targetDisplayValues}
                    rolling={
                      targetDiceRolling
                    }
                    label="최근 투척"
                    resultLabel={
                      lastTargetAttempt
                        ? `합계 ${lastTargetAttempt.total} · 목표 차이 ${lastTargetAttempt.distance}`
                        : "투척 대기"
                    }
                  />

                  <button
                    type="button"
                    className="minigame-arena__primary-action"
                    disabled={ !canControlCurrentPlayer || targetDiceRolling || targetDiceSettling}
                    onClick={
                      startTargetDiceRoll
                    }
                  >
                    {targetDiceRolling
                      ? "주사위 굴리는 중"
                      : targetDiceSettling
                        ? "결과 확인 중"
                        : "주사위 던지기"}
                  </button>
                </div>
              )}

              {game.gameId === "ODD_EVEN" &&
                currentPlayer && (
                  <div className="arena-betting">
                    <div className="arena-betting__headline">
                      <span>
                        주사위 합계 예측
                      </span>
                      <strong>
                        홀수인가, 짝수인가
                      </strong>
                      <small>
                        모든 참가자의 선택이
                        끝나면 주사위가
                        공개됩니다.
                      </small>
                    </div>

                    <div className="arena-betting__choice-grid">
                      <button
                        type="button"
                        className={
                          oddEvenChoice ===
                          "ODD"
                            ? "is-selected"
                            : ""
                        }
                        disabled={!canControlCurrentPlayer}
                        onClick={() =>
                          setOddEvenChoice(
                            "ODD",
                          )
                        }
                      >
                        <span>ODD</span>
                        <strong>홀수</strong>
                        <small>
                          합계 3·5·7·9·11
                        </small>
                      </button>

                      <button
                        type="button"
                        className={
                          oddEvenChoice ===
                          "EVEN"
                            ? "is-selected"
                            : ""
                        }
                        disabled={!canControlCurrentPlayer}
                        onClick={() =>
                          setOddEvenChoice(
                            "EVEN",
                          )
                        }
                      >
                        <span>EVEN</span>
                        <strong>짝수</strong>
                        <small>
                          합계 2·4·6·8·10·12
                        </small>
                      </button>
                    </div>

                    <div className="arena-betting__amount-panel">
                      <span>배팅금 선택</span>
                      <div>
                        {MINI_GAME_BET_OPTIONS.map(
                          (amount) => (
                            <button
                              key={amount}
                              type="button"
                              className={
                                betAmount ===
                                amount
                                  ? "is-selected"
                                  : ""
                              }
                              disabled={
                                !canControlCurrentPlayer ||
                                currentPlayer.money < amount
                              }
                              onClick={() =>
                                setBetAmount(
                                  amount,
                                )
                              }
                            >
                              {formatMoney(
                                amount,
                              )}
                            </button>
                          ),
                        )}
                      </div>
                      <dl>
                        <div>
                          <dt>선택</dt>
                          <dd>
                            {oddEvenChoice ===
                            "ODD"
                              ? "홀수"
                              : "짝수"}
                          </dd>
                        </div>
                        <div>
                          <dt>배팅금</dt>
                          <dd>
                            {formatMoney(
                              betAmount,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            적중 시 수령
                          </dt>
                          <dd>
                            {formatMoney(
                              betAmount * 2,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="arena-betting__actions">
                      <button
                        type="button"
                        className="minigame-arena__primary-action"
                        disabled={
                          !canControlCurrentPlayer ||
                          currentPlayer.money <
                            betAmount
                        }
                        onClick={
                          handleOddEvenBet
                        }
                      >
                        {oddEvenChoice ===
                        "ODD"
                          ? "홀수"
                          : "짝수"}
                        에{" "}
                        {formatMoney(
                          betAmount,
                        )}{" "}
                        배팅
                      </button>
                      <button
                        type="button"
                        className="minigame-arena__pass-action"
                        onClick={
                          handlePassBet
                        }
                        disabled={ !canControlCurrentPlayer}
                      >
                        이번 게임 불참
                      </button>
                    </div>
                  </div>
                )}

              {game.gameId === "HIGH_LOW" &&
                currentPlayer && (
                  <div className="arena-high-low">
                    <div className="arena-high-low__cards">
                      <HighLowCard
                        label="기준 숫자"
                        value={game.firstNumber}
                        flipped={highLowFirstFlipped}
                        tone="first"
                      />

                      <div
                        className="arena-high-low__connector"
                        aria-hidden="true"
                      >
                        →
                      </div>

                      <HighLowCard
                        label="다음 숫자"
                        value="?"
                        flipped={false}
                        tone="second"
                      />
                    </div>

                    <div className="arena-high-low__choices">
                      <button
                        type="button"
                        className={
                          highLowChoice ===
                          "HIGH"
                            ? "is-selected"
                            : ""
                        }
                        disabled={!canControlCurrentPlayer}
                        onClick={() =>
                          setHighLowChoice(
                            "HIGH",
                          )
                        }
                      >
                        <span>HIGH</span>
                        <strong>
                          더 높다
                        </strong>
                      </button>

                      <button
                        type="button"
                        className={
                          highLowChoice ===
                          "LOW"
                            ? "is-selected"
                            : ""
                        }
                        disabled={!canControlCurrentPlayer}
                        onClick={() =>
                          setHighLowChoice(
                            "LOW",
                          )
                        }
                      >
                        <span>LOW</span>
                        <strong>
                          더 낮다
                        </strong>
                      </button>
                    </div>

                    <div className="arena-betting__amount-panel">
                      <span>배팅금 선택</span>
                      <div>
                        {MINI_GAME_BET_OPTIONS.map(
                          (amount) => (
                            <button
                              key={amount}
                              type="button"
                              className={
                                betAmount ===
                                amount
                                  ? "is-selected"
                                  : ""
                              }
                              disabled={
                                !canControlCurrentPlayer ||
                                currentPlayer.money < amount
                              }
                              onClick={() =>
                                setBetAmount(
                                  amount,
                                )
                              }
                            >
                              {formatMoney(
                                amount,
                              )}
                            </button>
                          ),
                        )}
                      </div>
                      <dl>
                        <div>
                          <dt>예측</dt>
                          <dd>
                            {highLowChoice}
                          </dd>
                        </div>
                        <div>
                          <dt>배팅금</dt>
                          <dd>
                            {formatMoney(
                              betAmount,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            적중 시 수령
                          </dt>
                          <dd>
                            {formatMoney(
                              betAmount * 2,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="arena-betting__actions">
                      <button
                        type="button"
                        className="minigame-arena__primary-action"
                        disabled={
                          !canControlCurrentPlayer ||
                          currentPlayer.money <
                            betAmount
                        }
                        onClick={
                          handleHighLowBet
                        }
                      >
                        {highLowChoice}에{" "}
                        {formatMoney(
                          betAmount,
                        )}{" "}
                        배팅
                      </button>
                      <button
                        type="button"
                        className="minigame-arena__pass-action"
                        disabled={!canControlCurrentPlayer}
                        onClick={
                          handlePassBet
                        }
                      >
                        이번 게임 불참
                      </button>
                    </div>
                  </div>
                )}
            </main>

            <aside className="minigame-arena__scoreboard">
              <div className="minigame-arena__scoreboard-title">
                <span>LIVE RECORD</span>
                <strong>
                  {definition.category ===
                  "PRIZE"
                    ? "현재 기록"
                    : "참가 현황"}
                </strong>
              </div>

              {game.gameId ===
                "TIMING_STOP" && (
                <div className="minigame-arena__record-list">
                  {game.attempts.length ===
                  0 ? (
                    <p>
                      아직 기록이 없습니다.
                    </p>
                  ) : (
                    [...game.attempts]
                      .sort(
                        (first, second) =>
                          first.distance -
                          second.distance,
                      )
                      .map(
                        (attempt, index) => (
                          <div
                            key={
                              attempt.playerId
                            }
                          >
                            <b>
                              {index + 1}
                            </b>
                            <span>
                              <strong>
                                {playerMap.get(
                                  attempt.playerId,
                                )?.name ??
                                  attempt.playerId}
                              </strong>
                              <small>
                                반응{" "}
                                {(
                                  attempt.responseMs /
                                  1_000
                                ).toFixed(
                                  2,
                                )}
                                초
                              </small>
                            </span>
                            <em>
                              오차{" "}
                              {attempt.distance.toFixed(
                                3,
                              )}
                            </em>
                          </div>
                        ),
                      )
                  )}
                </div>
              )}

              {game.gameId ===
                "TARGET_DICE" && (
                <div className="minigame-arena__record-list">
                  {game.attempts.length ===
                  0 ? (
                    <p>
                      아직 투척 기록이
                      없습니다.
                    </p>
                  ) : (
                    [...game.attempts]
                      .sort(
                        (first, second) =>
                          first.distance -
                          second.distance,
                      )
                      .map(
                        (attempt, index) => (
                          <div
                            key={
                              attempt.playerId
                            }
                          >
                            <b>
                              {index + 1}
                            </b>
                            <span>
                              <strong>
                                {playerMap.get(
                                  attempt.playerId,
                                )?.name ??
                                  attempt.playerId}
                              </strong>
                              <small className="is-dice">
                                {
                                  DICE_SYMBOLS[
                                    attempt
                                      .diceValues[0]
                                  ]
                                }{" "}
                                {
                                  DICE_SYMBOLS[
                                    attempt
                                      .diceValues[1]
                                  ]
                                }
                              </small>
                            </span>
                            <em>
                              합계{" "}
                              {attempt.total}
                              <small>
                                차이{" "}
                                {
                                  attempt.distance
                                }
                              </small>
                            </em>
                          </div>
                        ),
                      )
                  )}
                </div>
              )}

              {(game.gameId ===
                "ODD_EVEN" ||
                game.gameId ===
                  "HIGH_LOW") && (
                <div className="minigame-arena__bet-list">
                  {game.bets.length === 0 ? (
                    <p>
                      아직 배팅한 참가자가
                      없습니다.
                    </p>
                  ) : (
                    game.bets.map((bet) => (
                      <div
                        key={bet.playerId}
                      >
                        <span>
                          <strong>
                            {playerMap.get(
                              bet.playerId,
                            )?.name ??
                              bet.playerId}
                          </strong>
                          <small>
                            {bet.choice ??
                              "불참"}
                          </small>
                        </span>
                        <b>
                          {bet.amount > 0
                            ? formatMoney(
                                bet.amount,
                              )
                            : "-"}
                        </b>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="minigame-arena__rule-card">
                <span>진행 규칙</span>
                <p>
                  진행 중
                  각 참가자는 자신의 차례에 한 번만 선택할 수 있습니다.
                </p>
                <strong>
                  {completedCount}/
                  {participantIds.length} 완료
                </strong>
              </div>
            </aside>
          </div>
        )}

        {game.stage === "RESULT" && (
          <div className="minigame-arena__result-layout">
            {game.gameId === "TIMING_STOP" && (
              <section className="minigame-arena__winner-panel">
                <span>FINAL RESULT</span>
                <strong>
                  {winner?.name ?? "우승자 없음"}
                </strong>
                {winner && (
                  <b>
                    우승 상금{" "}
                    {formatMoney(
                      MINI_GAME_PRIZE_AMOUNT,
                    )}
                  </b>
                )}
                <p>{game.resultText}</p>
              </section>
            )}

            {game.gameId === "TARGET_DICE" && (
              <section className="minigame-arena__target-result">
                {winnerTargetAttempt && (
                  <MiniGameDiceStage
                    values={
                      winnerTargetAttempt.diceValues
                    }
                    rolling={false}
                    label="우승 주사위"
                    resultLabel={`합계 ${winnerTargetAttempt.total} · 목표 ${game.targetNumber}`}
                  />
                )}

                <div className="minigame-arena__winner-panel">
                  <span>FINAL RESULT</span>
                  <strong>
                    {winner?.name ??
                      "우승자 없음"}
                  </strong>
                  {winner && (
                    <b>
                      우승 상금{" "}
                      {formatMoney(
                        MINI_GAME_PRIZE_AMOUNT,
                      )}
                    </b>
                  )}
                  <p>{game.resultText}</p>
                </div>
              </section>
            )}

            {game.gameId === "ODD_EVEN" &&
              game.diceValues && (
                <section className="minigame-arena__bet-result">
                  <MiniGameDiceStage
                    values={game.diceValues}
                    rolling={
                      resultDiceRolling
                    }
                    label="최종 결과"
                    resultLabel={
                      game.resultText ??
                      "홀짝 결과"
                    }
                  />

                  {!resultRevealPending && (
                    <div className="minigame-arena__result-headline">
                      <span>
                        GAME RESULT
                      </span>
                      <strong>
                        {game.resultText}
                      </strong>
                    </div>
                  )}
                </section>
              )}

            {game.gameId === "HIGH_LOW" && (
              <section className="minigame-arena__high-low-result">
                <div className="arena-high-low__cards is-result">
                  <HighLowCard
                    label="기준 숫자"
                    value={game.firstNumber}
                    flipped={highLowFirstFlipped}
                    tone="first"
                  />

                  <div
                    className="arena-high-low__connector"
                    aria-hidden="true"
                  >
                    →
                  </div>

                  <HighLowCard
                    label="결과 숫자"
                    value={game.secondNumber ?? "?"}
                    flipped={highLowSecondFlipped}
                    tone="second"
                  />
                </div>

                {!resultRevealPending && (
                  <div className="minigame-arena__result-headline">
                    <span>
                      GAME RESULT
                    </span>
                    <strong>
                      {game.resultText}
                    </strong>
                  </div>
                )}
              </section>
            )}

            {(game.gameId ===
              "TIMING_STOP" ||
              game.gameId ===
                "TARGET_DICE") && (
              <div className="minigame-arena__final-ranking">
                <div>
                  <span>순위</span>
                  <span>참가자</span>
                  <span>기록</span>
                </div>

                {(game.gameId ===
                "TIMING_STOP"
                  ? [...game.attempts].sort(
                      (first, second) =>
                        first.distance -
                        second.distance,
                    )
                  : [...game.attempts].sort(
                      (first, second) =>
                        first.distance -
                        second.distance,
                    )
                ).map(
                  (attempt, index) => (
                    <div
                      key={attempt.playerId}
                      className={
                        attempt.playerId ===
                        game.winnerPlayerId
                          ? "is-winner"
                          : ""
                      }
                    >
                      <b>{index + 1}</b>
                      <strong>
                        {playerMap.get(
                          attempt.playerId,
                        )?.name ??
                          attempt.playerId}
                      </strong>
                      <span>
                        {"responseMs" in attempt
                          ? `오차 ${attempt.distance.toFixed(
                              3,
                            )}`
                          : `합계 ${attempt.total} · 차이 ${attempt.distance}`}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}

            {(game.gameId === "ODD_EVEN" ||
              game.gameId === "HIGH_LOW") &&
              !resultRevealPending && (
                <div className="minigame-arena__settlements">
                  <div>
                    <span>참가자</span>
                    <span>정산 결과</span>
                  </div>

                  {game.settlements.map(
                    (settlement) => (
                      <div
                        key={
                          settlement.playerId
                        }
                        className={`is-${settlement.result.toLowerCase()}`}
                      >
                        <strong>
                          {playerMap.get(
                            settlement.playerId,
                          )?.name ??
                            settlement.playerId}
                        </strong>
                        <span>
                          {settlement.result ===
                          "WIN"
                            ? `적중 · ${formatMoney(
                                settlement.payout,
                              )} 수령`
                            : settlement.result ===
                                "LOSE"
                              ? `실패 · ${formatMoney(
                                  settlement.stake,
                                )} 손실`
                              : settlement.result ===
                                  "REFUND"
                                ? `동일 숫자 · ${formatMoney(
                                    settlement.payout,
                                  )} 반환`
                                : "불참"}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

            {!resultRevealPending && (
              <button
                type="button"
                className="minigame-arena__close"
                disabled={
                  !canCloseMiniGame
                }
                onClick={onClose}
              >
                {canCloseMiniGame
                  ? "미니게임 종료"
                  : "도착 플레이어 확인 대기"}
              </button>
            )}
          </div>
        )}

        {errorMessage && (
          <p
            className="minigame-arena__error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </section>
    </div>
  );
}
