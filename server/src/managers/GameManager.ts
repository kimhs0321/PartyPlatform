import type { GameState } from "../shared/types/GameState";
import type { Room } from "../shared/types/Room";

class GameManager {
  private games = new Map<string, GameState>();

  startGame(room: Room) {
    const gameState: GameState = {
      roomId: room.id,
      game: room.game,
      phase: "playing",
      startedAt: Date.now(),
    };

    this.games.set(room.id, gameState);

    return gameState;
  }

  getGame(roomId: string) {
    return this.games.get(roomId) ?? null;
  }

  endGame(roomId: string) {
    const gameState = this.games.get(roomId);

    if (!gameState) {
      return null;
    }

    gameState.phase = "ended";
    this.games.set(roomId, gameState);

    return gameState;
  }

  removeGame(roomId: string) {
    this.games.delete(roomId);
  }
}

export const gameManager = new GameManager();