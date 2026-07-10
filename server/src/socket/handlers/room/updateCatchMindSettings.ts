import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import type { CatchMindGameSettings } from "../../../games/catchMind/types/catchMindGame";

type CatchMindSettingsUpdate = Partial<CatchMindGameSettings>;

export function updateCatchMindSettings(io: Server, socket: Socket) {
  return (data: CatchMindSettingsUpdate) => {
    try {
      const player = playerManager.getPlayer(socket.id);

      if (!player?.roomId) {
        throw new Error("참가 중인 방을 찾을 수 없습니다.");
      }

      const room = roomManager.getRoom(player.roomId);

      if (!room) {
        throw new Error("방을 찾을 수 없습니다.");
      }

      if (room.hostId !== socket.id) {
        throw new Error("방장만 설정을 변경할 수 있습니다.");
      }

      room.gameSettings.catchMind = {
        ...room.gameSettings.catchMind,
        ...data,
      };

      io.to(room.id).emit(EVENTS.ROOM_INFO, room);
    } catch (error) {
      console.error("캐치마인드 설정 변경 실패", error);
    }
  };
}