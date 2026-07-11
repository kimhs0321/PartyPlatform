import type { Server } from "socket.io";
import { catchMindGameManager } from "../CatchMindGameManager";
import { emitCatchMindState } from "./catchMindEmitter";
import { endRoomGame } from "../../../socket/common/endRoomGame";

function getDelayMs(roomId: string, fallbackMs: number) {
  const game = catchMindGameManager.getGame(roomId);
  if (!game) return fallbackMs;

  if (game.timerEndsAt !== null) {
    return Math.max(0, game.timerEndsAt - Date.now());
  }

  if (game.remainingTimeMs !== null) {
    return Math.max(1000, game.remainingTimeMs);
  }

  return fallbackMs;
}

export function scheduleWordSelectTimeout(io: Server, roomId: string) {
  const game = catchMindGameManager.getGame(roomId);
  if (!game) return;

  setTimeout(() => {
    try {
      const latestGame = catchMindGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleWordSelectTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "WORD_SELECT") return;

      catchMindGameManager.selectRandomWord(roomId);
      emitCatchMindState(io, roomId);

      scheduleHintUpdates(io, roomId);
      scheduleDrawingTimeout(io, roomId);
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, game.settings.wordSelectTime * 1000));
}

export function scheduleDrawingTimeout(io: Server, roomId: string) {
  const game = catchMindGameManager.getGame(roomId);
  if (!game) return;
  if (game.phase !== "DRAWING") return;

  const scheduledTimerEndsAt = game.timerEndsAt;
  const delayMs =
    scheduledTimerEndsAt !== null
      ? Math.max(0, scheduledTimerEndsAt - Date.now())
      : game.settings.drawingTime * 1000;

  setTimeout(() => {
    try {
      const latestGame = catchMindGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleDrawingTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "DRAWING") return;
      if (latestGame.timerEndsAt !== scheduledTimerEndsAt) return;

      catchMindGameManager.finishRound(roomId);
      emitCatchMindState(io, roomId);

      scheduleRoundResultTimeout(io, roomId);
    } catch {
      // 상태 변경 실패 무시
    }
  }, delayMs);
}

export function scheduleRoundResultTimeout(io: Server, roomId: string) {
  const game = catchMindGameManager.getGame(roomId);
  if (!game) return;

  setTimeout(() => {
    try {
      const latestGame = catchMindGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleRoundResultTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "ROUND_RESULT") return;

      catchMindGameManager.nextTurnOrRound(roomId);
      emitCatchMindState(io, roomId);

      const updatedGame = catchMindGameManager.getGame(roomId);

      if (updatedGame?.phase === "WORD_SELECT") {
        scheduleWordSelectTimeout(io, roomId);
        return;
      }

      if (updatedGame?.phase === "GAME_END") {
        setTimeout(() => {
          endRoomGame(io, roomId);
        }, 10000);
      }
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, game.settings.roundResultTime * 1000));
}

export function scheduleHintUpdates(
  io: Server,
  roomId: string
) {
  const game = catchMindGameManager.getGame(roomId);

  if (
    !game ||
    game.phase !== "DRAWING" ||
    !game.answer ||
    game.timerEndsAt === null
  ) {
    return;
  }

  const scheduledTimerEndsAt = game.timerEndsAt;

  const characterCount = [...game.answer].filter(
    (char) => char !== " "
  ).length;

  if (characterCount === 0) return;

  const totalMs = game.settings.drawingTime * 1000;

  for (
    let revealIndex = 0;
    revealIndex < characterCount;
    revealIndex += 1
  ) {
    /*
     * 첫 자음은 진행률 40% 시점,
     * 이후 자음은 40~90% 사이에서 균등하게 공개
     */
    const revealProgress =
      0.4 + (0.5 * revealIndex) / characterCount;

    const delayMs = Math.max(
      0,
      totalMs * revealProgress
    );

    setTimeout(() => {
      const latestGame =
        catchMindGameManager.getGame(roomId);

      if (!latestGame) return;
      if (latestGame.paused) return;
      if (latestGame.phase !== "DRAWING") return;

      // 이전 문제에 등록된 타이머가 실행되는 것 방지
      if (
        latestGame.timerEndsAt !==
        scheduledTimerEndsAt
      ) {
        return;
      }

      emitCatchMindState(io, roomId);
    }, delayMs);
  }
}