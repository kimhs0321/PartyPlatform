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
  registerLobbySocket(io, socket);
  registerRoomSocket(io, socket);
  registerGameSocket(io, socket);

  getEnabledGameModules().forEach((gameModule) => {
    gameModule.registerSocket(io, socket);
  });

  socket.on("disconnect", async (reason) => {
    console.log("disconnect reason:", socket.id, reason);

    const player = playerManager.getPlayer(socket.id);

    if (player?.roomId) {
      const roomId = player.roomId;
      const room = roomManager.getRoom(roomId);

      if (room && room.status === "playing") {
        const gameModule = findGameModuleByName(room.game);

        if (gameModule?.enabled && gameModule.onDisconnect) {
          try {
            await gameModule.onDisconnect(io, roomId, player.id);
          } catch (error) {
            console.warn(`${room.game} disconnect 처리 생략:`, error);
          }
        }
      }

      const updatedRoom = roomManager.leaveRoom(roomId, player.id);

      if (updatedRoom) {
        const roomDto = roomManager.toRoomDto(updatedRoom.id, (playerId) =>
          playerManager.getPlayer(playerId)
        );

        if (roomDto) {
          updatedRoom.playerIds.forEach((playerId) => {
            io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
          });
        }
      }
    }

    playerManager.removePlayer(socket.id);

    io.emit(EVENTS.LOBBY_PLAYERS, playerManager.getAllPlayers());
    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    console.log("user disconnected:", socket.id);
  });
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`server running on http://0.0.0.0:${PORT}`);
});