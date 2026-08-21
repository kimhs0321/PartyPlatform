export const MOVE_STEP_DELAY_MS = 260;
export const ARRIVAL_FOCUS_DELAY_MS = 600;
export const DICE_RESULT_DELAY_MS = 550;
export const DICE_TO_MOVEMENT_DELAY_MS = 120;

export function delay(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}
