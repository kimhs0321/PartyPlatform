import type { Server } from "socket.io";
import { catchMindGameManager } from "../../managers/CatchMindGameManager";
import { emitCatchMindState } from "./catchMindEmitter";
import { endRoomGame } from "../common/endRoomGame";

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

function finishRoom(io: Server, roomId: string) {
  endRoomGame(io, roomId);
}

export function scheduleWordSelectTimeout(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const game = catchMindGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleWordSelectTimeout(io, roomId);
        return;
      }

      if (game.phase !== "WORD_SELECT") return;

      catchMindGameManager.selectRandomWord(roomId);
      emitCatchMindState(io, roomId);

      scheduleDrawingTimeout(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, 10000));
}

export function scheduleDrawingTimeout(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const game = catchMindGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleDrawingTimeout(io, roomId);
        return;
      }

      if (game.phase !== "DRAWING") return;

      catchMindGameManager.finishRound(roomId);
      emitCatchMindState(io, roomId);

      scheduleNextTurnOrRound(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, 90000));
}

export function scheduleNextTurnOrRound(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const game = catchMindGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleNextTurnOrRound(io, roomId);
        return;
      }

      if (game.phase !== "ROUND_RESULT") return;

      catchMindGameManager.nextTurnOrRound(roomId);
      emitCatchMindState(io, roomId);

      const updatedGame = catchMindGameManager.getGame(roomId);

      if (updatedGame?.phase === "WORD_SELECT") {
        scheduleWordSelectTimeout(io, roomId);
        return;
      }

      if (updatedGame?.phase === "GAME_END") {
        emitCatchMindState(io, roomId);

        setTimeout(() => {
          finishRoom(io, roomId);
        }, 5000);
      }
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, 5000));
}