import type { Server, Socket } from "socket.io";
import { EVENTS } from "../../shared/events";
import { sendChat } from "./handlers/sendChat";
import { submitHint } from "./handlers/submitHint";
import { vote } from "./handlers/vote";
import { reveal } from "./reveal";
import { submitReaction } from "./handlers/submitReaction";
import { togglePause } from "./handlers/togglePause";
import { getGameState } from "./handlers/getGameState";

export function registerLiarSocket(io: Server, socket: Socket) {
  socket.on(EVENTS.LIAR_SEND_CHAT, sendChat(io, socket));
  socket.on(EVENTS.LIAR_SUBMIT_DESCRIPTION, submitHint(io, socket));
  socket.on(EVENTS.LIAR_SUBMIT_VOTE, vote(io, socket));
  socket.on(EVENTS.LIAR_SUBMIT_GUESS, reveal(io, socket));
  socket.on(EVENTS.LIAR_SUBMIT_REACTION, submitReaction(io, socket));
  socket.on(EVENTS.LIAR_TOGGLE_PAUSE, togglePause(io, socket));
  socket.on(EVENTS.GET_GAME_STATE, getGameState(socket));
}