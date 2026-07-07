import type { Server, Socket } from "socket.io";
import type { DrawingStroke } from "../../../shared/types/catchMind/catchMindGame";
import { catchMindGameManager } from "../../../managers/CatchMindGameManager";
import { emitCatchMindState } from "../catchMindEmitter";

type SendDrawingPayload = {
  roomId: string;
  stroke: DrawingStroke;
};

export function sendDrawing(io: Server, socket: Socket) {
  return (payload: SendDrawingPayload) => {
    try {
      const { roomId, stroke } = payload;

      catchMindGameManager.addStroke(roomId, socket.id, stroke);

      emitCatchMindState(io, roomId);
    } catch (error) {
      socket.emit("error", {
        message:
          error instanceof Error
            ? error.message
            : "그림 전송 중 오류가 발생했습니다.",
      });
    }
  };
}