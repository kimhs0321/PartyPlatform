import type { Server, Socket } from "socket.io";
import { EVENTS } from "../shared/events";
import { playerManager } from "../managers/PlayerManager";
import { roomManager } from "../managers/RoomManager";
import { gameManager } from "../managers/GameManager";
import { liarGameManager } from "../managers/LiarGameManager";

export function registerRoomSocket(io: Server, socket: Socket) {
  const emitRoomInfo = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const roomDto = roomManager.toRoomDto(room.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) return;

    room.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });
  };

  const emitLiarState = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    room.playerIds.forEach((playerId) => {
      const state = liarGameManager.toClientState(roomId, playerId);
      io.to(playerId).emit(EVENTS.LIAR_GAME_STATE, state);
    });
  };

  const endRoomGame = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const endedRoom = roomManager.endGame(roomId);
    if (!endedRoom) return;

    gameManager.endGame(roomId);
    liarGameManager.deleteGame(roomId);

    const roomDto = roomManager.toRoomDto(endedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) return;

    endedRoom.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.GAME_ENDED, roomDto);
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());
  };

  const scheduleDescriptionPhase = (roomId: string) => {
    setTimeout(() => {
      try {
        liarGameManager.startDescriptionPhase(roomId);
        emitLiarState(roomId);
      } catch {
        // 상태가 이미 바뀐 경우 무시
      }
    }, 5000);
  };

  const scheduleDiscussionPhase = (roomId: string) => {
    setTimeout(() => {
      try {
        liarGameManager.startDiscussionPhase(roomId);
        emitLiarState(roomId);

        const game = liarGameManager.getGame(roomId);
        const discussionTime = game?.settings.discussionTime ?? 120;

        scheduleVotingPhase(roomId, discussionTime);
      } catch {
        // 상태가 이미 바뀐 경우 무시
      }
    }, 5000);
  };

  const scheduleVotingPhase = (roomId: string, delaySeconds: number) => {
    setTimeout(() => {
      try {
        liarGameManager.startVotingPhase(roomId);
        emitLiarState(roomId);
      } catch {
        // 상태가 이미 바뀐 경우 무시
      }
    }, delaySeconds * 1000);
  };

  const scheduleRevotePhase = (roomId: string) => {
    const game = liarGameManager.getGame(roomId);
    const tieSpeechTime = game?.settings.tieSpeechTime ?? 20;

    setTimeout(() => {
      try {
        liarGameManager.startRevotePhase(roomId);
        emitLiarState(roomId);
      } catch {
        // 상태가 이미 바뀐 경우 무시
      }
    }, tieSpeechTime * 1000);
  };

  const scheduleNextRoundOrEnd = (roomId: string) => {
    setTimeout(() => {
      try {
        liarGameManager.nextRound(roomId);
        emitLiarState(roomId);

        const game = liarGameManager.getGame(roomId);

        if (game?.phase === "READY_CHECK") {
          scheduleDescriptionPhase(roomId);
          return;
        }

        if (game?.phase === "GAME_END") {

            emitLiarState(roomId);

            setTimeout(()=>{
                endRoomGame(roomId);
            },5000);

            return;
        }
      } catch {
        // 상태 변경 실패 무시
      }
    }, 5000);
  };

  const handleAfterVoteResolved = (roomId: string) => {
    const game = liarGameManager.getGame(roomId);
    if (!game) return;

    if (game.phase === "TIE_SPEECH") {
      emitLiarState(roomId);
      scheduleRevotePhase(roomId);
      return;
    }

    if (game.phase === "LIAR_GUESS") {
      emitLiarState(roomId);
      return;
    }

    if (game.phase === "RESULT") {
      emitLiarState(roomId);
      scheduleNextRoundOrEnd(roomId);
    }
  };

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
    if (!player) return;

    const room = roomManager.joinRoom(roomId, player.id);
    if (!room) return;

    playerManager.setPlayerRoom(socket.id, room.id);

    socket.emit(EVENTS.JOIN_ROOM_SUCCESS, room);
    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    emitRoomInfo(room.id);

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
    if (!player?.roomId) return;

    const updatedRoom = roomManager.toggleReady(player.roomId, player.id);
    if (!updatedRoom) return;

    emitRoomInfo(updatedRoom.id);
    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());
  });

  socket.on(EVENTS.START_GAME, () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const canStart = roomManager.canStartGame(player.roomId, player.id);

    if (!canStart) {
      socket.emit(EVENTS.START_GAME_FAILED, "게임을 시작할 수 없습니다.");
      return;
    }

    const startedRoom = roomManager.startGame(player.roomId);
    if (!startedRoom) return;

    gameManager.startGame(startedRoom);

    if (startedRoom.game === "라이어 게임") {
      const players = startedRoom.playerIds
        .map((playerId) => playerManager.getPlayer(playerId))
        .filter((player): player is { id: string; nickname: string } =>
          Boolean(player)
        )
        .map((player) => ({
          id: player.id,
          name: player.nickname,
        }));

      liarGameManager.createGame(startedRoom.id, players, {
        liarCount: 1,
        roundCount: 5,
        descriptionTime: 20,
        discussionTime: 120,
        voteTime: 30,
        tieSpeechTime: 20,
        minDescriptionLength: 2,
        maxDescriptionLength: 30,
      });

      liarGameManager.startRound(startedRoom.id);
      emitLiarState(startedRoom.id);
      scheduleDescriptionPhase(startedRoom.id);
    }

    const roomDto = roomManager.toRoomDto(startedRoom.id, (playerId) =>
      playerManager.getPlayer(playerId)
    );

    if (!roomDto) return;

    startedRoom.playerIds.forEach((playerId) => {
      io.to(playerId).emit(EVENTS.GAME_STARTED, roomDto);
      io.to(playerId).emit(EVENTS.ROOM_INFO, roomDto);
    });

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    console.log(`${startedRoom.title} 게임 시작`);
  });

  socket.on(
    EVENTS.LIAR_SUBMIT_DESCRIPTION,
    (data: { roomId: string; text: string }) => {
      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      try {
        liarGameManager.submitDescription(data.roomId, player.id, data.text);
        emitLiarState(data.roomId);

        const game = liarGameManager.getGame(data.roomId);

        if (game?.phase === "REACTION") {
          scheduleDiscussionPhase(data.roomId);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "설명 제출 중 오류가 발생했습니다.";

        socket.emit(EVENTS.START_GAME_FAILED, message);
      }
    }
  );

  socket.on(
    EVENTS.LIAR_SEND_CHAT,
    (data: { roomId: string; text: string }) => {
      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      try {
        liarGameManager.sendChat(data.roomId, player.id, data.text);
        emitLiarState(data.roomId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "채팅 전송 중 오류가 발생했습니다.";

        socket.emit(EVENTS.START_GAME_FAILED, message);
      }
    }
  );

  socket.on(
    EVENTS.LIAR_SUBMIT_VOTE,
    (data: { roomId: string; targetId: string }) => {
      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      try {
        liarGameManager.submitVote(data.roomId, player.id, data.targetId);
        emitLiarState(data.roomId);
        handleAfterVoteResolved(data.roomId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "투표 중 오류가 발생했습니다.";

        socket.emit(EVENTS.START_GAME_FAILED, message);
      }
    }
  );

  socket.on(
    EVENTS.LIAR_SUBMIT_GUESS,
    (data: { roomId: string; guess: string }) => {
      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      try {
        liarGameManager.submitLiarGuess(data.roomId, player.id, data.guess);
        emitLiarState(data.roomId);
        scheduleNextRoundOrEnd(data.roomId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "제시어 추측 중 오류가 발생했습니다.";

        socket.emit(EVENTS.START_GAME_FAILED, message);
      }
    }
  );

  socket.on(
    EVENTS.LIAR_SUBMIT_REACTION,
    (
      data: {
        roomId: string;
        targetPlayerId: string;
        reaction: "LIKE" | "DISLIKE";
      }
    ) => {
      const player = playerManager.getPlayer(socket.id);
      if (!player) return;

      try {
        liarGameManager.submitReaction(
          data.roomId,
          player.id,
          data.targetPlayerId,
          data.reaction
        );

        const room = roomManager.getRoom(data.roomId);
        if (!room) return;

        room.playerIds.forEach((playerId) => {
          const state = liarGameManager.toClientState(
            data.roomId,
            playerId
          );

          io.to(playerId).emit(EVENTS.LIAR_GAME_STATE, state);
        });
      } catch (error) {
        socket.emit(
          EVENTS.START_GAME_FAILED,
          error instanceof Error
            ? error.message
            : "설명 평가에 실패했습니다."
        );
      }
    }
  );  

  socket.on(EVENTS.GET_GAME_STATE, (roomId: string) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      const state = liarGameManager.toClientState(roomId, player.id);
      socket.emit(EVENTS.LIAR_GAME_STATE, state);
    } catch {
      // 아직 라이어게임 상태가 없으면 무시
    }
  });

  socket.on(EVENTS.END_GAME, () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const room = roomManager.getRoom(player.roomId);
    if (!room || room.hostId !== player.id) return;

    endRoomGame(player.roomId);

    console.log(`${room.title} 게임 종료`);
  });

  socket.on(EVENTS.LEAVE_ROOM, () => {
    const player = playerManager.getPlayer(socket.id);
    if (!player?.roomId) return;

    const roomId = player.roomId;
    const updatedRoom = roomManager.leaveRoom(roomId, player.id);

    playerManager.setPlayerRoom(socket.id, "");

    if (updatedRoom) {
      emitRoomInfo(updatedRoom.id);
    }

    io.emit(EVENTS.ROOMS, roomManager.getAllRooms());

    socket.emit(EVENTS.LEAVE_ROOM);
  });
}