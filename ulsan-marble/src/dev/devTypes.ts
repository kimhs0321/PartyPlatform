export type PrototypeDevAction =
  | {
      action: "TELEPORT_ACTIVE_PLAYER";
      position: number;
    }
  | {
      action: "MOVE_ACTIVE_PLAYER";
      steps: number;
    }
  | {
      action: "ROLL_FIXED_DICE";
      values: [1 | 2 | 3 | 4 | 5 | 6, 1 | 2 | 3 | 4 | 5 | 6];
    };

export type PrototypeArrivalCause =
  | "DICE"
  | "GOLDEN_KEY"
  | "AIRPORT"
  | "DEV";

export interface PrototypeArrivalContext {
  arrivalId: string;
  cause: PrototypeArrivalCause;
  playerId: string;
  position: number;
  turnSequence: number;
}