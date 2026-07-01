import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "./RoomPage.css";
import LiarRoom from "../rooms/LiarRoom";


type RoomPlayerDto = {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
};

type LiarSettings = {
  liarCount: number;
  roundCount: number;
  descriptionTime: number;
  descriptionCycleCount: number;
  discussionTime: number;
  voteTime: number;
  tieSpeechTime: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
};

type RoomDto = {
  id: string;
  title: string;
  hostId: string;
  maxPlayers: number;
  game: string;
  players: RoomPlayerDto[];
  status: "waiting" | "playing" | "paused";
  gameSettings: {liar: LiarSettings;};
};

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDto | null>(null);
  const handleStartGame = () => {
    if (!roomId) return;
    socket.emit(EVENTS.START_GAME, { roomId });};



useEffect(() => {
  if (!socket.connected) {
    socket.connect();
  }

  const fallbackRoom = location.state?.room;

  if (fallbackRoom && !room) {
    setRoom({
      id: fallbackRoom.id,
      title: fallbackRoom.name,
      hostId: "",
      maxPlayers: fallbackRoom.maxPlayers,
      game: fallbackRoom.game,
      players: [],
      status: "waiting",
      gameSettings: {
        liar: {
          liarCount: 1,
          roundCount: 5,
          descriptionTime: 45,
          descriptionCycleCount: 2,
          discussionTime: 120,
          voteTime: 30,
          tieSpeechTime: 20,
          minDescriptionLength: 2,
          maxDescriptionLength: 30,
        },
      },
    });
  }

  const handleRoomInfo = (roomInfo: RoomDto) => {
    setRoom(roomInfo);
  };

  const handleGameStarted = (roomInfo: RoomDto) => {
    navigate(`/game/${roomInfo.id}`, {
      state: { room: roomInfo },
    });
  };

  const handleStartGameFailed = (message: string) => {
    alert(message);
  };


  socket.on(EVENTS.ROOM_INFO, handleRoomInfo);
  socket.on(EVENTS.GAME_STARTED, handleGameStarted);
  socket.on(EVENTS.START_GAME_FAILED, handleStartGameFailed);


  if (roomId) {
    socket.emit(EVENTS.GET_ROOM, roomId);
  }

  return () => {
    socket.off(EVENTS.ROOM_INFO, handleRoomInfo);
    socket.off(EVENTS.GAME_STARTED, handleGameStarted);
    socket.off(EVENTS.START_GAME_FAILED, handleStartGameFailed);

  };
 }, [roomId, location.state, navigate, room]);
  const handleToggleReady = () => {
    socket.emit(EVENTS.TOGGLE_READY);
  };

  

  const handleLeaveRoom = () => {
    socket.once(EVENTS.LEAVE_ROOM, () => {
      navigate("/lobby");
    });

    socket.emit(EVENTS.LEAVE_ROOM);
  };

  if (!room) {
    return (
      <div className="room-page">
        <div className="room-shell">
          <div className="room-loading">방 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }


  
  const readyCount = room.players.filter((player) => player.isReady).length;
  const me = room.players.find((player) => player.id === socket.id);
  const isHost = Boolean(me?.isHost);

  const handleUpdateLiarSetting = (
    key: keyof LiarSettings,
    value: number
  ) => {
    if (!room || !isHost) return;

    socket.emit(EVENTS.LIAR_UPDATE_SETTINGS, {
      [key]: value,
    });
  };  
  
  const nonHostPlayers = room.players.filter((player) => !player.isHost);
  const allPlayersReady =
    nonHostPlayers.length > 0 &&
    nonHostPlayers.every((player) => player.isReady);

  const canStartGame = isHost && allPlayersReady;
  

  return (
    <div className="room-page">
      <div className="room-shell">
        <header className="room-top">
          <div>
            <p className="room-label">대기실</p>
            <h1>{room.title}</h1>
            <span>
              {room.game} · {room.players.length} / {room.maxPlayers}명
            </span>
          </div>

          <button className="room-exit-button" onClick={handleLeaveRoom}>
            나가기
          </button>
        </header>

        <main className="room-main">
          {room.game === "라이어 게임" && (
            <LiarRoom
              settings={room.gameSettings.liar}
              playersCount={room.players.length}
              isHost={isHost}
              onUpdateSetting={handleUpdateLiarSetting}
            />
          )}

          <section className="room-info-panel">
            <h2>게임 정보</h2>

            <div className="info-card">
              <span>선택된 게임</span>
              <strong>{room.game}</strong>
            </div>

            <div className="info-card">
              <span>준비 상태</span>
              <strong>
                {readyCount} / {room.players.length}명
              </strong>
            </div>

            <div className="info-card">
              <span>방 상태</span>
              <strong>
                {room.status === "waiting"
                  ? "대기 중"
                  : room.status === "playing"
                  ? "게임 중"
                  : "일시정지"}
              </strong>
            </div>
          </section>

          <section className="player-panel">
            <div className="panel-header">
              <h2>참가자</h2>
              <span>{room.players.length}명 접속</span>
            </div>

            <div className="player-list">
              {room.players.map((player) => (
                <div className="player-row" key={player.id}>
                  <div className="player-avatar">
                    {player.nickname[0] ?? "?"}
                  </div>

                  <div className="player-info">
                    <strong>
                      {player.isHost && "👑 "}
                      {player.nickname}
                    </strong>
                    <span className={player.isReady ? "ready" : "waiting"}>
                      {player.isHost ? "방장" : player.isReady ? "준비 완료" : "대기 중"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="room-actions">
          {!isHost && (
            <button className="ready-button" onClick={handleToggleReady}>
              {me?.isReady ? "준비 취소" : "준비"}
            </button>
          )}

          {isHost && (
            <button
              className="start-button"
              disabled={!canStartGame}
              onClick={handleStartGame}
              title={!canStartGame ? "모든 참가자가 준비해야 시작할 수 있습니다." : ""}
            >
              게임 시작
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}