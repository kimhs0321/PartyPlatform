import type { Server, Socket } from "socket.io";
import { EVENTS } from "../shared/events";
import { playerManager } from "../managers/PlayerManager";
import { roomManager } from "../managers/RoomManager";
import { chatManager } from "../managers/ChatManager";

export function registerRoomSocket(io: Server, socket: Socket) {
  socket.on(
    EVENTS.CREATE_ROOM,
    (data: {
      title: string;
      game: string;
      maxPlayers: number;
      password?: string;
    }) => {
      const host = playerManager.getPlayer(socket.id);

      if (!host) return;

      const room = roomManager.createRoom(
        data.title,
        host,
        data.maxPlayers,
        data.password ?? "",
        data.game
      );

      playerManager.setPlayerRoom(socket.id, room.id);

      socket.emit(EVENTS.CREATE_ROOM_SUCCESS, room);
      io.emit(EVENTS.ROOMS_UPDATED, roomManager.getAllRooms());

      console.log("방 생성:", room);
    }
  );

  socket.on(EVENTS.GET_ROOMS, () => {
    socket.emit(EVENTS.ROOMS_UPDATED, roomManager.getAllRooms());
  });

  socket.on(EVENTS.JOIN_ROOM, (roomId: string) => {
    const player = playerManager.getPlayer(socket.id);

    if (!player) {
      return;
    }

    const room = roomManager.joinRoom(roomId, player.id);

    if (!room) {
      return;
    }

    playerManager.setPlayerRoom(socket.id, room.id);

    socket.emit(EVENTS.JOIN_ROOM_SUCCESS, room);

    io.emit(EVENTS.ROOMS_UPDATED, roomManager.getAllRooms());

    const roomDto = roomManager.toRoomDto(room.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (roomDto) {
      room.playerIds.forEach((playerId) => {
        io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
      });
    }

    console.log(`${player.nickname}님이 ${room.title} 방에 입장`);
  });

  socket.on(EVENTS.GET_ROOM, (roomId: string) => {
    const roomDto = roomManager.toRoomDto(roomId, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) return;

    socket.emit(EVENTS.ROOM_INFO, roomDto);
  });

  socket.on(EVENTS.SEND_ROOM_MESSAGE, (text: string) => {
    const player = playerManager.getPlayer(socket.id);

    if (!player || !player.roomId) {
      return;
    }

    const message = chatManager.addMessage(
      player.roomId,
      player.id,
      player.nickname,
      text
    );

    io.emit(
      EVENTS.ROOM_MESSAGES,
      chatManager.getMessages(player.roomId)
    );

    console.log(
      `[${player.roomId}] ${player.nickname}: ${message.text}`
    );
  });

  socket.on(EVENTS.LEAVE_ROOM, () => {
    const player = playerManager.getPlayer(socket.id);

    if (!player || !player.roomId) {
      return;
    }

    const updatedRoom = roomManager.leaveRoom(player.roomId, player.id);

    playerManager.setPlayerRoom(socket.id, "");

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

    io.emit(EVENTS.ROOMS_UPDATED, roomManager.getAllRooms());

    socket.emit(EVENTS.LEAVE_ROOM);
  });

}