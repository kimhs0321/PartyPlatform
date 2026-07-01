import type { Server } from "socket.io";
import { liarGameManager } from "../../managers/LiarGameManager";
import { emitLiarState } from "./liarEmitter";

type EndRoomGameFn = (roomId: string) => void;

export function scheduleDescriptionPhase(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      liarGameManager.startDescriptionPhase(roomId);
      emitLiarState(io, roomId);
      scheduleDescriptionTimeout(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, 5000);
}

export function scheduleDescriptionTimeout(io: Server, roomId: string) {
  const game = liarGameManager.getGame(roomId);
  if (!game) return;

  const scheduledIndex = game.currentDescriptionIndex;
  const descriptionTime = game.settings.descriptionTime;

  setTimeout(() => {
    try {
      const latestGame = liarGameManager.getGame(roomId);

      if (!latestGame) return;
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
  }, descriptionTime * 1000);
}

export function scheduleDiscussionPhase(io: Server, roomId: string) {
  setTimeout(() => {
    try {
      liarGameManager.startDiscussionPhase(roomId);
      emitLiarState(io, roomId);

      const game = liarGameManager.getGame(roomId);
      const discussionTime = game?.settings.discussionTime ?? 120;

      scheduleVotingPhase(io, roomId, discussionTime);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, 5000);
}

export function scheduleVotingPhase(
  io: Server,
  roomId: string,
  delaySeconds: number
) {
  setTimeout(() => {
    try {
      liarGameManager.startVotingPhase(roomId);
      emitLiarState(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, delaySeconds * 1000);
}

export function scheduleRevotePhase(io: Server, roomId: string) {
  const game = liarGameManager.getGame(roomId);
  const tieSpeechTime = game?.settings.tieSpeechTime ?? 20;

  setTimeout(() => {
    try {
      liarGameManager.startRevotePhase(roomId);
      emitLiarState(io, roomId);
    } catch {
      // 상태가 이미 바뀐 경우 무시
    }
  }, tieSpeechTime * 1000);
}

export function scheduleNextRoundOrEnd(
  io: Server,
  roomId: string,
  endRoomGame: EndRoomGameFn
) {
  setTimeout(() => {
    try {
      liarGameManager.nextRound(roomId);
      emitLiarState(io, roomId);

      const game = liarGameManager.getGame(roomId);

      if (game?.phase === "READY_CHECK") {
        scheduleDescriptionPhase(io, roomId);
        return;
      }

      if (game?.phase === "GAME_END") {
        emitLiarState(io, roomId);

        setTimeout(() => {
          endRoomGame(roomId);
        }, 5000);

        return;
      }
    } catch {
      // 상태 변경 실패 무시
    }
  }, 5000);
}

export function handleAfterVoteResolved(
  io: Server,
  roomId: string,
  endRoomGame: EndRoomGameFn
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
    return;
  }

  if (game.phase === "RESULT") {
    emitLiarState(io, roomId);
    scheduleNextRoundOrEnd(io, roomId, endRoomGame);
  }
}