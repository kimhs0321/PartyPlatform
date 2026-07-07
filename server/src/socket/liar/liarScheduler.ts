import type { Server } from "socket.io";
import { liarGameManager } from "../../managers/LiarGameManager";
import { emitLiarState } from "./liarEmitter";
import { endRoomGame } from "../common/endRoomGame";

type EndRoomGameFn = (roomId: string) => void;

function getDelayMs(roomId: string, fallbackMs: number) {
  const game = liarGameManager.getGame(roomId);
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

export function scheduleDescriptionPhase(
  io: Server,
  roomId: string,
  _endRoomGame?: EndRoomGameFn
) {
  setTimeout(() => {
    try {
      const game = liarGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleDescriptionPhase(io, roomId);
        return;
      }

      if (game.phase !== "READY_CHECK") return;

      liarGameManager.startDescriptionPhase(roomId);
      emitLiarState(io, roomId);
      scheduleDescriptionTimeout(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, 5000));
}

export function scheduleDescriptionTimeout(io: Server, roomId: string) {
  const game = liarGameManager.getGame(roomId);
  if (!game) return;

  const scheduledIndex = game.currentDescriptionIndex;

  setTimeout(() => {
    try {
      const latestGame = liarGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleDescriptionTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "DESCRIPTION") return;
      if (latestGame.currentDescriptionIndex !== scheduledIndex) return;

      liarGameManager.timeoutDescription(roomId);
      emitLiarState(io, roomId);

      const updatedGame = liarGameManager.getGame(roomId);

      if (updatedGame?.phase === "REACTION") {
        scheduleDiscussionPhase(io, roomId);
        return;
      }

      if (updatedGame?.phase === "DESCRIPTION") {
        scheduleDescriptionTimeout(io, roomId);
      }
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, game.settings.descriptionTime * 1000));
}

export function scheduleDiscussionPhase(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const game = liarGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleDiscussionPhase(io, roomId);
        return;
      }

      if (game.phase !== "REACTION") return;

      liarGameManager.startDiscussionPhase(roomId);
      emitLiarState(io, roomId);

      const updatedGame = liarGameManager.getGame(roomId);
      const discussionTime = updatedGame?.settings.discussionTime ?? 120;

      scheduleVotingPhase(io, roomId, discussionTime);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, 30000));
}

export function scheduleVotingPhase(
  io: Server,
  roomId: string,
  delaySeconds: number
) {
  setTimeout(() => {
    try {
      const game = liarGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleVotingPhase(io, roomId, delaySeconds);
        return;
      }

      if (game.phase !== "DISCUSSION") return;

      liarGameManager.startVotingPhase(roomId);
      emitLiarState(io, roomId);

      scheduleVotingTimeout(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, delaySeconds * 1000));
}

export function scheduleVotingTimeout(io: Server, roomId: string) {
  const game = liarGameManager.getGame(roomId);
  if (!game) return;

  setTimeout(() => {
    try {
      const latestGame = liarGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleVotingTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "VOTING" && latestGame.phase !== "REVOTE") {
        return;
      }

      liarGameManager.timeoutVoting(roomId);
      emitLiarState(io, roomId);

      handleAfterVoteResolved(io, roomId);
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, game.settings.voteTime * 1000));
}

export function scheduleRevotePhase(io: Server, roomId: string) {
  const game = liarGameManager.getGame(roomId);
  const tieSpeechTime = game?.settings.tieSpeechTime ?? 20;

  setTimeout(() => {
    try {
      const latestGame = liarGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleRevotePhase(io, roomId);
        return;
      }

      if (latestGame.phase !== "TIE_SPEECH") return;

      liarGameManager.startRevotePhase(roomId);
      emitLiarState(io, roomId);

      scheduleVotingTimeout(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, getDelayMs(roomId, tieSpeechTime * 1000));
}

export function scheduleLiarGuessTimeout(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const latestGame = liarGameManager.getGame(roomId);
      if (!latestGame) return;

      if (latestGame.paused) {
        scheduleLiarGuessTimeout(io, roomId);
        return;
      }

      if (latestGame.phase !== "LIAR_GUESS") return;

      liarGameManager.timeoutLiarGuess(roomId);
      emitLiarState(io, roomId);

      scheduleNextRoundOrEnd(io, roomId);
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, 30000));
}

export function scheduleNextRoundOrEnd(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      const game = liarGameManager.getGame(roomId);
      if (!game) return;

      if (game.paused) {
        scheduleNextRoundOrEnd(io, roomId);
        return;
      }

      if (game.phase !== "RESULT") return;

      liarGameManager.nextRound(roomId);
      emitLiarState(io, roomId);

      const updatedGame = liarGameManager.getGame(roomId);

      if (updatedGame?.phase === "READY_CHECK") {
        scheduleDescriptionPhase(io, roomId);
        return;
      }

      if (updatedGame?.phase === "GAME_END") {
        emitLiarState(io, roomId);

        setTimeout(() => {
          finishRoom(io, roomId);
        }, 5000);
      }
    } catch {
      // 상태 변경 실패 무시
    }
  }, getDelayMs(roomId, 15000));
}

export function handleAfterVoteResolved(
  io: Server,
  roomId: string,
  _endRoomGame?: EndRoomGameFn
) {
  const game = liarGameManager.getGame(roomId);
  if (!game) return;

  if (game.phase === "TIE_SPEECH") {
    emitLiarState(io, roomId);
    scheduleRevotePhase(io, roomId);
    return;
  }

  if (game.phase === "LIAR_GUESS") {
    emitLiarState(io, roomId);
    scheduleLiarGuessTimeout(io, roomId);
    return;
  }

  if (game.phase === "RESULT") {
    emitLiarState(io, roomId);
    scheduleNextRoundOrEnd(io, roomId);
  }
}