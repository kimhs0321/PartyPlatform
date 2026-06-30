import type { Socket } from "socket.io";
import { EVENTS } from "../../../shared/events";
import { playerManager } from "../../../managers/PlayerManager";
import { liarGameManager } from "../../../managers/LiarGameManager";

export function getGameState(socket: Socket) {
  return (roomId: string) => {
    const player = playerManager.getPlayer(socket.id);
    if (!player) return;

    try {
      const state = liarGameManager.toClientState(roomId, player.id);
      socket.emit(EVENTS.LIAR_GAME_STATE, state);
    } catch {
      // 아직 라이어게임 상태가 없으면 무시
    }
  };
}