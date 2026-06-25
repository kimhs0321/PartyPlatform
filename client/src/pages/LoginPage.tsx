import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import "../App.css";
import { EVENTS } from "../shared/events";

function LoginPage() {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleEnter = () => {
    const trimmed = nickname.trim();

    if (!trimmed) {
      alert("닉네임을 입력하세요.");
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(EVENTS.JOIN_LOBBY, trimmed);

    socket.once(EVENTS.JOIN_LOBBY_SUCCESS, (data) => {
      console.log("입장 성공:", data);
      navigate("/lobby");
    });
  };

  return (
    <div className="container">
      <div className="login-card">
        <h1>PartyPlatform</h1>
        <h2>🎭 라이어 게임</h2>

        <input
          type="text"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleEnter();
            }
          }}
        />

        <button onClick={handleEnter}>입장하기</button>
      </div>
    </div>
  );
}

export default LoginPage;