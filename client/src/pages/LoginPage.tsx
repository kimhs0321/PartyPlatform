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
      <main className="login-window">
        <header className="login-header">
          <div className="login-brand">온나라</div>
          <div className="login-title">Party Platform</div>
        </header>

        <section className="login-body">
          <div className="login-guide">
            <h1>입장 정보 입력</h1>
            <p>사용할 닉네임을 입력한 뒤 로비로 입장하세요.</p>
          </div>

          <div className="login-form">
            <label htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              type="text"
              placeholder="닉네임을 입력하세요."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEnter();
              }}
            />

            <div className="login-actions">
              <button onClick={handleEnter}>입장하기</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
