import {
  ClientLiarGameState,
  LiarGameSettings,
  LiarGameState,
  LiarPlayerState,
} from "../../../shared/types/liar/liarGame";
import { LIAR_KEYWORDS } from "../../../shared/keywords/liarKeywords";

type LiarGamePlayerInput = {
  id: string;
  name: string;
};

class LiarGameManager {
  private games = new Map<string, LiarGameState>();

  createGame(
    roomId: string,
    players: LiarGamePlayerInput[],
    settings: LiarGameSettings
  ): LiarGameState {
    const liarPlayers: LiarPlayerState[] = players.map((player) => ({
      playerId: player.id,
      name: player.name,
      score: 0,
      scoreDelta: 0,
      scoreReasons: [],
      keyword: "",
      isLiar: false,
      status: "WAITING",
    }));

    const game: LiarGameState = {
      roomId,
      phase: "WAITING",
      round: 0,
      settings,
      players: liarPlayers,
      citizenKeyword: "",
      liarKeyword: "",
      liarGuess: null,
      descriptionOrder: [],
      currentDescriptionIndex: 0,
      descriptions: [],
      normalChats: [],
      votes: {},
      tieCandidates: [],
      timerEndsAt: null,
      remainingTimeMs: null,
      paused: false,
    };

    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId: string): LiarGameState | undefined {
    return this.games.get(roomId);
  }

  toClientState(roomId: string, playerId: string): ClientLiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    const me = game.players.find((player) => player.playerId === playerId);
    const voteCounts = this.getVoteCounts(game);

    const topVotedPlayerIds =
      this.getTopVotedPlayerIds(voteCounts);

    const liarPlayerIds =
      game.phase === "RESULT" || game.phase === "LIAR_GUESS"
        ? game.players
            .filter(player => player.isLiar)
            .map(player => player.playerId)
        : [];
      

    const guesserPlayerId =
      game.phase === "LIAR_GUESS"
        ? game.players.find((player) => player.isLiar)?.playerId ?? null
        : null;

    const citizenKeywordForClient =
      game.phase === "LIAR_GUESS" || game.phase === "RESULT"
        ? game.citizenKeyword
        : null;    

    const votedOutPlayerIds =
      game.phase === "RESULT"
        ? topVotedPlayerIds
        : [];

    const citizensWin =
      game.phase === "RESULT"
        ? game.liarGuess !== game.citizenKeyword       
        : null;

    const resultMessage =
      game.phase === "RESULT"
        ? citizensWin
          ? "시민 팀 승리"
          : "라이어 팀 승리"
        : null;
        
    return {
      roomId: game.roomId,
      phase: game.phase,
      round: game.round,
      settings: game.settings,
      votedOutPlayerIds,
      citizensWin,
      resultMessage,
      citizenKeyword: citizenKeywordForClient,
      liarGuess: game.phase === "RESULT" ? game.liarGuess : null,
      guesserPlayerId,

      players: game.players.map((player) => ({
        playerId: player.playerId,
        name: player.name,
        score: player.score,
        scoreDelta: player.scoreDelta,
        scoreReasons: player.scoreReasons,
        status: player.status,
      })),

      myKeyword: me?.keyword ?? null,

      descriptionOrder: game.descriptionOrder,
      currentDescriptionIndex: game.currentDescriptionIndex,

      descriptions: game.descriptions,
      normalChats: game.normalChats,

      votes: game.votes,
      tieCandidates: game.tieCandidates,

      timerEndsAt: game.timerEndsAt,
      remainingTimeMs: game.remainingTimeMs,
      paused: game.paused,

      voteCounts,
      topVotedPlayerIds,
      liarPlayerIds,
    };
  }  

  startRound(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.players.length < 2) {
      throw new Error("라이어게임은 최소 3명 이상 필요합니다.");
    }

    game.round += 1;
    game.phase = "READY_CHECK";

    game.descriptions = [];
    game.normalChats = [];
    game.votes = {};
    game.tieCandidates = [];
    game.currentDescriptionIndex = 0;
    game.paused = false;

    game.descriptionOrder = this.shuffle(
      game.players
        .filter((player) => player.status !== "LEFT")
        .map((player) => player.playerId)
    );

    const liarIds = this.pickRandomIds(
      game.descriptionOrder,
      game.settings.liarCount
    );

    const [citizenKeyword, liarKeyword] = this.pickTwoDifferentKeywords();

    game.citizenKeyword = citizenKeyword;
    game.liarKeyword = liarKeyword;
    game.liarGuess = null;

    game.players = game.players.map((player) => {
      const isLiar = liarIds.includes(player.playerId);

      return {
        ...player,
        keyword: isLiar ? liarKeyword : citizenKeyword,
        isLiar,
        scoreDelta: 0,
        scoreReasons: [],

        status:
          player.playerId === game.descriptionOrder[0]
            ? "ACTIVE"
            : player.status === "LEFT"
              ? "LEFT"
              : "WAITING",
      };
    });

    game.timerEndsAt = Date.now() + 5000;

    this.games.set(roomId, game);
    return game;
  }

  startDescriptionPhase(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "READY_CHECK") {
      throw new Error("설명 단계로 넘어갈 수 없는 상태입니다.");
    }

    game.phase = "DESCRIPTION";
    game.timerEndsAt = Date.now() + game.settings.descriptionTime * 1000;

    this.games.set(roomId, game);
    return game;
  }

  submitDescription(roomId: string, playerId: string, text: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DESCRIPTION") {
      throw new Error("지금은 설명 단계가 아닙니다.");
    }

    const currentPlayerId = game.descriptionOrder[game.currentDescriptionIndex];

    if (currentPlayerId !== playerId) {
      throw new Error("현재 설명 차례가 아닙니다.");
    }

    const trimmedText = text.trim();

    if (trimmedText.length < game.settings.minDescriptionLength) {
      throw new Error(`설명은 최소 ${game.settings.minDescriptionLength}자 이상이어야 합니다.`);
    }

    if (trimmedText.length > game.settings.maxDescriptionLength) {
      throw new Error(`설명은 최대 ${game.settings.maxDescriptionLength}자까지 가능합니다.`);
    }

    const player = game.players.find((p) => p.playerId === playerId);

    if (!player) {
      throw new Error("플레이어를 찾을 수 없습니다.");
    }

    if (player.keyword && trimmedText.includes(player.keyword)) {
      throw new Error("제시어를 직접 사용할 수 없습니다.");
    }

    game.descriptions.push({
      playerId,
      playerName: player.name,
      text: trimmedText,
      likes: [],
      dislikes: [],
      createdAt: Date.now(),
    });

    game.currentDescriptionIndex += 1;

    game.players = game.players.map((p) => {
      if (p.playerId === playerId) {
        return { ...p, status: "DONE" };
      }

      const nextPlayerId = game.descriptionOrder[game.currentDescriptionIndex];

      if (p.playerId === nextPlayerId) {
        return { ...p, status: "ACTIVE" };
      }

      return p;
    });

    if (game.currentDescriptionIndex >= game.descriptionOrder.length) {
      game.phase = "REACTION";
      game.timerEndsAt = Date.now() + 5000;
    } else {
      game.timerEndsAt = Date.now() + game.settings.descriptionTime * 1000;
    }
    this.games.set(roomId, game);
    return game;
  }

  submitReaction(
    roomId: string,
    playerId: string,
    targetPlayerId: string,
    reaction: "LIKE" | "DISLIKE"
  ): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "REACTION") {
      throw new Error("설명 평가 단계가 아닙니다.");
    }

    if (playerId === targetPlayerId) {
      throw new Error("자기 설명에는 평가할 수 없습니다.");
    }

    const targetDescription = game.descriptions.find(
      (description) => description.playerId === targetPlayerId
    );

    if (!targetDescription) {
      throw new Error("평가할 설명을 찾을 수 없습니다.");
    }

    if (reaction === "LIKE") {
      game.descriptions = game.descriptions.map((description) => ({
        ...description,
        likes: description.likes.filter((id) => id !== playerId),
      }));

      const nextTargetDescription = game.descriptions.find(
        (description) => description.playerId === targetPlayerId
      );

      nextTargetDescription?.likes.push(playerId);
    }

    if (reaction === "DISLIKE") {
      game.descriptions = game.descriptions.map((description) => ({
        ...description,
        dislikes: description.dislikes.filter((id) => id !== playerId),
      }));

      const nextTargetDescription = game.descriptions.find(
        (description) => description.playerId === targetPlayerId
      );

      nextTargetDescription?.dislikes.push(playerId);
    }

    this.games.set(roomId, game);
    return game;
  }

  startDiscussionPhase(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "REACTION") {
      throw new Error("토론 단계로 넘어갈 수 없는 상태입니다.");
    }

    game.phase = "DISCUSSION";
    game.timerEndsAt = Date.now() + game.settings.discussionTime * 1000;

    this.games.set(roomId, game);
    return game;
  }

  sendChat(roomId: string, playerId: string, text: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "DISCUSSION") {
      throw new Error("토론 단계에서만 채팅할 수 있습니다.");
    }

    const player = game.players.find((p) => p.playerId === playerId);

    if (!player) {
      throw new Error("플레이어를 찾을 수 없습니다.");
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error("채팅 내용을 입력하세요.");
    }

    game.normalChats.push({
      playerId,
      playerName: player.name,
      text: trimmedText,
      createdAt: Date.now(),
    });

    this.games.set(roomId, game);
    return game;
  }

  startVotingPhase(roomId: string): LiarGameState {
  const game = this.games.get(roomId);

  if (!game) {
    throw new Error("라이어게임이 생성되지 않았습니다.");
  }

  if (game.phase !== "DISCUSSION") {
    throw new Error("투표 단계로 넘어갈 수 없는 상태입니다.");
  }

  game.phase = "VOTING";
  game.votes = {};
  game.tieCandidates = []; 
  game.timerEndsAt = Date.now() + game.settings.voteTime * 1000;

  this.games.set(roomId, game);
  return game;
}

  submitVote(roomId: string, voterId: string, targetId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (
      game.phase !== "VOTING" &&
      game.phase !== "REVOTE"
    ) {
      throw new Error("지금은 투표 단계가 아닙니다.");
    }

    if (voterId === targetId) {
      throw new Error("자기 자신에게 투표할 수 없습니다.");
    }

    if (game.votes[voterId]) {
      throw new Error("이미 투표했습니다.");
    }

    const target = game.players.find((player) => {
      if (player.playerId !== targetId) return false;
      if (player.status === "LEFT") return false;

      if (
        game.phase === "REVOTE" &&
        !game.tieCandidates.includes(player.playerId)
      ) {
        return false;
      }

      return true;
    });
    if (!target) {
      throw new Error("투표 대상을 찾을 수 없습니다.");
    }

    game.votes[voterId] = targetId;


    const activePlayers = game.players.filter(
      (player) => player.status !== "LEFT"
    );

    if (Object.keys(game.votes).length === activePlayers.length) {
        return this.startResultPhase(roomId);
    }
    this.games.set(roomId, game);
    return game;
  }

  startTieSpeechPhase(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "VOTING") {
      throw new Error("최후 변론 단계로 넘어갈 수 없습니다.");
    }

    const voteCounts = this.getVoteCounts(game);
    const topVotedPlayerIds = this.getTopVotedPlayerIds(voteCounts);

    if (topVotedPlayerIds.length <= 1) {
      throw new Error("동점 상황이 아닙니다.");
    }

    game.phase = "TIE_SPEECH";
    game.tieCandidates = topVotedPlayerIds;
    game.timerEndsAt = Date.now() + game.settings.tieSpeechTime * 1000;

    this.games.set(roomId, game);
    return game;
  }

  startRevotePhase(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "TIE_SPEECH") {
      throw new Error("재투표 단계로 넘어갈 수 없습니다.");
    }

    game.phase = "REVOTE";
    game.votes = {};
    game.timerEndsAt = Date.now() + game.settings.voteTime * 1000;

    this.games.set(roomId, game);
    return game;
  }

  startResultPhase(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (
      game.phase !== "VOTING" &&
      game.phase !== "REVOTE"
    ) {
      throw new Error("결과 단계로 넘어갈 수 없습니다.");
    }

    const voteCounts = this.getVoteCounts(game);
    const topVotedPlayerIds = this.getTopVotedPlayerIds(voteCounts);

    if (topVotedPlayerIds.length > 1) {

      // 첫 투표 동점 → 최후변론
      if (game.phase === "VOTING") {
        return this.startTieSpeechPhase(roomId);
      }

      // 재투표도 동점이면 첫 번째 후보 선택
      topVotedPlayerIds.splice(1);
    }

    const liarCaught = topVotedPlayerIds.some(playerId =>
      game.players.some(
        player =>
          player.playerId === playerId &&
          player.isLiar
      )
    );

    if (liarCaught) {
      game.phase = "LIAR_GUESS";
    } else {
      game.liarGuess = game.citizenKeyword;

      this.applyRoundScore(game, false);

      game.phase = "RESULT";
    }

    game.timerEndsAt = Date.now() + 5000;

    this.games.set(roomId, game);
    return game;
  }

  submitLiarGuess(
    roomId: string,
    playerId: string,
    guess: string
  ): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.phase !== "LIAR_GUESS") {
      throw new Error("지금은 라이어 추측 단계가 아닙니다.");
    }

    const liar = game.players.find((player) => player.isLiar);

    if (!liar) {
      throw new Error("라이어를 찾을 수 없습니다.");
    }

    if (liar.playerId !== playerId) {
      throw new Error("라이어만 제시어를 추측할 수 있습니다.");
    }

    const trimmedGuess = guess.trim();

    if (!trimmedGuess) {
      throw new Error("제시어를 입력하세요.");
    }

    game.liarGuess = trimmedGuess;
    this.applyRoundScore(game, true);
    game.phase = "RESULT";
    game.timerEndsAt = Date.now() + 5000;

    this.games.set(roomId, game);
    return game;
  }

  private addScore(
    player: LiarPlayerState,
    delta: number,
    reason: string
  ): LiarPlayerState {
    return {
      ...player,
      score: player.score + delta,
      scoreDelta: player.scoreDelta + delta,
      scoreReasons: [...player.scoreReasons, reason],
    };
  }

  private applyRoundScore(
    game: LiarGameState,
    liarWasCaught: boolean
  ): void {
    const liarWon =
      !liarWasCaught ||
      game.liarGuess === game.citizenKeyword;

    const citizensWin = !liarWon;

    const likeCounts: Record<string, number> = {};
    const dislikeCounts: Record<string, number> = {};

    game.descriptions.forEach((description) => {
      likeCounts[description.playerId] = description.likes.length;
      dislikeCounts[description.playerId] = description.dislikes.length;
    });

    const maxLike = Math.max(0, ...Object.values(likeCounts));
    const maxDislike = Math.max(0, ...Object.values(dislikeCounts));

    const mostLikedPlayerIds =
      maxLike > 0
        ? Object.entries(likeCounts)
            .filter(([, count]) => count === maxLike)
            .map(([playerId]) => playerId)
        : [];

    const mostDislikedPlayerIds =
      maxDislike > 0
        ? Object.entries(dislikeCounts)
            .filter(([, count]) => count === maxDislike)
            .map(([playerId]) => playerId)
        : [];

    game.players = game.players.map((player) => {
      if (player.status === "LEFT") return player;

      let updatedPlayer = {
        ...player,
      };

      if (citizensWin && !player.isLiar) {
        updatedPlayer = this.addScore(
          updatedPlayer,
          1,
          "시민 승리 +1"
        );
      }

      if (!citizensWin && player.isLiar) {
        updatedPlayer = this.addScore(
          updatedPlayer,
          liarWasCaught ? 2 : 3,
          liarWasCaught
            ? "제시어 추측 성공 +2"
            : "라이어 생존 승리 +3"
        );
      }

      if (mostLikedPlayerIds.includes(player.playerId)) {
        updatedPlayer = this.addScore(
          updatedPlayer,
          1,
          "최다 좋아요 +1"
        );
      }

      if (mostDislikedPlayerIds.includes(player.playerId)) {
        updatedPlayer = this.addScore(
          updatedPlayer,
          -0.5,
          "최다 싫어요 -0.5"
        );
      }

      return updatedPlayer;
    });
  }

  private getVoteCounts(game: LiarGameState): Record<string, number> {
    const counts: Record<string, number> = {};

    game.players.forEach((player) => {
      counts[player.playerId] = 0;
    });

    Object.values(game.votes).forEach((targetId) => {
      counts[targetId] = (counts[targetId] ?? 0) + 1;
    });

    return counts;
  }

  private getTopVotedPlayerIds(voteCounts: Record<string, number>): string[] {
    const maxVote = Math.max(...Object.values(voteCounts));

    if (maxVote <= 0) {
      return [];
    }

    return Object.entries(voteCounts)
      .filter(([, count]) => count === maxVote)
      .map(([playerId]) => playerId);
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private pickRandomIds(ids: string[], count: number): string[] {
    return this.shuffle(ids).slice(0, count);
  }

  private pickTwoDifferentKeywords(): [string, string] {
    if (LIAR_KEYWORDS.length < 2) {
      throw new Error("제시어는 최소 2개 이상 필요합니다.");
    }

    const shuffled = this.shuffle([...LIAR_KEYWORDS]);
    return [shuffled[0], shuffled[1]];
  }  

  pauseGame(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.paused) {
      return game;
    }

    game.paused = true;

    if (game.timerEndsAt) {
      game.remainingTimeMs = Math.max(
        0,
        game.timerEndsAt - Date.now()
      );

      game.timerEndsAt = null;
    }

    this.games.set(roomId, game);
    return game;
  }

  resumeGame(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (!game.paused) {
      return game;
    }

    game.paused = false;

    if (game.remainingTimeMs !== null) {
      game.timerEndsAt =
        Date.now() + game.remainingTimeMs;

      game.remainingTimeMs = null;
    }

    this.games.set(roomId, game);
    return game;
  }

  nextRound(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.round >= game.settings.roundCount) {
      game.phase = "GAME_END";
      game.timerEndsAt = null;

      this.games.set(roomId, game);
      return game;
    }

    return this.startRound(roomId);
  }

  deleteGame(roomId: string) {
    this.games.delete(roomId);
  }
}

export const liarGameManager = new LiarGameManager();