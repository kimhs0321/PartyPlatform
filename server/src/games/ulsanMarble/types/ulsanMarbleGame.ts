import type {
  UlsanMarbleRoundLimit,
} from "../../../shared/types/ulsanMarble";
import type {
  UlsanMarbleGameEvent,
} from "../../../../../shared/ulsanMarbleProtocol";

export type UlsanMarbleDiceFace =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export type UlsanMarbleServerPhase =
  | "WAITING_FOR_ROLL"
  | "STOCK_TRADING";

export type UlsanMarbleDiceRollState = {
  rollId: number;
  playerId: string;
  values: [
    UlsanMarbleDiceFace,
    UlsanMarbleDiceFace,
  ];

  total: number;
  isDouble: boolean;
  grantsExtraRoll: boolean;
  sendsToJail: boolean;
};

export type UlsanMarblePropertyDecisionAction =
  | "BUY"
  | "DECLINE";

export type UlsanMarbleStockTradeAction =
  | "BUY"
  | "SELL";

export type UlsanMarbleStockTradeRequest = {
  action:
    UlsanMarbleStockTradeAction;

  companyId: string;
  quantity: number;
  pricePerShare: number;
};

export type UlsanMarbleStockTradeState =
  UlsanMarbleStockTradeRequest & {
    tradeId: number;
    playerId: string;

    /*
     * 어느 플레이어 턴에서 발생한
     * 거래인지 확인하기 위한 값이다.
     */
    turnSequence: number;
  };

export type UlsanMarblePropertyDecisionRequest = {
  arrivalId: string;
  propertyId: string;
  action:
    UlsanMarblePropertyDecisionAction;
};

export type UlsanMarblePropertyDecisionState =
  UlsanMarblePropertyDecisionRequest & {
    decisionId: number;
    playerId: string;
  };

export type ClientUlsanMarbleGameState = {
  roomId: string;
  playerIds: string[];

  activePlayerIndex: number;
  activePlayerId: string;

  /*
   * 게임 전체 authoritative 진행 담당자.
   * 플레이 순서와 무관하게 게임 종료까지 고정한다.
   */
  controllerPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  roundLimit:
    UlsanMarbleRoundLimit;

  phase:
    UlsanMarbleServerPhase;

  consecutiveDoubleCount: number;

  diceRoll:
    UlsanMarbleDiceRollState | null;

  propertyDecision:
    UlsanMarblePropertyDecisionState | null;

  stockTrades:
    UlsanMarbleStockTradeState[];

  gameEvents:
    UlsanMarbleGameEvent[];  

  updatedAt: number;
};

export type UlsanMarbleGameError = {
  message: string;
}; 