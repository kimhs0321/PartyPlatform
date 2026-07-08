import {
  CatchMindGameSettings,
  CatchMindGameState,
  CatchMindPlayerState,
  ClientCatchMindGameState,
  DrawingStroke,
} from "../shared/types/catchMind/catchMindGame";
import { CATCH_MIND_WORDS } from "../../../shared/keywords/catchMindKeywords";


type CatchMindGamePlayerInput = {
  id: string;
  name: string;
};

class CatchMindGameManager {
  private games = new Map<string, CatchMindGameState>();

  createGame(
    roomId: string,
    players: CatchMindGamePlayerInput[],
    settings: CatchMindGameSettings
  ): CatchMindGameState {
    const catchMindPlayers: CatchMindPlayerState[] = players.map((player) => ({
      playerId: player.id,
      name: player.name,
      score: 0,
      scoreDelta: 0,
      scoreReasons: [],
      status: "WAITING",
    }));

    const game: CatchMindGameState = {
      roomId,
      phase: "WAITING",
      round: 0,
      settings,
      players: catchMindPlayers,

      drawerOrder: [],
      currentDrawerIndex: 0,

      answer: null,
      wordCandidates: [],

      guessedPlayerIds: [],

      chats: [],
      strokes: [],

      timerEndsAt: null,
      remainingTimeMs: null,
      paused: false,
    };

    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string): CatchMindGameState | undefined {
    return this.games.get(roomId);
  }

  toClientState(roomId: string, playerId: string): ClientCatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);
    const isDrawer = currentDrawerPlayerId === playerId;
    const hasGuessed = game.guessedPlayerIds.includes(playerId);

    const remainingSeconds =
      game.paused && game.remainingTimeMs !== null
        ? Math.max(0, Math.ceil(game.remainingTimeMs / 1000))
        : game.timerEndsAt !== null
        ? Math.max(0, Math.ceil((game.timerEndsAt - Date.now()) / 1000))
        : 0;

    return {
      roomId: game.roomId,
      phase: game.phase,
      round: game.round,
      settings: game.settings,

      players: game.players,

      currentDrawerPlayerId,

      drawerOrder: game.drawerOrder,

      wordCandidates:
        game.phase === "WORD_SELECT" && isDrawer ? game.wordCandidates : [],

      answer:
        isDrawer || hasGuessed || game.phase === "ROUND_RESULT"
          ? game.answer
          : null,

      hint: this.makeHint(game.answer),

      guessedPlayerIds: game.guessedPlayerIds,

      chats: game.chats,
      strokes: game.strokes,

      timerEndsAt: game.timerEndsAt,
      remainingTimeMs: game.remainingTimeMs,
      remainingSeconds,
      serverNow: Date.now(),

      paused: game.paused,
    };
  }

  startRound(roomId: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    const activePlayers = game.players.filter(
      (player) => player.status !== "LEFT"
    );

    if (activePlayers.length < 2) {
      throw new Error("캐치마인드는 최소 2명 이상 필요합니다.");
    }

    game.round += 1;
    game.phase = "WORD_SELECT";

    game.drawerOrder = this.shuffle(
      activePlayers.map((player) => player.playerId)
    );
    game.currentDrawerIndex = 0;

    game.answer = null;
    game.wordCandidates = this.pickRandomWords(3);

    game.players = game.players.map((player) => ({
      ...player,
      scoreDelta: 0,
      scoreReasons: [],
    }));
    game.guessedPlayerIds = [];
    game.chats = [];
    game.strokes = [];

    game.paused = false;
    game.remainingTimeMs = null;
    game.timerEndsAt = Date.now() + game.settings.wordSelectTime * 1000;

    this.updatePlayerStatuses(game);

    this.games.set(roomId, game);
    return game;
  }

    selectWord(
        roomId: string,
        playerId: string,
        word: string
        ): CatchMindGameState {
        const game = this.games.get(roomId);

    if (!game) {
        throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "WORD_SELECT") {
        throw new Error("지금은 단어 선택 단계가 아닙니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    if (currentDrawerPlayerId !== playerId) {
        throw new Error("현재 출제자만 단어를 선택할 수 있습니다.");
    }

    if (!game.wordCandidates.includes(word)) {
        throw new Error("선택 가능한 단어가 아닙니다.");
    }

    game.answer = word;
    game.phase = "DRAWING";
    game.wordCandidates = [];
    game.guessedPlayerIds = [];
    game.chats = [];
    game.strokes = [];
    game.timerEndsAt = Date.now() + game.settings.drawingTime * 1000;

    this.updatePlayerStatuses(game);

    this.games.set(roomId, game);
    return game;
    }

  selectRandomWord(roomId: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
        throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "WORD_SELECT") {
        throw new Error("지금은 단어 선택 단계가 아닙니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    if (!currentDrawerPlayerId) {
        throw new Error("현재 출제자를 찾을 수 없습니다.");
    }

    const randomWord = this.shuffle(game.wordCandidates)[0];

    if (!randomWord) {
        throw new Error("선택할 단어가 없습니다.");
    }

    return this.selectWord(roomId, currentDrawerPlayerId, randomWord);
    }

  finishRound(roomId: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
        throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
        throw new Error("지금은 그림 단계가 아닙니다.");
    }

    game.phase = "ROUND_RESULT";
    game.timerEndsAt = Date.now() + game.settings.roundResultTime * 1000;
    

    this.updatePlayerStatuses(game);

    this.games.set(roomId, game);
    return game;
    }

  nextTurnOrRound(roomId: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
        throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "ROUND_RESULT") {
        throw new Error("라운드 결과 단계가 아닙니다.");
    }

    const activePlayerCount = game.drawerOrder.length;
  
    const isLastDrawer = game.currentDrawerIndex >= activePlayerCount - 1;

    if (!isLastDrawer) {
        game.currentDrawerIndex += 1;
        game.phase = "WORD_SELECT";
        game.answer = null;
        game.wordCandidates = this.pickRandomWords(3);
        game.guessedPlayerIds = [];
        game.chats = [];
        game.strokes = [];
        game.timerEndsAt = Date.now() + game.settings.wordSelectTime * 1000;

        this.updatePlayerStatuses(game);
        this.games.set(roomId, game);
        return game;
    }

    if (game.round >= game.settings.roundCount) {
        game.phase = "GAME_END";
        game.timerEndsAt = null;
        game.remainingTimeMs = null;
        game.paused = false;

        this.games.set(roomId, game);
        return game;
    }

    return this.startRound(roomId);
    }

  markPlayerLeft(roomId: string, playerId: string): CatchMindGameState | null {
    const game = this.games.get(roomId);
    if (!game) return null;

    game.players = game.players.map((player) =>
      player.playerId === playerId ? { ...player, status: "LEFT" } : player
    );

    game.drawerOrder = game.drawerOrder.filter((id) => id !== playerId);

    if (game.currentDrawerIndex >= game.drawerOrder.length) {
      game.currentDrawerIndex = Math.max(0, game.drawerOrder.length - 1);
    }

    this.updatePlayerStatuses(game);
    this.games.set(roomId, game);

    return game;
  }    

  addStroke(
    roomId: string,
    playerId: string,
    stroke: DrawingStroke
  ): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
      throw new Error("지금은 그림을 그릴 수 없습니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    if (currentDrawerPlayerId !== playerId) {
      throw new Error("현재 출제자만 그림을 그릴 수 있습니다.");
    }

    game.strokes.push(stroke);

    this.games.set(roomId, game);
    return game;
  }

  clearCanvas(roomId: string, playerId: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
      throw new Error("지금은 캔버스를 지울 수 없습니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    if (currentDrawerPlayerId !== playerId) {
      throw new Error("현재 출제자만 캔버스를 지울 수 있습니다.");
    }

    game.strokes = [];

    this.games.set(roomId, game);
    return game;
  }

  submitGuess(roomId: string, playerId: string, text: string): CatchMindGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("캐치마인드 게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DRAWING") {
      throw new Error("지금은 정답을 입력할 수 없습니다.");
    }

    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    if (game.guessedPlayerIds.length > 0) {
      throw new Error("이미 정답자가 나왔습니다.");
    }

    const player = game.players.find((p) => p.playerId === playerId);

    if (!player || player.status === "LEFT") {
      throw new Error("플레이어를 찾을 수 없습니다.");
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error("채팅 내용을 입력하세요.");
    }

    if (currentDrawerPlayerId === playerId) {
      game.chats.push({
        playerId,
        playerName: player.name,
        text: trimmedText,
        createdAt: Date.now(),
      });

    const answer = game.answer?.trim().toLowerCase() ?? "";
    const guess = trimmedText.trim().toLowerCase();

    if (guess !== answer) {
      game.chats.push({
        playerId,
        playerName: player.name,
        text: trimmedText,
        createdAt: Date.now(),
      });

      this.games.set(roomId, game);
      return game;
    }

    const score = this.calculateGuessScore(game);

    game.guessedPlayerIds = [playerId];

    game.players = game.players.map((p) =>
      p.playerId === playerId
        ? {
            ...p,
            score: p.score + score,
            scoreDelta: p.scoreDelta + score,
            scoreReasons: [...p.scoreReasons, `정답 +${score}`],
            status: "GUESSED",
          }
        : p
    );

    game.chats.push({
      playerId,
      playerName: player.name,
      text: "정답!",
      createdAt: Date.now(),
    });

    game.phase = "ROUND_RESULT";
    game.timerEndsAt = Date.now() + game.settings.roundResultTime * 1000;
    this.updatePlayerStatuses(game);

    this.games.set(roomId, game);
    return game;
  }

  private updatePlayerStatuses(game: CatchMindGameState): void {
    const currentDrawerPlayerId = this.getCurrentDrawerPlayerId(game);

    game.players = game.players.map((player) => {
      if (player.status === "LEFT") return player;

      if (player.playerId === currentDrawerPlayerId) {
        return {
          ...player,
          status: game.phase === "DRAWING" ? "DRAWING" : "WAITING",
        };
      }

      if (game.guessedPlayerIds.includes(player.playerId)) {
        return {
          ...player,
          status: "GUESSED",
        };
      }

      return {
        ...player,
        status: "WAITING",
      };
    });
  }

  private getCurrentDrawerPlayerId(game: CatchMindGameState): string | null {
    if (game.drawerOrder.length === 0) return null;

    return game.drawerOrder[game.currentDrawerIndex] ?? null;
  }

  private makeHint(answer: string | null): string {
    if (!answer) return "";

    return answer
      .split("")
      .map((char) => (char === " " ? " " : "□"))
      .join("");
  }

  private pickRandomWords(count: number): string[] {
    return this.shuffle(CATCH_MIND_WORDS).slice(0, count);
  }  

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  private calculateGuessScore(game: CatchMindGameState): number {
    if (!game.timerEndsAt) return 20;

    const remainingMs = Math.max(0, game.timerEndsAt - Date.now());
    const totalMs = game.settings.drawingTime * 1000;
    const ratio = remainingMs / totalMs;

    if (ratio >= 0.8) return 100;
    if (ratio >= 0.6) return 80;
    if (ratio >= 0.4) return 60;
    if (ratio >= 0.2) return 40;
    return 20;
  }
}

export const catchMindGameManager = new CatchMindGameManager();