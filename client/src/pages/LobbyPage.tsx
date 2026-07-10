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

    socket.on(EVENTS.ROOMS, handleRoomsUpdated);

    return () => {
      socket.off(EVENTS.ROOMS, handleRoomsUpdated);
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

  const getStatusLabel = (status: ServerRoom["status"]) => {
    if (status === "waiting") return "대기중";
    if (status === "playing") return "게임중";
    return "일시정지";
  };

  return (
    <div className="lobby-page">
      <div className="lobby-shell">
        <section className="onnara-window">
          <header className="lobby-header">
            <h1>온나라</h1>
            <span>게임 로비</span>
          </header>

          <div className="lobby-create-row" aria-label="방 생성">
            <label className="field field-title">
              <span>방 이름</span>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateRoom();
                }}
                placeholder="방 이름 입력"
              />
            </label>

            <label className="field">
              <span>게임</span>
              <select value={game} onChange={(e) => setGame(e.target.value)}>
                <option>라이어 게임</option>
                <option>캐치마인드</option>
              </select>
            </label>

            <label className="field">
              <span>인원</span>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              >
                <option value={4}>4명</option>
                <option value={6}>6명</option>
                <option value={8}>8명</option>
                <option value={10}>10명</option>
              </select>
            </label>

            <button className="create-button" onClick={handleCreateRoom}>
              방 생성
            </button>
          </div>

          <section className="room-list-panel">
            <div className="room-list-header">
              <h2>열린 방</h2>
              <span>총 {rooms.length}건</span>
            </div>

            <div className="room-table" role="table" aria-label="열린 방 목록">
              <div className="room-table-head" role="row">
                <span>방 이름</span>
                <span>게임</span>
                <span>상태</span>
                <span>인원</span>
                <span>입장</span>
              </div>

              {rooms.length === 0 ? (
                <div className="empty-room-list">열린 방이 없습니다.</div>
              ) : (
                rooms.map((room) => (
                  <article className="room-card-item" key={room.id} role="row">
                    <strong>{room.title}</strong>
                    <span>{room.game}</span>
                    <span className={`room-status ${room.status}`}>
                      {getStatusLabel(room.status)}
                    </span>
                    <span>
                      {room.playerIds.length} / {room.maxPlayers}명
                    </span>
                    <button onClick={() => handleJoinRoom(room.id)}>참가</button>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
