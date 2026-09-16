import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import { registerLobbySocket } from "./socket/lobbySocket";
import { registerRoomSocket } from "./socket/roomSocket";
import { registerGameSocket } from "./socket/gameSocket";

import { playerManager } from "./managers/PlayerManager";
import { roomManager } from "./managers/RoomManager";
import { EVENTS } from "./shared/events";

import {
  getEnabledGameModules,
  findGameModuleByName,
} from "./games/common/GameRegistry";

const RECONNECT_GRACE_MS = 15_000;

const disconnectTimers =
  new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

const app = express();

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("PartyPlatform server is running");
});

io.on("connection", (socket) => {
  const requestedPlayerId =
    typeof socket.handshake.auth
      ?.playerSessionId === "string"
      ? socket.handshake.auth
          .playerSessionId.trim()
      : "";

  const playerId =
    requestedPlayerId || socket.id;

  const previousSocketId =
    playerManager.getSocketId(playerId);

  playerManager.bindSocket(
    playerId,
    socket.id,
  );

  /*
   * 기존 서버는 io.to(playerId) 형태로
   * 개인 메시지를 보내므로 고정 playerId 이름의
   * Socket.IO room에 현재 socket을 참가시킨다.
   */
  socket.join(playerId);

  const pendingDisconnect =
    disconnectTimers.get(playerId);

  if (pendingDisconnect) {
    clearTimeout(pendingDisconnect);
    disconnectTimers.delete(playerId);

    console.log(
      "player reconnected:",
      playerId,
      socket.id,
    );
  }

  /*
   * 같은 플레이어의 이전 socket이 아직 살아 있다면
   * 새 연결만 남긴다.
   */
  if (
    previousSocketId &&
    previousSocketId !== socket.id
  ) {
    io.sockets.sockets
      .get(previousSocketId)
      ?.disconnect(true);
  }

  registerLobbySocket(io, socket);
  registerRoomSocket(io, socket);
  registerGameSocket(io, socket);

  getEnabledGameModules().forEach((gameModule) => {
    gameModule.registerSocket(io, socket);
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "disconnect reason:",
      socket.id,
      reason,
    );

    const player =
      playerManager.getPlayer(socket.id);

    const playerId =
      player?.id ??
      playerManager.getPlayerId(socket.id);

    playerManager.unbindSocket(socket.id);

    /*
    * 이미 새 socket으로 같은 playerId가
    * 재연결된 경우에는 아무것도 제거하지 않는다.
    */
    if (
      !playerId ||
      playerManager.isConnected(playerId)
    ) {
      return;
    }

    const existingTimer =
      disconnectTimers.get(playerId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(
      async () => {
        disconnectTimers.delete(playerId);

        /*
        * 유예시간 안에 다시 접속했으면
        * 기존 방/게임 상태를 그대로 유지한다.
        */
        if (
          playerManager.isConnected(playerId)
        ) {
          return;
        }

        const currentPlayer =
          playerManager.getPlayer(playerId);

        if (!currentPlayer) {
          return;
        }

        if (currentPlayer.roomId) {
          const roomId =
            currentPlayer.roomId;

          const room =
            roomManager.getRoom(roomId);

          if (
            room &&
            room.status === "playing"
          ) {
            const gameModule =
              findGameModuleByName(
                room.game,
              );

            if (
              gameModule?.enabled &&
              gameModule.onDisconnect
            ) {
              try {
                await gameModule.onDisconnect(
                  io,
                  roomId,
                  currentPlayer.id,
                );
              } catch (error) {
                console.warn(
                  `${room.game} disconnect 처리 생략:`,
                  error,
                );
              }
            }
          }

          const updatedRoom =
            roomManager.leaveRoom(
              roomId,
              currentPlayer.id,
            );

          if (updatedRoom) {
            const roomDto =
              roomManager.toRoomDto(
                updatedRoom.id,
                (roomPlayerId) =>
                  playerManager.getPlayer(
                    roomPlayerId,
                  ),
              );

            if (roomDto) {
              updatedRoom.playerIds.forEach(
                (roomPlayerId) => {
                  io.to(roomPlayerId).emit(
                    EVENTS.ROOM_INFO,
                    roomDto,
                  );
                },
              );
            }
          }
        }

        playerManager.removePlayer(
          currentPlayer.id,
        );

        io.emit(
          EVENTS.LOBBY_PLAYERS,
          playerManager.getAllPlayers(),
        );

        io.emit(
          EVENTS.ROOMS,
          roomManager.getAllRooms(),
        );

        console.log(
          "player disconnected permanently:",
          currentPlayer.id,
        );
      },
      RECONNECT_GRACE_MS,
    );

    disconnectTimers.set(
      playerId,
      timer,
    );

    console.log(
      `reconnect grace started: ${playerId} (${RECONNECT_GRACE_MS}ms)`,
    );
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`server running on http://0.0.0.0:${PORT}`);
});