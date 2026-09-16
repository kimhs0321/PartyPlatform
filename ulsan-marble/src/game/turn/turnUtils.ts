import type { TurnAction, TurnState } from "./turnTypes";

export const INITIAL_TURN_STATE: TurnState = {
  turnNumber: 1,
  activePlayerIndex: 0,
  phase: "WAITING_FOR_ROLL",
  sequence: 0,
};

export function turnReducer(
  state: TurnState,
  action: TurnAction,
): TurnState {
  switch (action.type) {
    case "START_DICE_ROLL":
      if (state.phase !== "WAITING_FOR_ROLL") return state;
      return { ...state, phase: "ROLLING_DICE" };

    case "START_JAIL_RESOLUTION":
      if (state.phase !== "WAITING_FOR_ROLL") return state;
      return { ...state, phase: "RESOLVING_JAIL" };

    case "START_MOVEMENT":
      if (
        state.phase !== "ROLLING_DICE" &&
        state.phase !== "RESOLVING_JAIL"
      ) {
        return state;
      }
      return { ...state, phase: "MOVING" };

    case "START_FORCED_JAIL_RESOLUTION":
      if (state.phase !== "ROLLING_DICE") return state;
      return { ...state, phase: "RESOLVING_TILE" };

    case "MARK_ARRIVED":
      if (state.phase !== "MOVING") return state;
      return { ...state, phase: "ARRIVED" };

    case "START_TILE_RESOLUTION":
      if (state.phase !== "ARRIVED") return state;
      return { ...state, phase: "RESOLVING_TILE" };

    case "START_STOCK_TRADING": {
      console.log(
        "[TURN REDUCER START_STOCK_TRADING]",
        {
          phase: state.phase,
          turnNumber: state.turnNumber,
          sequence: state.sequence,
          activePlayerIndex:
            state.activePlayerIndex,
        },
      );

      if (
        state.phase !==
        "RESOLVING_TILE"
      ) {
        console.warn(
          "[TURN REDUCER START_STOCK_TRADING BLOCKED]",
          {
            phase: state.phase,
            turnNumber:
              state.turnNumber,
            sequence:
              state.sequence,
          },
        );

        return state;
      }

      console.log(
        "[TURN REDUCER START_STOCK_TRADING APPLIED]",
        {
          turnNumber:
            state.turnNumber,
          sequence:
            state.sequence,
        },
      );

      return {
        ...state,
        phase: "STOCK_TRADING",
      };
    }
    case "START_TAX_SETTLEMENT":
      if (
        state.phase !== "RESOLVING_JAIL" &&
        state.phase !== "ARRIVED" &&
        state.phase !== "RESOLVING_TILE" &&
        state.phase !== "STOCK_TRADING"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_TAX" };


    case "START_MARKET_SETTLEMENT":
      if (
        state.phase !== "RESOLVING_JAIL" &&
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "ARRIVED" &&
        state.phase !== "RESOLVING_TILE" &&
        state.phase !== "RESOLVING_TAX"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_MARKET" };

    case "START_STOCK_MARKET_SETTLEMENT":
      if (
        state.phase !== "RESOLVING_JAIL" &&
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_TILE" &&
        state.phase !== "STOCK_TRADING" &&
        state.phase !== "RESOLVING_MARKET" &&
        state.phase !== "RESOLVING_TAX"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_STOCK_MARKET" };

    case "START_PORT_SETTLEMENT":
      if (
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_STOCK_MARKET"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_PORT_SETTLEMENT" };

    case "START_LOTTO_DRAW":
      if (
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_STOCK_MARKET" &&
        state.phase !== "RESOLVING_PORT_SETTLEMENT" &&
        state.phase !== "RESOLVING_LOTTO_DRAW"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_LOTTO_DRAW" };


    case "START_MAYOR_ELECTION":
      if (
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_STOCK_MARKET" &&
        state.phase !== "RESOLVING_PORT_SETTLEMENT" &&
        state.phase !== "RESOLVING_LOTTO_DRAW"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_MAYOR_ELECTION" };


    case "START_ECONOMIC_NEWS":
      if (
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_STOCK_MARKET" &&
        state.phase !== "RESOLVING_PORT_SETTLEMENT" &&
        state.phase !== "RESOLVING_LOTTO_DRAW" &&
        state.phase !== "RESOLVING_MAYOR_ELECTION"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_ECONOMIC_NEWS" };

    case "START_DISASTER":
      if (
        state.phase !== "WAITING_FOR_ROLL" &&
        state.phase !== "RESOLVING_STOCK_MARKET" &&
        state.phase !== "RESOLVING_PORT_SETTLEMENT" &&
        state.phase !== "RESOLVING_LOTTO_DRAW" &&
        state.phase !== "RESOLVING_MAYOR_ELECTION" &&
        state.phase !== "RESOLVING_ECONOMIC_NEWS"
      ) {
        return state;
      }

      return { ...state, phase: "RESOLVING_DISASTER" };

    case "GRANT_EXTRA_ROLL":
      if (state.phase !== "RESOLVING_TILE") return state;
      return { ...state, phase: "WAITING_FOR_ROLL" };

    case "COMPLETE_TURN":
      if (
        state.phase !== "RESOLVING_JAIL" &&
        state.phase !== "ARRIVED" &&
        state.phase !== "RESOLVING_TILE" &&
        state.phase !== "STOCK_TRADING" &&
        state.phase !== "RESOLVING_TAX" &&
        state.phase !== "RESOLVING_MARKET" &&
        state.phase !== "RESOLVING_STOCK_MARKET" &&
        state.phase !== "RESOLVING_PORT_SETTLEMENT" &&
        state.phase !== "RESOLVING_LOTTO_DRAW" &&
        state.phase !== "RESOLVING_MAYOR_ELECTION" &&
        state.phase !== "RESOLVING_ECONOMIC_NEWS" &&
        state.phase !== "RESOLVING_DISASTER"
      ) {
        return state;
      }

      return {
        activePlayerIndex: action.nextPlayerIndex,
        turnNumber: action.completedGlobalTurn
          ? state.turnNumber + 1
          : state.turnNumber,
        phase: "WAITING_FOR_ROLL",
        sequence: state.sequence + 1,
      };

    case "CANCEL_CURRENT_ACTION":
      return { ...state, phase: "WAITING_FOR_ROLL" };

    case "OVERRIDE_ACTIVE_PLAYER": {
      if (state.phase !== "WAITING_FOR_ROLL") return state;

      const safePlayerCount = Math.max(action.playerCount, 1);
      const safeIndex = Math.min(
        Math.max(Math.trunc(action.playerIndex), 0),
        safePlayerCount - 1,
      );

      return {
        ...state,
        activePlayerIndex: safeIndex,
      };
    }

    case "OVERRIDE_TURN_NUMBER":
      if (state.phase !== "WAITING_FOR_ROLL") return state;

      return {
        ...state,
        turnNumber: Math.max(1, Math.trunc(action.turnNumber)),
      };

    case "START_FORCED_MOVEMENT":
      if (state.phase !== "WAITING_FOR_ROLL") return state;

      return {
        ...state,
        phase: "MOVING",
      };

    case "START_FORCED_TILE_RESOLUTION":
      if (state.phase !== "WAITING_FOR_ROLL") return state;

      return {
        ...state,
        phase: "RESOLVING_TILE",
      };

    case "RESTORE_STATE":
      return {
        turnNumber: Math.max(
          1,
          Math.trunc(action.state.turnNumber),
        ),

        activePlayerIndex: Math.max(
          0,
          Math.trunc(
            action.state.activePlayerIndex,
          ),
        ),

        phase: action.state.phase,

        sequence: Math.max(
          0,
          Math.trunc(action.state.sequence),
        ),
      };

    case "RESET":
      return INITIAL_TURN_STATE;
      
    default:
      return state;
  }
}
