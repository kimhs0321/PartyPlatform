import {
  ClientLiarGameState,
  LiarGameSettings,
  LiarGameState,
  LiarPlayerState,
} from "../../../shared/types/liar/liarGame.js";
import { LIAR_KEYWORDS } from "../../../shared/keywords/liarKeywords.js";

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
      descriptionOrder: [],
      currentDescriptionIndex: 0,
      descriptions: [],
      normalChats: [],
      votes: {},
      tieCandidates: [],
      timerEndsAt: null,
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

    return {
      roomId: game.roomId,
      phase: game.phase,
      round: game.round,
      settings: game.settings,

      players: game.players.map((player) => ({
        playerId: player.playerId,
        name: player.name,
        score: player.score,
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
      paused: game.paused,
    };
  }  

  startRound(roomId: string): LiarGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error("라이어게임이 생성되지 않았습니다.");
    }

    if (game.players.length < 3) {
      throw new Error("라이어게임은 최소 3명 이상 필요합니다.");
    }

    game.round += 1;
    game.phase = "DESCRIPTION";

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

    game.players = game.players.map((player) => {
      const isLiar = liarIds.includes(player.playerId);

      return {
        ...player,
        keyword: isLiar ? liarKeyword : citizenKeyword,
        isLiar,
        status:
          player.playerId === game.descriptionOrder[0]
            ? "ACTIVE"
            : player.status === "LEFT"
              ? "LEFT"
              : "WAITING",
      };
    });

    game.timerEndsAt = Date.now() + game.settings.descriptionTime * 1000;

    this.games.set(roomId, game);
    return game;
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

  deleteGame(roomId: string) {
    this.games.delete(roomId);
  }
}

export const liarGameManager = new LiarGameManager();