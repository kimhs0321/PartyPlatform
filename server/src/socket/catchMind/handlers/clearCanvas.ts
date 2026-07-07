import type { Server, Socket } from "socket.io";
import { catchMindGameManager } from "../../../managers/CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";

type ClearCanvasPayload = {
  roomId: string;
};

export function clearCanvas(io: Server, socket: Socket) {
  return (payload: ClearCanvasPayload) => {
    try {
      const { roomId } = payload;

      catchMindGameManager.clearCanvas(roomId, socket.id);

      emitCatchMindState(io, roomId);
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "캔버스 초기화 중 오류가 발생했습니다.",
      });
    }
  };
}