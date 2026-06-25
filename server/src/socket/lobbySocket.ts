import type { Server, Socket } from "socket.io";
import { playerManager } from "../managers/PlayerManager";
import { EVENTS } from "../shared/events";

export function registerLobbySocket(io: Server, socket: Socket) {
  socket.on(EVENTS.JOIN_LOBBY, (nickname: string) => {
    const player = playerManager.addPlayer(socket.id, nickname);

    socket.emit(EVENTS.JOIN_LOBBY_SUCCESS, player);
    io.emit(EVENTS.LOBBY_PLAYERS, playerManager.getAllPlayers());

    console.log("현재 접속자:", playerManager.getAllPlayers());
  });

  socket.on(EVENTS.GET_LOBBY_PLAYERS, () => {
    console.log("접속자 목록 요청:", socket.id);
    socket.emit(EVENTS.LOBBY_PLAYERS, playerManager.getAllPlayers());
  });
}