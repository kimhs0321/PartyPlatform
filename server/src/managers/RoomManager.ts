import type { Room } from "../shared/types/Room";
import type { Player } from "../shared/types/Player";
import { DEFAULT_LIAR_GAME_SETTINGS } from "../shared/types/liarGame";

class RoomManager {
  private rooms = new Map<string, Room>();
  private nextRoomId = 1001;

  createRoom(
    title: string,
    host: Player,
    maxPlayers: number,
    password = "",
    game = "라이어 게임"
  ) {
    const roomId = String(this.nextRoomId++);

    const room: Room = {
      id: roomId,
      title,
      hostId: host.id,
      maxPlayers,
      playerIds: [host.id],
      readyPlayerIds: [],
      password,
      status: "waiting",
      game,
      gameSettings: {
        liar: { ...DEFAULT_LIAR_GAME_SETTINGS },
      },
    };

  this.rooms.set(roomId, room);
  return room;
}

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  toRoomDto(roomId: string, getPlayer: (id: string) => { id: string; nickname: string } | undefined) {
    const room = this.rooms.get(roomId);

    if (!room) return null;

    return {
      id: room.id,
      title: room.title,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      game: room.game,
      status: room.status,
      gameSettings: room.gameSettings,

      players: room.playerIds
        .map((playerId) => getPlayer(playerId))
        .filter((player): player is { id: string; nickname: string } => Boolean(player))
        .map((player) => ({
          id: player.id,
          nickname: player.nickname,
          isHost: player.id === room.hostId,
          isReady: room.readyPlayerIds.includes(player.id),
        })),
    };
  }

  toggleReady(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);

    if (!room) return null;

    if (room.readyPlayerIds.includes(playerId)) {
      room.readyPlayerIds = room.readyPlayerIds.filter((id) => id !== playerId);
    } else {
      room.readyPlayerIds.push(playerId);
    }

    this.rooms.set(roomId, room);

    return room;
  }

  canStartGame(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    if (room.hostId !== playerId) {
      return false;
    }

    const nonHostPlayerIds = room.playerIds.filter((id) => id !== room.hostId);

    if (nonHostPlayerIds.length === 0) {
      return false;
    }

    return nonHostPlayerIds.every((id) => room.readyPlayerIds.includes(id));
  }

  startGame(roomId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    room.status = "playing";
    this.rooms.set(roomId, room);

    return room;
  }

  joinRoom(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    if (room.playerIds.includes(playerId)) {
      return room;
    }

    if (room.playerIds.length >= room.maxPlayers) {
      return null;
    }

    room.playerIds.push(playerId);

    this.rooms.set(roomId, room);

    return room;
  }

  leaveRoom(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);

    if (!room) return null;

    room.playerIds = room.playerIds.filter((id) => id !== playerId);
    room.readyPlayerIds = room.readyPlayerIds.filter((id) => id !== playerId);

    if (room.playerIds.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    if (room.hostId === playerId) {
      room.hostId = room.playerIds[0];
    }

    this.rooms.set(roomId, room);

    return room;
  }

  endGame(roomId: string) {
    const room = this.rooms.get(roomId);

    if (!room) return null;

    room.status = "waiting";
    room.readyPlayerIds = [];

    this.rooms.set(roomId, room);

    return room;
  }
      
}

export const roomManager = new RoomManager();