import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { sendDrawing } from "./handlers/sendDrawing";
import { sendChat } from "./handlers/sendChat";
import { clearCanvas } from "./handlers/clearCanvas";
import { getGameState } from "./handlers/getGameState";
import { relayDrawingGameManager } from "../RelayDrawingGameManager";
import { emitRelayDrawingState } from "./relayDrawingEmitter";

export function registerRelayDrawingSocket(
  io: Server,
  socket: Socket,
) {
  socket.on(EVENTS.RELAY_DRAWING_DRAW,sendDrawing(io, socket),);
  socket.on(EVENTS.RELAY_DRAWING_SEND_CHAT,sendChat(io, socket),);
  socket.on(EVENTS.RELAY_DRAWING_CLEAR_CANVAS,clearCanvas(io, socket),);
  socket.on(EVENTS.GET_GAME_STATE,getGameState(socket),);
  socket.on(EVENTS.RELAY_DRAWING_UNDO,(data: { roomId: string }) => {
      try {relayDrawingGameManager.undoStroke(data.roomId,socket.id,);
        emitRelayDrawingState(io,data.roomId,);
      } catch (error) {console.error(error);}},);
  socket.on(EVENTS.GET_GAME_STATE,getGameState(socket),);
}