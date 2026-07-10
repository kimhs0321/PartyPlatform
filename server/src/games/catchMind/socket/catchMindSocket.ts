import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { selectWord } from "./handlers/selectWord";
import { sendDrawing } from "./handlers/sendDrawing";
import { sendChat } from "./handlers/sendChat";
import { clearCanvas } from "./handlers/clearCanvas";
import { getGameState } from "./handlers/getGameState";
import { catchMindGameManager } from "../CatchMindGameManager";
import { emitCatchMindState } from "./catchMindEmitter";
import { skipQuestion } from "./handlers/skipQuestion";


export function registerCatchMindSocket(io: Server, socket: Socket) {
  socket.on(EVENTS.CATCH_MIND_SELECT_WORD, selectWord(io, socket));
  socket.on(EVENTS.CATCH_MIND_DRAW, sendDrawing(io, socket));
  socket.on(EVENTS.CATCH_MIND_SEND_CHAT, sendChat(io, socket));
  socket.on(EVENTS.CATCH_MIND_CLEAR_CANVAS, clearCanvas(io, socket));
  socket.on(EVENTS.CATCH_MIND_SKIP, skipQuestion(io, socket));
  socket.on(EVENTS.GET_GAME_STATE, getGameState(socket));
  socket.on(EVENTS.CATCH_MIND_UNDO, (data) => {
    try {
      catchMindGameManager.undoStroke(data.roomId, socket.id);
      emitCatchMindState(io, data.roomId);
    } catch (error) {
      console.error(error);
    }
  });
}