import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { registerLobbySocket } from "./socket/lobbySocket";
import { playerManager } from "./managers/PlayerManager";
import { EVENTS } from "./shared/events";
import { registerRoomSocket } from "./socket/roomSocket";
import { roomManager } from "./managers/RoomManager";

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
  console.log("user connected:", socket.id);

  registerLobbySocket(io, socket);
  registerRoomSocket(io, socket);

socket.on("disconnect", () => {
  const player = playerManager.getPlayer(socket.id);

  if (player?.roomId) {
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
  io.emit(EVENTS.ROOMS_UPDATED, roomManager.getAllRooms());

  console.log("user disconnected:", socket.id);
});
});

const PORT = 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`server running on http://0.0.0.0:${PORT}`);
});