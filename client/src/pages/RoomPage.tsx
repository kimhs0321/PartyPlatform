import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "./RoomPage.css";

type RoomPlayerDto = {
  id: string;
  nickname: string;
  isHost: boolean;
};

type RoomDto = {
  id: string;
  title: string;
  hostId: string;
  maxPlayers: number;
  game: string;
  players: RoomPlayerDto[];
  status: "waiting" | "playing" | "paused";
};

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [room, setRoom] = useState<RoomDto | null>(null);

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
      });
    }

    const handleRoomInfo = (roomInfo: RoomDto) => {
      setRoom(roomInfo);
    };

    socket.on(EVENTS.ROOM_INFO, handleRoomInfo);

    if (roomId) {
      socket.emit(EVENTS.GET_ROOM, roomId);
    }

    return () => {
      socket.off(EVENTS.ROOM_INFO, handleRoomInfo);
    };
  }, [roomId, location.state, room]);

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

  const readyCount = room.players.length;

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
                    <span className="waiting">
                      {player.isHost ? "방장" : "참가자"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="room-actions">
          <button className="ready-button">준비</button>
          <button className="start-button">게임 시작</button>
        </footer>
      </div>
    </div>
  );
}