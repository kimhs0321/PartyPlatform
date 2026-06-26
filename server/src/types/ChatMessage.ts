export type ChatMessage = {
  id: string;
  roomId: string;
  playerId: string;
  nickname: string;
  text: string;
  createdAt: number;
};
