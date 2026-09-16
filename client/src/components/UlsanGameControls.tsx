import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  socket,
} from "../socket/socket";

import {
  EVENTS,
} from "../shared/events";

import "./UlsanGameControls.css";

type RoomChatMessage = {
  roomId?: string;
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

type UlsanGameControlsProps = {
  roomId: string;
  onLeave: () => void;
};

const MAX_STORED_MESSAGES = 80;

function getChatStorageKey(
  roomId: string,
): string {
  return (
    `ulsan-marble:chat:${roomId}`
  );
}

function readStoredMessages(
  roomId: string,
): RoomChatMessage[] {
  try {
    const raw =
      sessionStorage.getItem(
        getChatStorageKey(roomId),
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(
      -MAX_STORED_MESSAGES,
    );
  } catch {
    return [];
  }
}

function writeStoredMessages(
  roomId: string,
  messages: RoomChatMessage[],
): void {
  try {
    sessionStorage.setItem(
      getChatStorageKey(roomId),
      JSON.stringify(
        messages.slice(
          -MAX_STORED_MESSAGES,
        ),
      ),
    );
  } catch {
    // 저장 실패는 채팅 자체를 막지 않음
  }
}

export default function UlsanGameControls({
  roomId,
  onLeave,
}: UlsanGameControlsProps) {
  const [
    chatOpen,
    setChatOpen,
  ] = useState(false);

  const [
    leaveConfirmOpen,
    setLeaveConfirmOpen,
  ] = useState(false);

  const [
    leaving,
    setLeaving,
  ] = useState(false);

  const [
    chatText,
    setChatText,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState<RoomChatMessage[]>(
    () =>
      readStoredMessages(
        roomId,
      ),
  );

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const chatOpenRef =
    useRef(chatOpen);

  const listRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    chatOpenRef.current =
      chatOpen;
  }, [chatOpen]);

  useEffect(() => {
    setMessages(
      readStoredMessages(
        roomId,
      ),
    );

    setChatText("");
    setUnreadCount(0);
    setChatOpen(false);
  }, [roomId]);

  useEffect(() => {
    const handleChatMessage = (
      message: RoomChatMessage,
    ) => {
      /*
       * 최신 서버는 roomId도 보냄.
       * 구버전 메시지는 roomId가
       * 없을 수도 있으므로 허용.
       */
      if (
        message.roomId &&
        message.roomId !== roomId
      ) {
        return;
      }

      setMessages(
        (current) => {
          const next = [
            ...current,
            message,
          ].slice(
            -MAX_STORED_MESSAGES,
          );

          writeStoredMessages(
            roomId,
            next,
          );

          return next;
        },
      );

      if (
        !chatOpenRef.current
      ) {
        setUnreadCount(
          (current) =>
            Math.min(
              current + 1,
              99,
            ),
        );
      }
    };

    socket.on(
      EVENTS.ROOM_CHAT_MESSAGE,
      handleChatMessage,
    );

    return () => {
      socket.off(
        EVENTS.ROOM_CHAT_MESSAGE,
        handleChatMessage,
      );
    };
  }, [roomId]);

  useEffect(() => {
    if (!chatOpen) {
      return;
    }

    setUnreadCount(0);

    requestAnimationFrame(() => {
      if (!listRef.current) {
        return;
      }

      listRef.current.scrollTop =
        listRef.current.scrollHeight;
    });
  }, [
    chatOpen,
    messages.length,
  ]);

  const toggleChat = () => {
    setChatOpen(
      (current) => {
        const next = !current;

        if (next) {
          setUnreadCount(0);
        }

        return next;
      },
    );
  };

  const sendChat = () => {
    const text =
      chatText.trim();

    if (!text) {
      return;
    }

    socket.emit(
      EVENTS.ROOM_SEND_CHAT,
      {
        roomId,
        text: text.slice(
          0,
          200,
        ),
      },
    );

    /*
     * 서버 echo를 받아서
     * messages에 넣으므로 여기서
     * 직접 추가하지 않는다.
     */
    setChatText("");
  };

  const confirmLeave = () => {
    if (leaving) {
      return;
    }

    setLeaving(true);
    onLeave();
  };

  return (
    <>
      <div className="ulsan-game-controls">
        <button
          type="button"
          className={
            chatOpen
              ? "ulsan-control-button is-active"
              : "ulsan-control-button"
          }
          onClick={toggleChat}
        >
          <span
            className="ulsan-control-button__icon"
            aria-hidden="true"
          >
            💬
          </span>

          <span>채팅</span>

          {unreadCount > 0 && (
            <strong className="ulsan-chat-badge">
              {unreadCount}
            </strong>
          )}
        </button>

        <button
          type="button"
          className="ulsan-control-button ulsan-control-button--leave"
          onClick={() =>
            setLeaveConfirmOpen(
              true,
            )
          }
        >
          <span
            className="ulsan-control-button__icon"
            aria-hidden="true"
          >
            ↗
          </span>

          <span>나가기</span>
        </button>
      </div>

      <aside
        className={
          chatOpen
            ? "ulsan-chat-drawer is-open"
            : "ulsan-chat-drawer"
        }
        aria-hidden={
          !chatOpen
        }
      >
        <div className="ulsan-chat-drawer__header">
          <div>
            <small>
              ULSAN MARBLE
            </small>

            <strong>
              게임 채팅
            </strong>
          </div>

          <button
            type="button"
            onClick={toggleChat}
            aria-label="채팅 닫기"
          >
            ×
          </button>
        </div>

        <div
          className="ulsan-chat-list"
          ref={listRef}
        >
          {messages.length === 0 ? (
            <div className="ulsan-chat-empty">
              <span>💬</span>
              <strong>
                아직 채팅이 없습니다.
              </strong>
              <small>
                같이 플레이 중인 사람들과
                대화해보세요.
              </small>
            </div>
          ) : (
            messages.map(
              (
                message,
                index,
              ) => (
                <div
                  className="ulsan-chat-message"
                  key={
                    `${message.playerId}-${message.createdAt}-${index}`
                  }
                >
                  <strong>
                    {message.playerName}
                  </strong>

                  <span>
                    {message.text}
                  </span>
                </div>
              ),
            )
          )}
        </div>

        <div className="ulsan-chat-input">
          <input
            value={chatText}
            maxLength={200}
            placeholder="메시지를 입력하세요."
            onChange={(event) =>
              setChatText(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              /*
               * 게임 단축키로
               * 전파되지 않도록 차단.
               */
              event.stopPropagation();

              if (
                event.key ===
                  "Enter" &&
                chatText.trim()
              ) {
                sendChat();
              }
            }}
          />

          <button
            type="button"
            disabled={
              !chatText.trim()
            }
            onClick={sendChat}
          >
            전송
          </button>
        </div>
      </aside>

      {leaveConfirmOpen && (
        <div className="ulsan-leave-backdrop">
          <div
            className="ulsan-leave-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ulsan-leave-title"
          >
            <span className="ulsan-leave-dialog__icon">
              ↗
            </span>

            <h2 id="ulsan-leave-title">
              게임에서 나갈까요?
            </h2>

            <p>
              현재 게임방에서 퇴장하고
              로비로 이동합니다.
            </p>

            <div className="ulsan-leave-dialog__actions">
              <button
                type="button"
                disabled={leaving}
                onClick={() =>
                  setLeaveConfirmOpen(
                    false,
                  )
                }
              >
                취소
              </button>

              <button
                type="button"
                className="is-danger"
                disabled={leaving}
                onClick={confirmLeave}
              >
                {leaving
                  ? "나가는 중..."
                  : "나가기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}