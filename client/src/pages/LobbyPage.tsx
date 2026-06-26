import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "./LobbyPage.css";

type ServerRoom = {
  id: string;
  title: string;
  game: string;
  maxPlayers: number;
  playerIds: string[];
  status: "waiting" | "playing" | "paused";
};

export default function LobbyPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<ServerRoom[]>([]);
  const [roomName, setRoomName] = useState("");
  const [game, setGame] = useState("라이어 게임");
  const [maxPlayers, setMaxPlayers] = useState(8);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(EVENTS.GET_ROOMS);

    const handleRoomsUpdated = (updatedRooms: ServerRoom[]) => {
      setRooms(updatedRooms);
    };

    socket.on(EVENTS.ROOMS_UPDATED, handleRoomsUpdated);

    return () => {
      socket.off(EVENTS.ROOMS_UPDATED, handleRoomsUpdated);
    };
  }, []);

  const toRoomState = (room: ServerRoom) => ({
    id: room.id,
    name: room.title,
    game: room.game,
    players: room.playerIds.length,
    maxPlayers: room.maxPlayers,
  });

  const handleCreateRoom = () => {
    const title = roomName.trim();

    if (!title) {
      alert("방 이름을 입력하세요.");
      return;
    }

    socket.once(EVENTS.CREATE_ROOM_SUCCESS, (room: ServerRoom) => {
      setRoomName("");

      navigate(`/room/${room.id}`, {
        state: { room: toRoomState(room) },
      });
    });

    socket.emit(EVENTS.CREATE_ROOM, {
      title,
      game,
      maxPlayers,
    });
  };

  const handleJoinRoom = (roomId: string) => {
    socket.once(EVENTS.JOIN_ROOM_SUCCESS, (room: ServerRoom) => {
      navigate(`/room/${room.id}`, {
        state: { room: toRoomState(room) },
      });
    });

    socket.emit(EVENTS.JOIN_ROOM, roomId);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-shell">
        <header className="lobby-header">
          <div>
            <p className="lobby-subtitle">Party Platform</p>
            <h1>방 목록</h1>
          </div>
        </header>

        <section className="lobby-create-panel">
          <div className="create-title">
            <h2>방 만들기</h2>
            <p>게임을 선택하고 방을 생성하세요.</p>
          </div>

          <div className="create-form">
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateRoom();
              }}
              placeholder="방 이름"
            />

            <select value={game} onChange={(e) => setGame(e.target.value)}>
              <option>라이어 게임</option>
              <option>모노폴리</option>
              <option>OX 퀴즈</option>
              <option>마피아</option>
            </select>

            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              <option value={4}>4명</option>
              <option value={6}>6명</option>
              <option value={8}>8명</option>
              <option value={10}>10명</option>
            </select>

            <button onClick={handleCreateRoom}>방 만들기</button>
          </div>
        </section>

        <section className="room-list-panel">
          <div className="room-list-header">
            <h2>열린 방</h2>
            <span>{rooms.length}개</span>
          </div>

          <div className="room-list">
            {rooms.length === 0 ? (
              <div className="empty-room-list">열린 방이 없습니다.</div>
            ) : (
              rooms.map((room) => (
                <article className="room-card-item" key={room.id}>
                  <div className="room-main-info">
                    <strong>{room.title}</strong>
                    <span>{room.game}</span>
                  </div>

                  <div className="room-meta">
                    <span>
                      {room.playerIds.length} / {room.maxPlayers}명
                    </span>

                    <button onClick={() => handleJoinRoom(room.id)}>
                      참가
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}