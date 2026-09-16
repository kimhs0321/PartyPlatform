import type {
  Server,
  Socket,
} from "socket.io";

import { EVENTS } from "../../shared/events";
import { playerManager } from "../../managers/PlayerManager";
import { roomManager } from "../../managers/RoomManager";

type RoomChatRequest = {
  roomId?: string;
  text?: string;
};

type RoomChatMessage = {
  roomId: string;
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

const MAX_CHAT_LENGTH = 200;

export function registerRoomChat(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    EVENTS.ROOM_SEND_CHAT,
    (request: RoomChatRequest) => {
      const player =
        playerManager.getPlayer(
          socket.id,
        );

      if (!player?.roomId) {
        return;
      }

      const room =
        roomManager.getRoom(
          player.roomId,
        );

      if (!room) {
        return;
      }

      /*
       * 클라이언트가 다른 roomId를
       * 임의로 보내는 것도 차단.
       */
      if (
        request?.roomId &&
        request.roomId !== room.id
      ) {
        return;
      }

      if (
        !room.playerIds.includes(
          player.id,
        )
      ) {
        return;
      }

      const text =
        typeof request?.text ===
        "string"
          ? request.text
              .trim()
              .slice(
                0,
                MAX_CHAT_LENGTH,
              )
          : "";

      if (!text) {
        return;
      }

      const message:
        RoomChatMessage = {
          roomId: room.id,
          playerId: player.id,
          playerName:
            player.nickname,
          text,
          createdAt: Date.now(),
        };

      /*
       * 절대로 io.emit 하지 않는다.
       * 현재 게임방 참가자만 받는다.
       */
      room.playerIds.forEach(
        (playerId) => {
          io.to(playerId).emit(
            EVENTS.ROOM_CHAT_MESSAGE,
            message,
          );
        },
      );
    },
  );
}