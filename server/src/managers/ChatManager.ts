import type { ChatMessage } from "../shared/types/ChatMessage";

class ChatManager {
  private messages = new Map<string, ChatMessage[]>();

  addMessage(roomId: string, playerId: string, nickname: string, text: string) {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      roomId,
      playerId,
      nickname,
      text,
      createdAt: Date.now(),
    };

    const roomMessages = this.messages.get(roomId) ?? [];
    roomMessages.push(message);

    this.messages.set(roomId, roomMessages);

    return message;
  }

  getMessages(roomId: string) {
    return this.messages.get(roomId) ?? [];
  }
}

export const chatManager = new ChatManager();