import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "./LoginPage.css";

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

    socket.once(EVENTS.JOIN_LOBBY_SUCCESS, () => {
      navigate("/lobby");
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Party Platform</h1>
        <span>닉네임을 입력하고 입장하세요.</span>

        <div className="login-form">
          <input
            type="text"
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEnter();
            }}
          />

          <button onClick={handleEnter}>입장하기</button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;