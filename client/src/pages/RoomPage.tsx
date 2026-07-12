import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import "./RoomPage.css";
import LiarRoom from "../rooms/LiarRoom";
import RoomChat from "../rooms/RoomChat";
import CatchMindRoom from "../rooms/CatchMindRoom";
import RelayDrawingRoom from "../rooms/RelayDrawingRoom";

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

 type CatchMindSettings= {
  roundCount: number;
  wordSelectTime: number;
  drawingTime: number;
  roundResultTime: number;
  allowDrawerSkip: boolean;
};

type RelayDrawingSettings = {
  gameDuration: number;
  prepareTime: number;
  turnDuration: number;
  finalGuessTime: number;
  wordVisibility:
    | "ALL_DRAWERS"
    | "FIRST_DRAWER_ONLY";
};

type RoomDto = {
  id: string;
  title: string;
  hostId: string;
  maxPlayers: number;
  game: string;
  players: RoomPlayerDto[];
  status: "waiting" | "playing" | "paused";
  gameSettings: {
  liar: LiarSettings;
  catchMind: CatchMindSettings;
  relayDrawing: RelayDrawingSettings;
};
};

const statusText = {
  waiting: "대기 중",
  playing: "게임 중",
  paused: "일시정지",
} as const;

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDto | null>(null);

  const handleStartGame = () => {
    if (!roomId) return;
    socket.emit(EVENTS.START_GAME, { roomId });
  };

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const fallbackRoom = location.state?.room;

    if (fallbackRoom) {
      setRoom((prev) => {
        if (prev) return prev;

        return {
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
            catchMind: {
              roundCount: 3,
              wordSelectTime: 10,
              drawingTime: 90,
              roundResultTime: 5,
              allowDrawerSkip: true,
            },
            relayDrawing: {
              gameDuration: 300,
              prepareTime: 3,
              turnDuration: 12,
              finalGuessTime: 10,
              wordVisibility: "ALL_DRAWERS",
            },
          },
        };
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
  }, [roomId, location.state, navigate]);

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
          <div className="room-window">
            <header className="room-top">
              <div className="room-brand">온나라</div>
              <div className="room-title-block">
                <p className="room-label">게임 방</p>
                <h1>방 정보를 불러오는 중...</h1>
              </div>
            </header>
            <div className="room-loading">방 정보를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const readyCount = room.players.filter((player) => player.isReady).length;
  const me = room.players.find((player) => player.id === socket.id);
  const isHost = Boolean(me?.isHost);

  const handleUpdateLiarSetting = (key: keyof LiarSettings, value: number) => {
    if (!room || !isHost) return;

    socket.emit(EVENTS.LIAR_UPDATE_SETTINGS, {
      [key]: value,
    });
  };

  const handleUpdateCatchMindSetting = (
    key: keyof CatchMindSettings,
    value: number | boolean
  ) => {
    if (!room || !isHost) return;

    setRoom((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        gameSettings: {
          ...prev.gameSettings,
          catchMind: {
            ...prev.gameSettings.catchMind,
            [key]: value,
          },
        },
      };
    });

    socket.emit(EVENTS.CATCH_MIND_UPDATE_SETTINGS, {
      [key]: value,
    });
  };

  const handleUpdateRelayDrawingSetting = (
    key: keyof RelayDrawingSettings,
    value:
      | number
      | RelayDrawingSettings["wordVisibility"],
  ) => {
    if (!room || !isHost) return;

    setRoom((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        gameSettings: {
          ...prev.gameSettings,
          relayDrawing: {
            ...prev.gameSettings.relayDrawing,
            [key]: value,
          },
        },
      };
    });

    socket.emit(
      EVENTS.RELAY_DRAWING_UPDATE_SETTINGS,
      {
        [key]: value,
      },
    );
  };

  const nonHostPlayers = room.players.filter((player) => !player.isHost);
  const allPlayersReady =
    nonHostPlayers.length > 0 && nonHostPlayers.every((player) => player.isReady);

  const canStartGame = isHost && allPlayersReady;

  return (
    <div className="room-page">
      <div className="room-shell">
        <div className="room-window">
          <header className="room-top">
            <div className="room-top-main">
              <div className="room-brand">온나라</div>

              <div className="room-title-block">
                <p className="room-label">게임 방</p>
                <h1>{room.title}</h1>
              </div>
            </div>

            <div className="room-header-meta">
              <span>{room.game}</span>
              <span>{room.players.length} / {room.maxPlayers}명</span>
              <span className={`room-status-badge ${room.status}`}>
                {statusText[room.status]}
              </span>
              <button className="room-exit-button" onClick={handleLeaveRoom}>
                나가기
              </button>
            </div>
          </header>

          <main className="room-main">
            <section className="room-left-column">
              {room.game === "라이어 게임" && (
                <LiarRoom
                  settings={room.gameSettings.liar}
                  playersCount={room.players.length}
                  isHost={isHost}
                  onUpdateSetting={handleUpdateLiarSetting}
                />
              )}
    
              {room.game === "캐치마인드" && (
                <CatchMindRoom
                  settings={room.gameSettings.catchMind}
                  isHost={isHost}
                  onUpdateSetting={handleUpdateCatchMindSetting}
                />
              )}

              {room.game === "릴레이 드로잉" && (
                <RelayDrawingRoom
                  settings={
                    room.gameSettings.relayDrawing
                  }
                  isHost={isHost}
                  onUpdateSetting={
                    handleUpdateRelayDrawingSetting
                  }
                />
              )}

              <section className="room-info-panel">
                <div className="panel-header">
                  <h2>게임 정보</h2>
                  <span>현재 방 상태</span>
                </div>

                <div className="room-info-summary">
                  <div>
                    <span>게임</span>
                    <strong>{room.game}</strong>
                  </div>

                  <div>
                    <span>준비</span>
                    <strong>
                      {readyCount} / {room.players.length}명
                    </strong>
                  </div>

                  <div>
                    <span>상태</span>
                    <strong>{statusText[room.status]}</strong>
                  </div>
                </div>
              </section>

              <RoomChat roomId={room.id} />
            </section>

            <aside className="player-panel">
              <div className="panel-header">
                <h2>참가자</h2>
                <span>{room.players.length}명 접속</span>
              </div>

              <div className="player-table">
                <div className="player-table-head">
                  <span>이름</span>
                  <span>상태</span>
                </div>

                <div className="player-list">
                  {room.players.length === 0 ? (
                    <div className="player-empty">참가자를 불러오는 중입니다.</div>
                  ) : (
                    room.players.map((player) => (
                      <div className="player-row" key={player.id}>
                        <div className="player-name">
                          {player.isHost && <span className="host-mark">방장</span>}
                          <span>{player.nickname}</span>
                        </div>

                        <div
                          className={`player-state ${
                            player.isHost
                              ? "host"
                              : player.isReady
                              ? "ready"
                              : "waiting"
                          }`}
                        >
                          {player.isHost
                            ? "방장"
                            : player.isReady
                            ? "준비 완료"
                            : "대기"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
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
    </div>
  );
}
