import type { Server, Socket } from "socket.io";
import { EVENTS } from "../shared/events";
import { createRoom } from "./handlers/room/createRoom";
import { joinRoom } from "./handlers/room/joinRoom";
import { getRoom } from "./handlers/room/getRoom";
import { toggleReady } from "./handlers/room/toggleReady";
import { leaveRoom } from "./handlers/room/leaveRoom";
import { startGame } from "./handlers/room/startGame";
import { endGame } from "./handlers/room/endGame";
import { getRooms } from "./handlers/room/getRooms";
import { updateLiarSettings } from "./handlers/room/updateLiarSettings";
import { updateCatchMindSettings } from "./handlers/room/updateCatchMindSettings";
import { registerRoomChat } from "./room/roomChat";

export function registerRoomSocket(io: Server, socket: Socket) {
  socket.on(EVENTS.CREATE_ROOM, createRoom(io, socket));
  socket.on(EVENTS.GET_ROOM, getRoom(socket));
  socket.on(EVENTS.GET_ROOMS, getRooms(io, socket));
  socket.on(EVENTS.JOIN_ROOM, joinRoom(io, socket));
  socket.on(EVENTS.TOGGLE_READY, toggleReady(io, socket));
  socket.on(EVENTS.START_GAME, startGame(io, socket));
  socket.on(EVENTS.END_GAME, endGame(io, socket));
  socket.on(EVENTS.LEAVE_ROOM, leaveRoom(io, socket));
  socket.on(EVENTS.LIAR_UPDATE_SETTINGS, updateLiarSettings(io, socket));
  socket.on(
    EVENTS.CATCH_MIND_UPDATE_SETTINGS,
    updateCatchMindSettings(io, socket)
  );

  registerRoomChat(io, socket);
}