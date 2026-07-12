import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import LiarGame from "../games/LiarGame";
import UnknownGame from "../games/UnknownGame";
import "./GamePage.css";
import type { ClientLiarGameState } from "../../../server/src/games/liar/types/liarGame";
import CatchMindGame from "../games/CatchMindGame.tsx";
import type { ClientCatchMindGameState } from "../../../server/src/games/catchMind/types/catchMindGame";
import RelayDrawingGame from "../games/RelayDrawingGame.tsx";
import type {
  ClientRelayDrawingGameState,
} from "../../../server/src/shared/types/relayDrawing";


type RoomPlayerDto = {
  id: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
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

export default function GamePage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [liarGameState, setLiarGameState] = useState<ClientLiarGameState | null>(null);
  const [catchMindGameState, setCatchMindGameState] = useState<ClientCatchMindGameState | null>(null);
  const [room, setRoom] = useState<RoomDto | null>(
    location.state?.room ?? null );
  const [relayDrawingGameState,setRelayDrawingGameState,] = useState<ClientRelayDrawingGameState | null>(null);  
  
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleRoomInfo = (roomInfo: RoomDto) => {
      setRoom(roomInfo);
    };

    const handleGameEnded = (roomInfo: RoomDto) => {
      navigate(`/room/${roomInfo.id}`, {
        state: { room: roomInfo },
      });
    };

    socket.on(EVENTS.ROOM_INFO, handleRoomInfo);
    socket.on(EVENTS.GAME_ENDED, handleGameEnded);

    if (roomId) {
      socket.emit(EVENTS.GET_ROOM, roomId);
      socket.emit(EVENTS.GET_GAME_STATE, roomId);
    }
    const handleLiarGameState = (state: any) => {
      setLiarGameState(state);
    };

    socket.on(EVENTS.LIAR_GAME_STATE, handleLiarGameState);

    const handleCatchMindGameState = (state: ClientCatchMindGameState) => {
      setCatchMindGameState(state);
    };

    socket.on(EVENTS.CATCH_MIND_STATE, handleCatchMindGameState);

    const handleRelayDrawingState = (state: ClientRelayDrawingGameState,) => {setRelayDrawingGameState(state);};
    socket.on(EVENTS.RELAY_DRAWING_STATE,handleRelayDrawingState,);

    return () => {
      socket.off(EVENTS.ROOM_INFO, handleRoomInfo);
      socket.off(EVENTS.GAME_ENDED, handleGameEnded);
      socket.off(EVENTS.LIAR_GAME_STATE, handleLiarGameState);
      socket.off(EVENTS.CATCH_MIND_STATE, handleCatchMindGameState);
      socket.off(EVENTS.RELAY_DRAWING_STATE,handleRelayDrawingState,);
    };

  }, [roomId, navigate]);

  const me = room?.players.find((player) => player.id === socket.id);
  const isHost = Boolean(me?.isHost);

  const handleEndGame = () => {
    socket.emit(EVENTS.END_GAME);
    };

  const handleLeaveRoom = () => {
    socket.once(EVENTS.LEAVE_ROOM, () => {
      navigate("/lobby");
    });

    socket.emit(EVENTS.LEAVE_ROOM);
  };
  
  const renderGame = () => {
    if (!room) {
      return (
        <div className="game-placeholder">
          <h2>게임 정보를 불러오는 중...</h2>
        </div>
      );
    }

    switch (room.game) {
      case "라이어 게임":
       return <LiarGame state={liarGameState} />;

      case "캐치마인드":
        return <CatchMindGame state={catchMindGameState} />;
      
      case "릴레이 드로잉":
        return ( <RelayDrawingGame state={relayDrawingGameState}  /> );  

      default:
        return <UnknownGame />;
    }
  };

  return (
    <div className="game-page">
      <div className="game-shell">
        <header className="game-header">
          <div>
            <p>게임 진행 중</p>
            <h1>{room?.game ?? "PartyPlatform"}</h1>
            <span>{room?.title ?? `방 ID: ${roomId}`}</span>
          </div>

          <div className="game-header-actions">
            {isHost && (
              <button className="danger-button" onClick={handleEndGame}>
                게임 종료
              </button>
            )}

            <button onClick={handleLeaveRoom}>나가기</button>
          </div>
        </header>

        {renderGame()}
      </div>
    </div>
  );
}