import type { GameModule } from "./GameModule";
import { liarModule } from "../liar/liar.module";
import { catchMindModule } from "../catchMind/catchMind.module";

export const GAME_MODULES: GameModule[] = [
  liarModule,
  catchMindModule,
];

export function getEnabledGameModules(): GameModule[] {
  return GAME_MODULES.filter((gameModule) => gameModule.enabled);
}

export function findGameModuleByName(name: string): GameModule | undefined {
  return GAME_MODULES.find((gameModule) => gameModule.name === name);
}