import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { registerLobbySocket } from "./socket/lobbySocket";
import { playerManager } from "./managers/PlayerManager";
import { EVENTS } from "./shared/events";
import { registerRoomSocket } from "./socket/roomSocket";

const app = express();

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
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
    playerManager.removePlayer(socket.id);
    io.emit(EVENTS.LOBBY_PLAYERS, playerManager.getAllPlayers());

    console.log("user disconnected:", socket.id);
  });
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});