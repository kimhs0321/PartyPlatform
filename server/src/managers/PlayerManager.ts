import type { Player } from "../shared/types/Player";

class PlayerManager {
  private players = new Map<string, Player>();

  private socketToPlayerId =
    new Map<string, string>();

  private playerToSocketId =
    new Map<string, string>();

  bindSocket(
    playerId: string,
    socketId: string,
  ) {
    const previousSocketId =
      this.playerToSocketId.get(playerId);

    if (
      previousSocketId &&
      previousSocketId !== socketId
    ) {
      this.socketToPlayerId.delete(
        previousSocketId,
      );
    }

    this.socketToPlayerId.set(
      socketId,
      playerId,
    );

    this.playerToSocketId.set(
      playerId,
      socketId,
    );
  }

  unbindSocket(socketId: string) {
    const playerId =
      this.socketToPlayerId.get(socketId);

    if (!playerId) return;

    this.socketToPlayerId.delete(socketId);

    if (
      this.playerToSocketId.get(playerId) ===
      socketId
    ) {
      this.playerToSocketId.delete(playerId);
    }
  }

  getPlayerId(
    idOrSocketId: string,
  ): string | undefined {
    if (
      this.players.has(idOrSocketId) ||
      this.playerToSocketId.has(idOrSocketId)
    ) {
      return idOrSocketId;
    }

    return this.socketToPlayerId.get(
      idOrSocketId,
    );
  }

  getSocketId(
    playerId: string,
  ): string | undefined {
    return this.playerToSocketId.get(
      playerId,
    );
  }

  isConnected(playerId: string) {
    return this.playerToSocketId.has(
      playerId,
    );
  }

  addPlayer(id: string, nickname: string) {
    const playerId =
      this.getPlayerId(id) ?? id;

    const existing =
      this.players.get(playerId);

    if (existing) {
      existing.nickname = nickname;

      this.players.set(
        playerId,
        existing,
      );

      return existing;
    }

    const player: Player = {
      id: playerId,
      nickname,
    };

    this.players.set(
      playerId,
      player,
    );

    return player;
  }

  removePlayer(id: string) {
    const playerId =
      this.getPlayerId(id) ?? id;

    const socketId =
      this.playerToSocketId.get(playerId);

    if (socketId) {
      this.socketToPlayerId.delete(
        socketId,
      );
    }

    this.playerToSocketId.delete(
      playerId,
    );

    this.players.delete(playerId);
  }

  getPlayer(id: string) {
    const playerId =
      this.getPlayerId(id);

    if (!playerId) {
      return undefined;
    }

    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(
      this.players.values(),
    );
  }

  setPlayerRoom(
    id: string,
    roomId?: string,
  ) {
    const playerId =
      this.getPlayerId(id);

    if (!playerId) return;

    const player =
      this.players.get(playerId);

    if (!player) return;

    player.roomId = roomId;

    this.players.set(
      playerId,
      player,
    );
  }
}

export const playerManager = new PlayerManager();