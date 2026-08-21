import type { GameModule } from "../common/GameModule";

export const ulsanMarbleModule: GameModule = {
  name: "울산마블",
  enabled: true,

  registerSocket() {},

  async startGame() {
    // 현재는 기존 울산마블 클라이언트 화면을 실행하는 1차 연결 단계.
    // 서버 게임 상태 생성은 멀티플레이 동기화 단계에서 추가한다.
  },

  onDisconnect() {},
};