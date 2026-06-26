import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "../App.css";
import { useNavigate } from "react-router-dom";

type Player = {
  id: string;
  nickname: string;
};

type Room = {
  id: string;
  title: string;
  maxPlayers: number;
  playerIds: string[];
  status: "waiting" | "playing" | "paused";
};

function LobbyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on(EVENTS.LOBBY_PLAYERS, (list: Player[]) => {
      setPlayers(list);
    });

    socket.on(EVENTS.ROOMS_UPDATED, (list: Room[]) => {
      setRooms(list);
    });

    socket.on(EVENTS.CREATE_ROOM_SUCCESS, (room: Room) => {
      navigate(`/room/${room.id}`);
    });

    socket.on(EVENTS.JOIN_ROOM_SUCCESS, (room: Room) => {
      navigate(`/room/${room.id}`);
    });

    socket.emit(EVENTS.GET_LOBBY_PLAYERS);
    socket.emit(EVENTS.GET_ROOMS);

    return () => {
      socket.off(EVENTS.LOBBY_PLAYERS);
      socket.off(EVENTS.ROOMS_UPDATED);
      socket.off(EVENTS.CREATE_ROOM_SUCCESS);
      socket.off(EVENTS.JOIN_ROOM_SUCCESS);
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    const title = prompt("방 제목을 입력하세요.");


    if (!title || !title.trim()) {
      return;
    }

    socket.emit(EVENTS.CREATE_ROOM, {
      title: title.trim(),
      maxPlayers: 10,
      password: "",
    });
  };
  
    const handleJoinRoom = (roomId: string) => {
    socket.emit(EVENTS.JOIN_ROOM, roomId);
  };  


  return (
    <div className="container">
      <div className="login-card">
        <h1>로비</h1>

        <h2>현재 접속자</h2>
        <ul>
          {players.map((player) => (
            <li key={player.id}>{player.nickname}</li>
          ))}
        </ul>

        <h2>방 목록</h2>
        {rooms.length === 0 ? (
          <p>생성된 방이 없습니다.</p>
        ) : (
          <ul>
            {rooms.map((room) => (
              <li
                key={room.id}
                onClick={() => handleJoinRoom(room.id)}
                style={{ cursor: "pointer" }}
>
                {room.id} - {room.title} ({room.playerIds.length}/{room.maxPlayers})
            
              </li>
            ))}
          </ul>
        )}

        <button onClick={handleCreateRoom}>방 만들기</button>
      </div>
    </div>
  );
}

export default LobbyPage;