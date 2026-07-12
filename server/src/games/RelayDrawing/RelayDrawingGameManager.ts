import {
  DEFAULT_RELAY_DRAWING_SETTINGS,
  type ClientRelayDrawingGameState,
  type RelayDrawingGameState,
  type RelayDrawingPlayer,
  type RelayDrawingSettings,
  type RelayDrawingStroke,
} from "../../shared/types/relayDrawing";
import { CATCH_MIND_WORDS } from "../catchMind/keywords";

class RelayDrawingGameManager {
  private readonly games = new Map<string, RelayDrawingGameState>();
  private shuffle<T>(items: T[]): T[] {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(
        Math.random() * (index + 1),
      );

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index],
      ];
    }   
  return result;
}
  private pickRandomWord(): string {
    const word = this.shuffle(
      CATCH_MIND_WORDS,
    )[0];

    if (!word) {
      throw new Error(
        "사용할 수 있는 제시어가 없습니다.",
      );
    }

    return word;
  }


  createGame(
    roomId: string,
    players: RelayDrawingPlayer[],
    settings?: Partial<RelayDrawingSettings>,
  ): RelayDrawingGameState {
    const existingGame = this.games.get(roomId);

    if (existingGame) {
      throw new Error(
        `[RelayDrawingGameManager] 이미 게임이 존재하는 방입니다: ${roomId}`,
      );
    }

    const gameSettings: RelayDrawingSettings = {
      ...DEFAULT_RELAY_DRAWING_SETTINGS,
      ...settings,
    };

    const game: RelayDrawingGameState = {
      roomId,
      phase: "READY",

      settings: gameSettings,
      players: players.map((player) => ({ ...player })),

      guesserPlayerId: null,
      guesserQueue: [],

      drawerOrder: [],
      currentDrawerIndex: -1,
      currentDrawerPlayerId: null,

      answer: null,
      chats: [],
      strokes: [],

      successCount: 0,
      failedCount: 0,
      roundNumber: 0,
      roundResults: [],

      gameEndsAt: null,
      turnEndsAt: null,
      resultEndsAt: null,
    };

    this.games.set(roomId, game);

    return game;
  }

  /**
   * 전체 게임 타이머 시작
   */
  startGame(roomId: string): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        `[RelayDrawingGameManager] 게임을 찾을 수 없습니다: ${roomId}`,
      );
    }

    const connectedPlayerCount = game.players.filter(
      (player) => player.isConnected,
    ).length;

    if (connectedPlayerCount < 2) {
      throw new Error(
        "[RelayDrawingGameManager] 릴레이 드로잉은 최소 2명이 필요합니다.",
      );
    }

    game.successCount = 0;
    game.failedCount = 0;
    game.roundNumber = 0;
    game.roundResults = [];

    game.guesserPlayerId = null;
    game.guesserQueue = [];

    game.drawerOrder = [];
    game.currentDrawerIndex = -1;
    game.currentDrawerPlayerId = null;

    game.answer = null;
    game.chats = [];
    game.strokes = [];

    game.gameEndsAt =
      Date.now() + game.settings.gameDuration * 1000;

    game.turnEndsAt = null;
    game.resultEndsAt = null;

    return game;
  }

  /**
   * 모든 참가자가 한 번씩 정답 담당자를 맡도록
   * 셔플 큐에서 다음 플레이어를 꺼낸다.
   */
  private selectNextGuesser(
    game: RelayDrawingGameState,
  ): string {
    const connectedPlayerIds = game.players
      .filter((player) => player.isConnected)
      .map((player) => player.playerId);

    if (connectedPlayerIds.length < 2) {
      throw new Error(
        "[RelayDrawingGameManager] 정답 담당자를 선정할 참가자가 부족합니다.",
      );
    }

    const validQueue = game.guesserQueue.filter(
      (playerId) => connectedPlayerIds.includes(playerId),
    );

    game.guesserQueue = validQueue;

    if (game.guesserQueue.length === 0) {
      const previousGuesserId = game.guesserPlayerId;
      const shuffled = this.shuffle(connectedPlayerIds);

      // 새 사이클 첫 정답자가 직전 정답자와 같아지는 것을 방지
      if (
        previousGuesserId &&
        shuffled.length > 1 &&
        shuffled[0] === previousGuesserId
      ) {
        [shuffled[0], shuffled[1]] = [
          shuffled[1],
          shuffled[0],
        ];
      }

      game.guesserQueue = shuffled;
    }

    const nextGuesserId = game.guesserQueue.shift();

    if (!nextGuesserId) {
      throw new Error(
        "[RelayDrawingGameManager] 정답 담당자를 선정하지 못했습니다.",
      );
    }

    return nextGuesserId;
  }

  /**
   * 게임 상태 조회
   */
  getGame(roomId: string): RelayDrawingGameState | undefined {
    return this.games.get(roomId);
  }

  setPlayerConnected(
    roomId: string,
    playerId: string,
    isConnected: boolean,
  ): boolean {
    const game = this.games.get(roomId);

    if (!game) {
      return false;
    }

    const player = game.players.find(
      (candidate) => candidate.playerId === playerId,
    );

    if (!player) {
      return false;
    }

    player.isConnected = isConnected;

    return true;
  }

  /**
   * 현재 그림 담당자인지 확인
   */
  isCurrentDrawer(
    roomId: string,
    playerId: string,
  ): boolean {
    const game = this.games.get(roomId);

    if (!game) {
      return false;
    }

    return (
      game.phase === "DRAWING" &&
      game.currentDrawerPlayerId === playerId
    );
  }

  /**
   * 현재 정답 담당자인지 확인
   */
  isCurrentGuesser(
    roomId: string,
    playerId: string,
  ): boolean {
    const game = this.games.get(roomId);

    if (!game) {
      return false;
    }

    return (
      (game.phase === "DRAWING" ||
        game.phase === "FINAL_GUESS") &&
      game.guesserPlayerId === playerId
    );
  }

  startRound(roomId: string): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (
      game.gameEndsAt === null ||
      Date.now() >= game.gameEndsAt
    ) {
      return this.finishGame(roomId);
    }

    const connectedPlayerIds = game.players
      .filter((player) => player.isConnected)
      .map((player) => player.playerId);

    if (connectedPlayerIds.length < 2) {
      return this.finishGame(roomId);
    }

    const answer = this.pickRandomWord();
    const guesserPlayerId =
      this.selectNextGuesser(game);

    const drawerOrder = this.shuffle(
      connectedPlayerIds.filter(
        (playerId) =>
          playerId !== guesserPlayerId,
      ),
    );

    game.roundNumber += 1;

    game.guesserPlayerId = guesserPlayerId;
    game.drawerOrder = drawerOrder;
    game.currentDrawerIndex = 0;
    game.currentDrawerPlayerId =
      drawerOrder[0] ?? null;

    game.answer = answer;
    game.chats = [];
    game.strokes = [];

    game.phase = "ROUND_PREPARE";

    game.turnEndsAt =
        Date.now() +
        game.settings.prepareTime * 1000;

    return game;
  }

  startDrawing(
    roomId: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (game.phase !== "ROUND_PREPARE") {
      throw new Error(
        "지금은 그림을 시작할 단계가 아닙니다.",
      );
    }

    game.phase = "DRAWING";

    game.turnEndsAt =
      Date.now() +
      game.settings.turnDuration * 1000;

    return game;
  }
  /**
   * 현재 그림 담당자의 시간이 끝났을 때
   * 다음 그림 담당자로 전환한다.
   */
  nextDrawer(roomId: string): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        `[RelayDrawingGameManager] 게임을 찾을 수 없습니다: ${roomId}`,
      );
    }

    if (game.phase !== "DRAWING") {
      return game;
    }

    if (
      game.gameEndsAt !== null &&
      Date.now() >= game.gameEndsAt
    ) {
      return this.finishGame(roomId);
    }

    const nextDrawerIndex =
      game.currentDrawerIndex + 1;

    if (nextDrawerIndex >= game.drawerOrder.length) {
      return this.startFinalGuess(roomId);
    }

    game.currentDrawerIndex = nextDrawerIndex;
    game.currentDrawerPlayerId =
      game.drawerOrder[nextDrawerIndex];

    game.turnEndsAt =
      Date.now() + game.settings.turnDuration * 1000;

    return game;
  }  


  startFinalGuess(
    roomId: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (game.phase !== "DRAWING") {
      throw new Error(
        "지금은 최종 정답 단계로 넘어갈 수 없습니다.",
      );
    }

    game.phase = "FINAL_GUESS";
    game.currentDrawerPlayerId = null;
    game.currentDrawerIndex = -1;

    game.turnEndsAt =
      Date.now() +
      game.settings.finalGuessTime * 1000;

    return game;
  }
  /**
   * 현재 문제를 성공 또는 실패로 종료한다.
   */
  finishRound(
    roomId: string,
    success: boolean,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        `[RelayDrawingGameManager] 게임을 찾을 수 없습니다: ${roomId}`,
      );
    }

    if (
      game.phase !== "DRAWING" &&
      game.phase !== "FINAL_GUESS"
    ) {
      return game;
    }

    const answer = game.answer ?? "";
    const guesserPlayerId =
      game.guesserPlayerId ?? "";

    if (success) {
      game.successCount += 1;
    } else {
      game.failedCount += 1;
    }

    game.roundResults.push({
      roundNumber: game.roundNumber,
      word: answer,
      success,
      guesserPlayerId,
      solvedAt: success ? Date.now() : null,
    });

    game.phase = "ROUND_RESULT";
    game.currentDrawerPlayerId = null;
    game.currentDrawerIndex = -1;

    game.turnEndsAt = null;

    // 결과는 일단 1초간 노출
    game.resultEndsAt = Date.now() + 3000;

    return game;
  }

  nextRound(
    roomId: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (game.phase !== "ROUND_RESULT") {
      throw new Error(
        "지금은 다음 문제로 넘어갈 수 없습니다.",
      );
    }

    if (
      game.gameEndsAt === null ||
      Date.now() >= game.gameEndsAt
    ) {
      return this.finishGame(roomId);
    }

    return this.startRound(roomId);
  }

  addStroke(
    roomId: string,
    playerId: string,
    stroke: Omit<
      RelayDrawingStroke,
      "playerId"
    >,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (game.phase !== "DRAWING") {
      throw new Error(
        "지금은 그림을 그릴 수 없습니다.",
      );
    }

    if (
      game.currentDrawerPlayerId !== playerId
    ) {
      throw new Error(
        "현재 그림 담당자만 그림을 그릴 수 있습니다.",
      );
    }

    game.strokes.push({
      ...stroke,
      playerId,
    });

    return game;
  }

  undoStroke(
    roomId: string,
    playerId: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("릴레이 드로잉 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
      throw new Error("지금은 실행 취소할 수 없습니다.");
    }

    if (game.currentDrawerPlayerId !== playerId) {
      throw new Error("현재 그림 담당자만 실행 취소할 수 있습니다.");
    }

    game.strokes.pop();

    return game;
  }  

  clearCanvas(
    roomId: string,
    playerId: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("릴레이 드로잉 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
      throw new Error("지금은 캔버스를 지울 수 없습니다.");
    }

    if (game.currentDrawerPlayerId !== playerId) {
      throw new Error("현재 그림 담당자만 캔버스를 지울 수 있습니다.");
    }

    game.strokes = [];

    return game;
  }
  
  submitGuess(
    roomId: string,
    playerId: string,
    text: string,
  ): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "릴레이 드로잉 게임이 생성되지 않았습니다.",
      );
    }

    if (
      game.phase !== "DRAWING" &&
      game.phase !== "FINAL_GUESS"
    ) {
      throw new Error(
        "지금은 정답을 입력할 수 없습니다.",
      );
    }

    if (game.guesserPlayerId !== playerId) {
      throw new Error(
        "현재 정답 담당자만 정답을 입력할 수 있습니다.",
      );
    }

    const player = game.players.find(
      (candidate) =>
        candidate.playerId === playerId &&
        candidate.isConnected,
    );

    if (!player) {
      throw new Error(
        "플레이어를 찾을 수 없습니다.",
      );
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error(
        "채팅 내용을 입력하세요.",
      );
    }

    const answer =
      game.answer?.trim().toLowerCase() ?? "";

    const guess =
      trimmedText.toLowerCase();

    if (guess !== answer) {
      game.chats.push({
        playerId,
        playerName: player.name,
        text: trimmedText,
        createdAt: Date.now(),
      });

      return game;
    }

    game.chats.push({
      playerId: "SYSTEM",
      playerName: "SYSTEM",
      text: `🎉 ${player.name}님이 정답을 맞혔습니다!\n정답: ${game.answer}`,
      createdAt: Date.now(),
    });

    return this.finishRound(roomId, true);
  }

  finishGame(roomId: string): RelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        `[RelayDrawingGameManager] 게임을 찾을 수 없습니다: ${roomId}`,
      );
    }

    game.phase = "GAME_END";

    game.answer = null;
    game.chats = [];
    game.strokes = [];

    game.currentDrawerPlayerId = null;
    game.currentDrawerIndex = -1;

    game.drawerOrder = [];
    game.guesserPlayerId = null;    
    game.guesserQueue = [];

    game.turnEndsAt = null;
    game.resultEndsAt = null;
    game.gameEndsAt = null;

    return game;
  }

    toClientState(
      roomId: string,
      viewerPlayerId: string,
    ): ClientRelayDrawingGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        `[RelayDrawingGameManager] 게임을 찾을 수 없습니다: ${roomId}`,
      );
    }

    const isGuesser =
      viewerPlayerId === game.guesserPlayerId;

    const canSeeAnswer =
      game.answer !== null &&
      (
        game.phase === "ROUND_RESULT" ||
        (
          !isGuesser &&
          (
            game.settings.wordVisibility === "ALL_DRAWERS"
              ? game.drawerOrder.includes(viewerPlayerId)
              : game.drawerOrder[0] === viewerPlayerId
          )
        )
      );

    const {
      guesserQueue: _guesserQueue,
      ...clientState
    } = game;

    return {
      ...clientState,
      answer: canSeeAnswer
        ? game.answer
        : null,
      serverNow: Date.now(),
    };
  }

  deleteGame(roomId: string): boolean {
    return this.games.delete(roomId);
  }

}

export const relayDrawingGameManager =
  new RelayDrawingGameManager();