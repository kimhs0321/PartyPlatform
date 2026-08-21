import type { Server, Socket } from "socket.io";
import { playerManager } from "../../../managers/PlayerManager";
import { roomManager } from "../../../managers/RoomManager";
import type { UlsanMarbleSettings } from "../../../shared/types/ulsanMarble";
import { emitRoomInfo } from "../../common/roomEmitter";

export function updateUlsanMarbleSettings(
  io: Server,
  socket: Socket,
) {
  return (
    settings: Partial<UlsanMarbleSettings>,
  ) => {
    const player = playerManager.getPlayer(socket.id);

    if (!player?.roomId) return;

    const room = roomManager.getRoom(player.roomId);

    if (!room) return;

    // 방장만 설정 변경 가능
    if (room.hostId !== player.id) return;

    // 울산마블 방에서만 변경 가능
    if (room.game !== "울산마블") return;

    const nextSettings: Partial<UlsanMarbleSettings> = {};

    if (
      typeof settings.startingMoney === "number" &&
      Number.isFinite(settings.startingMoney)
    ) {
      nextSettings.startingMoney = Math.max(
        0,
        Math.round(settings.startingMoney),
      );
    }

    if (
      typeof settings.salary === "number" &&
      Number.isFinite(settings.salary)
    ) {
      nextSettings.salary = Math.max(
        0,
        Math.round(settings.salary),
      );
    }

    if (Object.keys(nextSettings).length === 0) {
      return;
    }

    const updatedRoom =
      roomManager.updateUlsanMarbleSettings(
        player.roomId,
        nextSettings,
      );

    if (!updatedRoom) return;

    emitRoomInfo(io, updatedRoom.id);
  };
}