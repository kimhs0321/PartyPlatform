export type TurnPhase =
  | "WAITING_FOR_ROLL"
  | "ROLLING_DICE"
  | "RESOLVING_JAIL"
  | "MOVING"
  | "ARRIVED"
  | "RESOLVING_TILE"
  | "STOCK_TRADING"
  | "RESOLVING_TAX"
  | "RESOLVING_MARKET"
  | "RESOLVING_STOCK_MARKET"
  | "RESOLVING_PORT_SETTLEMENT"
  | "RESOLVING_LOTTO_DRAW"
  | "RESOLVING_MAYOR_ELECTION"
  | "RESOLVING_ECONOMIC_NEWS"
  | "RESOLVING_DISASTER";

export interface TurnState {
  turnNumber: number;
  activePlayerIndex: number;
  phase: TurnPhase;
  sequence: number;
}

export type TurnAction =
  | { type: "START_DICE_ROLL" }
  | { type: "START_JAIL_RESOLUTION" }
  | { type: "START_MOVEMENT" }
  | { type: "START_FORCED_JAIL_RESOLUTION" }
  | { type: "MARK_ARRIVED" }
  | { type: "START_TILE_RESOLUTION" }
  | { type: "START_STOCK_TRADING" }
  | { type: "START_TAX_SETTLEMENT" }
  | { type: "START_MARKET_SETTLEMENT" }
  | { type: "START_STOCK_MARKET_SETTLEMENT" }
  | { type: "START_PORT_SETTLEMENT" }
  | { type: "START_LOTTO_DRAW" }
  | { type: "START_MAYOR_ELECTION" }
  | { type: "START_ECONOMIC_NEWS" }
  | { type: "START_DISASTER" }
  | { type: "GRANT_EXTRA_ROLL" }
  | { type: "COMPLETE_TURN"; nextPlayerIndex: number; completedGlobalTurn: boolean;}
  | { type: "OVERRIDE_ACTIVE_PLAYER"; playerIndex: number; playerCount: number;}
  | { type: "OVERRIDE_TURN_NUMBER"; turnNumber: number;}
  | { type: "START_FORCED_MOVEMENT";}
  | { type: "START_FORCED_TILE_RESOLUTION";}
  | { type: "CANCEL_CURRENT_ACTION" }
  | { type: "RESET" };
