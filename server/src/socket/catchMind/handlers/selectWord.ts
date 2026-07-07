import type { Server, Socket } from "socket.io";
import { catchMindGameManager } from "../../../managers/CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";
import { scheduleDrawingTimeout } from "../catchMindScheduler";

type SelectWordPayload = {
  roomId: string;
  word: string;
};

export function selectWord(io: Server, socket: Socket) {
  return (payload: SelectWordPayload) => {
    try {
      const { roomId, word } = payload;

      catchMindGameManager.selectWord(roomId, socket.id, word);

      emitCatchMindState(io, roomId);

      scheduleDrawingTimeout(io, roomId);
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "단어 선택 중 오류가 발생했습니다.",
      });
    }
  };
}