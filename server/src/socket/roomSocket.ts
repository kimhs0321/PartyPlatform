import type { Server, Socket } from "socket.io";
import { EVENTS } from "../shared/events";
import { playerManager } from "../managers/PlayerManager";
import { roomManager } from "../managers/RoomManager";
import { gameManager } from "../managers/GameManager";

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
      io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

      console.log("방 생성:", room);
    }
  );

  socket.on(EVENTS.GET_ROOMS, () => {
    socket.emit(EVENTS.ROOMS, roomManager.getAllRooms());
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

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

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

  socket.on(EVENTS.TOGGLE_READY, () => {
    const player = playerManager.getPlayer(socket.id);

    if (!player || !player.roomId) {
      return;
    }

    const updatedRoom = roomManager.toggleReady(player.roomId, player.id);

    if (!updatedRoom) {
      return;
    }

    const roomDto = roomManager.toRoomDto(updatedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (roomDto) {
      updatedRoom.playerIds.forEach((playerId) => {
        io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
      });
    }

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());
  });

  socket.on(EVENTS.START_GAME, () => {
    const player = playerManager.getPlayer(socket.id);

    if (!player || !player.roomId) {
      return;
    }

    const canStart = roomManager.canStartGame(player.roomId, player.id);

    if (!canStart) {
      socket.emit(EVENTS.START_GAME_FAILED, "게임을 시작할 수 없습니다.");
      return;
    }

    const startedRoom = roomManager.startGame(player.roomId);

    if (!startedRoom) {
      return;
    }

    gameManager.startGame(startedRoom);

    const roomDto = roomManager.toRoomDto(startedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) {
      return;
    }

    startedRoom.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.GAME_STARTED, roomDto);
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    console.log(`${startedRoom.title} 게임 시작`);
  });

  socket.on(EVENTS.END_GAME, () => {
    const player = playerManager.getPlayer(socket.id);

    if (!player || !player.roomId) {
      return;
    }

    const room = roomManager.getRoom(player.roomId);

    if (!room || room.hostId !== player.id) {
      return;
    }

    const endedRoom = roomManager.endGame(player.roomId);

    if (!endedRoom) {
      return;
    }

    gameManager.endGame(player.roomId);

    const roomDto = roomManager.toRoomDto(endedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) {
      return;
    }

    endedRoom.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.GAME_ENDED, roomDto);
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    console.log(`${endedRoom.title} 게임 종료`);
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

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    socket.emit(EVENTS.LEAVE_ROOM);
  });

}