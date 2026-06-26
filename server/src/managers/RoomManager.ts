import type { Room } from "../types/Room";
import type { Player } from "../types/Player";

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
      password,
      status: "waiting",
      game,
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
      players: room.playerIds
        .map((playerId) => getPlayer(playerId))
        .filter((player): player is { id: string; nickname: string } => Boolean(player))
        .map((player) => ({
          id: player.id,
          nickname: player.nickname,
          isHost: player.id === room.hostId,
        })),
    };
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
    
}

export const roomManager = new RoomManager();