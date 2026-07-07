import type { GameModule } from "../common/GameModule";

export const catchMindModule: GameModule = {
  name: "캐치마인드",
  enabled: false,

  registerSocket() {},

  startGame() {},

  onDisconnect() {},
};