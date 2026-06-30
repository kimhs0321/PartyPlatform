import type { Player } from "../shared/types/Player";

class PlayerManager {
  private players = new Map<string, Player>();

  addPlayer(id: string, nickname: string) {
    const player: Player = {
      id,
      nickname,
    };

    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }

  getPlayer(id: string) {
    return this.players.get(id);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  setPlayerRoom(id: string, roomId?: string) {
    const player = this.players.get(id);

    if (!player) return;

    player.roomId = roomId;
    this.players.set(id, player);
  }
}

export const playerManager = new PlayerManager();