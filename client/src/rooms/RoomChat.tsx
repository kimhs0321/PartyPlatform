import { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import { EVENTS } from "../shared/events";
import ChatPanel, { type ChatMessage } from "../components/chat/ChatPanel";

type RoomChatProps = {
  roomId: string;
};

export default function RoomChat({ roomId }: RoomChatProps) {
  const [chatText, setChatText] = useState("");
  const [chats, setChats] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const handleRoomChat = (chat: ChatMessage) => {
      setChats((prev) => [...prev, chat]);
    };

    socket.on(EVENTS.ROOM_CHAT_MESSAGE, handleRoomChat);

    return () => {
      socket.off(EVENTS.ROOM_CHAT_MESSAGE, handleRoomChat);
    };
  });

  const handleSendChat = () => {
    if (!chatText.trim()) return;

    socket.emit(EVENTS.ROOM_SEND_CHAT, {
      roomId,
      text: chatText,
    });

    setChatText("");
  };

  return (
    <ChatPanel
      title="대기실 채팅"
      messages={chats}
      value={chatText}
      placeholder="대기실 채팅을 입력하세요."
      onChange={setChatText}
      onSend={handleSendChat}
    />
  );
}