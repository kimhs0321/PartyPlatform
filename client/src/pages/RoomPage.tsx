import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "../App.css";
import { useNavigate, useParams } from "react-router-dom";

type RoomPlayer = {
  id: string;
  nickname: string;
  isHost: boolean;
};

type Room = {
  id: string;
  title: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: "waiting" | "playing" | "paused";
};

type ChatMessage = {
  id: string;
  roomId: string;
  playerId: string;
  nickname: string;
  text: string;
  createdAt: number;
};

function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;

    socket.emit(EVENTS.GET_ROOM, roomId);

    socket.on(EVENTS.ROOM_INFO, (roomData: Room) => {
      setRoom(roomData);
    });

    socket.on(EVENTS.ROOM_MESSAGES, (list: ChatMessage[]) => {
      setChatMessages(list);
    });

    socket.on(EVENTS.LEAVE_ROOM, () => {
      navigate("/lobby");
    });

    return () => {
      socket.off(EVENTS.ROOM_INFO);
      socket.off(EVENTS.ROOM_MESSAGES);
      socket.off(EVENTS.LEAVE_ROOM);
    };
  }, [roomId, navigate]);

  const handleSendMessage = () => {
    const trimmed = message.trim();

    if (!trimmed) return;

    socket.emit(EVENTS.SEND_ROOM_MESSAGE, trimmed);
    setMessage("");
  };

  return (
    <div className="container">
      <div className="login-card">
        <h1>{room?.title ?? "방 정보 불러오는 중..."}</h1>

        <p>방 번호 : {roomId}</p>

        <p>
          인원 : {room?.players.length ?? 0}/{room?.maxPlayers ?? 0}
        </p>

        <h2>참가자</h2>
        {room ? (
          <ul>
            {room.players.map((player) => (
              <li key={player.id}>
                {player.isHost ? "👑 " : "😀 "}
                {player.nickname}
              </li>
            ))}
          </ul>
        ) : (
          <p>참가자 정보를 불러오는 중...</p>
        )}

        <h2>채팅</h2>

        <div
          style={{
            border: "1px solid #ccc",
            height: "220px",
            marginBottom: "12px",
            padding: "10px",
            overflowY: "auto",
            textAlign: "left",
            borderRadius: "8px",
            background: "#fafafa",
          }}
        >
          {chatMessages.length === 0 ? (
            <p style={{ color: "#888" }}>아직 채팅이 없습니다.</p>
          ) : (
            chatMessages.map((msg) => (
              <p key={msg.id}>
                <strong>{msg.nickname}</strong> : {msg.text}
              </p>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <input
            style={{ flex: 1 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="메시지를 입력하세요."
          />

          <button onClick={handleSendMessage}>전송</button>
        </div>

        <button>게임 시작</button>
        <button
          onClick={() => {
            socket.emit(EVENTS.LEAVE_ROOM);
          }}
        >
          나가기
        </button>
      </div>
    </div>
  );
}

export default RoomPage;