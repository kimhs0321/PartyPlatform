import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { registerLobbySocket } from "./socket/lobbySocket";
import { playerManager } from "./managers/PlayerManager";
import { EVENTS } from "./shared/events";
import { registerRoomSocket } from "./socket/roomSocket";
import { roomManager } from "./managers/RoomManager";
import { registerGameSocket } from "./socket/gameSocket";
import { registerLiarSocket } from "./socket/liar/liarSocket";
import { liarGameManager } from "./managers/LiarGameManager";
import { emitLiarState } from "./socket/liar/liarEmitter";

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
  registerLiarSocket(io, socket);

socket.on("disconnect", (reason) => {
  console.log("disconnect reason:", socket.id, reason);

  const player = playerManager.getPlayer(socket.id);

  if (player?.roomId) {
  const room = roomManager.getRoom(player.roomId);

  if (room?.game === "라이어 게임" && room.status === "playing") {
    try {
      liarGameManager.markPlayerLeft(player.roomId, player.id);
      emitLiarState(io, player.roomId);
    } catch (error) {
      console.warn("라이어게임 상태 전송 생략:", error);
    }
  }
    const updatedRoom = roomManager.leaveRoom(player.roomId, player.id);

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