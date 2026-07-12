import type { Server } from "socket.io";
import { relayDrawingGameManager } from "../RelayDrawingGameManager";
import { emitRelayDrawingState } from "./relayDrawingEmitter";
import { endRoomGame } from "../../../socket/common/endRoomGame";

const endingRoomIds = new Set<string>();

export function scheduleRelayPrepareTimeout(
  io: Server,
  roomId: string,
) {
  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;
  if (game.phase !== "ROUND_PREPARE") return;
  if (game.turnEndsAt === null) return;

  const scheduledTurnEndsAt =
    game.turnEndsAt;

  const delayMs = Math.max(
    0,
    scheduledTurnEndsAt - Date.now(),
  );

  setTimeout(() => {
    try {
      const latestGame =
        relayDrawingGameManager.getGame(roomId);

      if (!latestGame) return;
      if (latestGame.phase !== "FINAL_GUESS") return;

      if (
        latestGame.turnEndsAt !==
        scheduledTurnEndsAt
      ) {
        return;
      }

      if (
        latestGame.gameEndsAt === null ||
        Date.now() >= latestGame.gameEndsAt
      ) {
        finishRelayDrawingGame(io, roomId);
        return;
      }

      relayDrawingGameManager.finishRound(
        roomId,
        false,
      );

      emitRelayDrawingState(io, roomId);

      scheduleRelayRoundResultTimeout(
        io,
        roomId,
      );
    } catch (error) {
      console.error(
        "릴레이 드로잉 최종 정답시간 종료 처리 실패",
        error,
      );
    }
  }, delayMs);
}

/**
 * 현재 그림 담당자의 턴 종료
 *
 * 다음 그림 담당자가 있으면 DRAWING 유지
  * 마지막 그림 담당자였다면 FINAL_GUESS
 */
export function scheduleRelayDrawingTurnTimeout(
  io: Server,
  roomId: string,
) {
  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;
  if (game.phase !== "DRAWING") return;
  if (game.turnEndsAt === null) return;

  const scheduledTurnEndsAt =
    game.turnEndsAt;

  const delayMs = Math.max(
    0,
    scheduledTurnEndsAt - Date.now(),
  );

  setTimeout(() => {
    try {
      const latestGame =
        relayDrawingGameManager.getGame(roomId);

      if (!latestGame) return;
      if (latestGame.phase !== "DRAWING") {
        return;
      }

      /*
       * 이전 그림 담당자의 타이머가
       * 다음 담당자 턴에 실행되는 것을 방지
       */
      if (
        latestGame.turnEndsAt !==
        scheduledTurnEndsAt
      ) {
        return;
      }

      if (
        latestGame.gameEndsAt === null ||
        Date.now() >=
          latestGame.gameEndsAt
      ) {
        finishRelayDrawingGame(io, roomId);
        return;
      }

      const updatedGame =
        relayDrawingGameManager.nextDrawer(
          roomId,
        );

      emitRelayDrawingState(io, roomId);

      if (
        updatedGame.phase === "DRAWING"
      ) {
        scheduleRelayDrawingTurnTimeout(
          io,
          roomId,
        );
        return;
      }

      if (updatedGame.phase === "FINAL_GUESS") {
        scheduleRelayFinalGuessTimeout(
          io,
          roomId,
        );
        return;
      }

      if (
        updatedGame.phase ===
        "ROUND_RESULT"
      ) {
        scheduleRelayRoundResultTimeout(
          io,
          roomId,
        );
      }
    } catch (error) {
      console.error(
        "릴레이 드로잉 턴 종료 처리 실패",
        error,
      );
    }
  }, delayMs);
}

export function scheduleRelayFinalGuessTimeout(
  io: Server,
  roomId: string,
) {
  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;
  if (game.phase !== "FINAL_GUESS") return;
  if (game.turnEndsAt === null) return;

  const scheduledTurnEndsAt =
    game.turnEndsAt;

  const delayMs = Math.max(
    0,
    scheduledTurnEndsAt - Date.now(),
  );

  setTimeout(() => {
    const latestGame =
      relayDrawingGameManager.getGame(roomId);

    if (!latestGame) return;
    if (latestGame.phase !== "FINAL_GUESS") return;

    if (
      latestGame.turnEndsAt !==
      scheduledTurnEndsAt
    ) {
      return;
    }

    if (
      latestGame.gameEndsAt === null ||
      Date.now() >= latestGame.gameEndsAt
    ) {
      finishRelayDrawingGame(io, roomId);
      return;
    }

    relayDrawingGameManager.finishRound(
      roomId,
      false,
    );

    emitRelayDrawingState(io, roomId);

    scheduleRelayRoundResultTimeout(
      io,
      roomId,
    );
  }, delayMs);
}

export function scheduleRelayRoundResultTimeout(
  io: Server,
  roomId: string,
) {
  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;
  if (game.phase !== "ROUND_RESULT") {
    return;
  }
  if (game.resultEndsAt === null) return;

  const scheduledResultEndsAt =
    game.resultEndsAt;

  const delayMs = Math.max(
    0,
    scheduledResultEndsAt - Date.now(),
  );

  setTimeout(() => {
    try {
      const latestGame =
        relayDrawingGameManager.getGame(roomId);

      if (!latestGame) return;

      if (
        latestGame.phase !==
        "ROUND_RESULT"
      ) {
        return;
      }

      /*
       * 이전 문제 결과 타이머가
       * 뒤늦게 실행되는 것을 방지
       */
      if (
        latestGame.resultEndsAt !==
        scheduledResultEndsAt
      ) {
        return;
      }

      if (
        latestGame.gameEndsAt === null ||
        Date.now() >=
          latestGame.gameEndsAt
      ) {
        finishRelayDrawingGame(io, roomId);
        return;
      }

      const updatedGame =
        relayDrawingGameManager.nextRound(
          roomId,
        );

      emitRelayDrawingState(io, roomId);

      if (
        updatedGame.phase ===
        "ROUND_PREPARE"
      ) {
        scheduleRelayPrepareTimeout(
          io,
          roomId,
        );
        return;
      }

      if (
        updatedGame.phase === "GAME_END"
      ) {
        finishRelayDrawingGame(io, roomId);
      }
    } catch (error) {
      console.error(
        "릴레이 드로잉 다음 문제 처리 실패",
        error,
      );
    }
  }, delayMs);
}

/**
 * 전체 게임 제한시간 종료
 */
export function scheduleRelayGameTimeout(
  io: Server,
  roomId: string,
) {
  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;
  if (game.gameEndsAt === null) return;

  const scheduledGameEndsAt =
    game.gameEndsAt;

  const delayMs = Math.max(
    0,
    scheduledGameEndsAt - Date.now(),
  );

  setTimeout(() => {
    try {
      const latestGame =
        relayDrawingGameManager.getGame(roomId);

      if (!latestGame) return;

      if (
        latestGame.phase === "GAME_END"
      ) {
        return;
      }

      /*
       * 게임이 재시작되어 종료시각이
       * 바뀌었다면 이전 타이머 무시
       */
      if (
        latestGame.gameEndsAt !==
        scheduledGameEndsAt
      ) {
        return;
      }

      finishRelayDrawingGame(io, roomId);
    } catch (error) {
      console.error(
        "릴레이 드로잉 게임 종료 처리 실패",
        error,
      );
    }
  }, delayMs);
}

/**
 * 게임 종료 상태 전송 후 대기방 복귀
 */
function finishRelayDrawingGame(
  io: Server,
  roomId: string,
) {
  if (endingRoomIds.has(roomId)) {
    return;
  }

  const game =
    relayDrawingGameManager.getGame(roomId);

  if (!game) return;

  endingRoomIds.add(roomId);

  if (game.phase !== "GAME_END") {
    relayDrawingGameManager.finishGame(
      roomId,
    );

    emitRelayDrawingState(io, roomId);
  }

  setTimeout(() => {
    endRoomGame(io, roomId);
    endingRoomIds.delete(roomId);
  }, 10000);
}