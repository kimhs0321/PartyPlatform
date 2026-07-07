import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../shared/events";

import { selectWord } from "./handlers/selectWord";
import { sendChat } from "./handlers/sendChat";
import { sendDrawing } from "./handlers/sendDrawing";
import { clearCanvas } from "./handlers/clearCanvas";
import { getGameState } from "./handlers/getGameState";
import { togglePause } from "./handlers/togglePause";

export function registerCatchMindSocket(io: Server, socket: Socket) {
  socket.on(EVENTS.CATCH_MIND_SELECT_WORD, selectWord(io, socket));
  socket.on(EVENTS.CATCH_MIND_SEND_CHAT, sendChat(io, socket));
  socket.on(EVENTS.CATCH_MIND_DRAW, sendDrawing(io, socket));
  socket.on(EVENTS.CATCH_MIND_CLEAR_CANVAS, clearCanvas(io, socket));
  socket.on(EVENTS.CATCH_MIND_TOGGLE_PAUSE, togglePause(io, socket));
  socket.on(EVENTS.GET_GAME_STATE, getGameState(socket));
}