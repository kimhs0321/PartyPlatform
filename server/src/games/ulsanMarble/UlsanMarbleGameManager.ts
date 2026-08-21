import type {
  ClientUlsanMarbleGameState,
  UlsanMarbleDiceFace,
  UlsanMarblePropertyDecisionRequest,
  UlsanMarbleStockTradeRequest,
} from "./types/ulsanMarbleGame";
import type {
  UlsanMarbleGameEvent,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";
import {
  validateUlsanMarbleGameEvent,
} from "./gameEvents/validateGameEvent";

type InternalUlsanMarbleGameState =
  ClientUlsanMarbleGameState & {
    doubleOwnerPlayerId: string | null;

    nextRollId: number;
    nextPropertyDecisionId: number;
    nextStockTradeId: number;

    nextGameEventId: number;
  };

function createDiceFace(): UlsanMarbleDiceFace {
  return (Math.floor(Math.random() * 6) +
    1) as UlsanMarbleDiceFace;
}

function cloneClientState(
  state: InternalUlsanMarbleGameState,
): ClientUlsanMarbleGameState {
  return {
    roomId: state.roomId,
    playerIds: [...state.playerIds],

    activePlayerIndex: state.activePlayerIndex,
    activePlayerId: state.activePlayerId,

    turnNumber: state.turnNumber,
    turnSequence: state.turnSequence,
    roundLimit: state.roundLimit,
    phase: state.phase,

    consecutiveDoubleCount:
      state.consecutiveDoubleCount,

    diceRoll: state.diceRoll
      ? {
          ...state.diceRoll,
          values: [
            state.diceRoll.values[0],
            state.diceRoll.values[1],
          ],
        }
      : null,

    propertyDecision: state.propertyDecision
      ? { ...state.propertyDecision }
      : null,

    stockTrades:
      state.stockTrades.map(
        (trade) => ({ ...trade }),
      ),  

    gameEvents:
      state.gameEvents.map(
        (event): UlsanMarbleGameEvent => ({
          ...event,
        }),
      ),

    updatedAt: state.updatedAt,
  };
}

class UlsanMarbleGameManager {
  private games =
    new Map<string, InternalUlsanMarbleGameState>();

  createGame(
    roomId: string,
    playerIds: string[],
    roundLimit:
      ClientUlsanMarbleGameState["roundLimit"],
  ): ClientUlsanMarbleGameState {
    if (playerIds.length === 0) {
      throw new Error(
        "울산마블 참가자가 존재하지 않습니다.",
      );
    }

    const game: InternalUlsanMarbleGameState = {
      roomId,
      playerIds: [...playerIds],

      activePlayerIndex: 0,
      activePlayerId: playerIds[0],
      turnNumber: 1,
      turnSequence: 0,
      roundLimit,
      phase: "WAITING_FOR_ROLL",
      consecutiveDoubleCount: 0,
      doubleOwnerPlayerId: null,
      diceRoll: null,
      nextRollId: 1,
      propertyDecision: null,
      nextPropertyDecisionId: 1,
      stockTrades: [],
      nextStockTradeId: 1,
      gameEvents: [],
      nextGameEventId: 1,
      updatedAt: Date.now(),
    };

    this.games.set(roomId, game);

    return cloneClientState(game);
  }

  getGame(
    roomId: string,
  ): ClientUlsanMarbleGameState | null {
    const game = this.games.get(roomId);

    return game
      ? cloneClientState(game)
      : null;
  }

  rollDice(
    roomId: string,
    playerId: string,
    forcedValues?: [
      UlsanMarbleDiceFace,
      UlsanMarbleDiceFace,
    ],
  ): ClientUlsanMarbleGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (game.activePlayerId !== playerId) {
      throw new Error(
        "현재 주사위를 굴릴 차례가 아닙니다.",
      );
    }

    if (game.phase !== "WAITING_FOR_ROLL") {
      throw new Error(
        "아직 주사위를 굴릴 수 없습니다.",
      );
    }        

    if (
      forcedValues &&
      (
        !Number.isInteger(forcedValues[0]) ||
        forcedValues[0] < 1 ||
        forcedValues[0] > 6 ||
        !Number.isInteger(forcedValues[1]) ||
        forcedValues[1] < 1 ||
        forcedValues[1] > 6
      )
    ) {
      throw new Error(
        "DEV 주사위 값이 올바르지 않습니다.",
      );
    }

    const firstDice =
      forcedValues?.[0] ??
      createDiceFace();

    const secondDice =
      forcedValues?.[1] ??
      createDiceFace();

    const isDouble = firstDice === secondDice;

    const previousDoubleCount =
      isDouble &&
      game.doubleOwnerPlayerId === playerId
        ? game.consecutiveDoubleCount
        : 0;

    const nextDoubleCount = isDouble
      ? previousDoubleCount + 1
      : 0;

    const sendsToJail =
      isDouble && nextDoubleCount >= 3;

    const grantsExtraRoll =
      isDouble && !sendsToJail;

    const diceRoll = {
      rollId: game.nextRollId,
      playerId,

      values: [
        firstDice,
        secondDice,
      ] as [
        UlsanMarbleDiceFace,
        UlsanMarbleDiceFace,
      ],

      total:
        firstDice + secondDice,

      isDouble,
      grantsExtraRoll,
      sendsToJail,
    };

    game.diceRoll = diceRoll;
    game.nextRollId += 1;

    if (grantsExtraRoll) {
      game.doubleOwnerPlayerId = playerId;
      game.consecutiveDoubleCount =
        nextDoubleCount;

      /*
      * 더블이면 도착 칸 처리가 끝난 뒤
      * 같은 플레이어가 다시 굴린다.
      */
      game.phase = "WAITING_FOR_ROLL";
    } else {
      game.doubleOwnerPlayerId = null;
      game.consecutiveDoubleCount = 0;

      /*
      * 일반 주사위 결과에서는 현 플레이어를
      * 유지하고 턴 종료 입력을 기다린다.
      */
      game.phase = "STOCK_TRADING";
    }

        game.updatedAt = Date.now();

        return cloneClientState(game);
      }

  devRollDice(
    roomId: string,
    playerId: string,
    values: [
      UlsanMarbleDiceFace,
      UlsanMarbleDiceFace,
    ],
  ): ClientUlsanMarbleGameState {
    return this.rollDice(
      roomId,
      playerId,
      values,
    );
  }

  decideProperty(
    roomId: string,
    playerId: string,
    request:
      UlsanMarblePropertyDecisionRequest,
  ): ClientUlsanMarbleGameState {
    const game =
      this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (
      game.activePlayerId !== playerId
    ) {
      throw new Error(
        "현재 플레이어만 부동산을 결정할 수 있습니다.",
      );
    }

    const arrivalId =
      request.arrivalId.trim();

    if (
      arrivalId.length === 0 ||
      arrivalId.length > 160
    ) {
      throw new Error(
        "도착 정보가 올바르지 않습니다.",
      );
    }

    if (
      !request.propertyId.trim()
    ) {
      throw new Error(
        "부동산 정보가 올바르지 않습니다.",
      );
    }

    if (
      game.propertyDecision?.arrivalId ===
      arrivalId
    ) {
      throw new Error(
        "이미 처리된 부동산 선택입니다.",
      );
    }

    game.propertyDecision = {
      decisionId:
        game.nextPropertyDecisionId,

      arrivalId,
      playerId,

      propertyId:
        request.propertyId,

      action:
        request.action,
    };

    game.nextPropertyDecisionId += 1;
    game.updatedAt = Date.now();

    return cloneClientState(game);
  }

  tradeStock(
    roomId: string,
    playerId: string,
    request:
      UlsanMarbleStockTradeRequest,
  ): ClientUlsanMarbleGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (
      game.activePlayerId !== playerId
    ) {
      throw new Error(
        "현재 플레이어만 주식을 거래할 수 있습니다.",
      );
    }

    if (
      game.phase !== "STOCK_TRADING"
    ) {
      throw new Error(
        "현재는 주식 거래 단계가 아닙니다.",
      );
    }

    const companyId =
      request.companyId.trim();

    if (!companyId) {
      throw new Error(
        "주식 종목 정보가 올바르지 않습니다.",
      );
    }

    if (
      request.action !== "BUY" &&
      request.action !== "SELL"
    ) {
      throw new Error(
        "주식 거래 유형이 올바르지 않습니다.",
      );
    }

    if (
      !Number.isInteger(request.quantity) ||
      request.quantity <= 0
    ) {
      throw new Error(
        "주식 수량이 올바르지 않습니다.",
      );
    }

    if (
      !Number.isInteger(
        request.pricePerShare,
      ) ||
      request.pricePerShare <= 0
    ) {
      throw new Error(
        "주식 거래 가격이 올바르지 않습니다.",
      );
    }

    game.stockTrades = [
      ...game.stockTrades,
      {
        tradeId: game.nextStockTradeId,
        playerId,
        action: request.action,
        companyId,
        quantity: request.quantity,
        pricePerShare: request.pricePerShare,
        turnSequence: game.turnSequence,
      },
    ].slice(-50);

    game.nextStockTradeId += 1;
    game.updatedAt = Date.now();

    return cloneClientState(game);
  }  

  publishGameEvent(
    roomId: string,
    playerId: string,
    expectedTurnSequence: number,
    request: UlsanMarbleGameEventRequest,
  ): ClientUlsanMarbleGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

  const allowsNonActivePublisher =
    request.kind ===
      "AUCTION_ACTION_DECIDED" ||
    request.kind ===
      "MINI_GAME_ACTION_DECIDED" ||
    (
      request.kind ===
        "DISASTER_RESOLVED" &&
      request.payload.mode ===
        "DEV"
    );
    request.kind ===
      "TAX_ACTION_DECIDED";

    if (
      !allowsNonActivePublisher &&
      game.activePlayerId !==
        playerId
    ) {
      throw new Error(
        "현재 플레이어만 게임 이벤트를 진행할 수 있습니다.",
      );
    }
    if (
      game.turnSequence !==
      expectedTurnSequence
    ) {
      throw new Error(
        "현재 턴과 일치하지 않는 요청입니다.",
      );
    }

    validateUlsanMarbleGameEvent(
      game,
      playerId,
      request,
    );

    const gameEvent: UlsanMarbleGameEvent = {
      ...request,
      eventId: game.nextGameEventId,
      playerId,
      turnSequence: game.turnSequence,
    };

    game.nextGameEventId += 1;

    game.gameEvents = [
      ...game.gameEvents,
      gameEvent,
    ].slice(-100);

    if (request.kind === "JAIL_TURN_ACTION_DECIDED") {
      const payload = request.payload;

      const movesAfterJailAction =
        payload.action === "PAY_BAIL" ||
        payload.action === "USE_ESCAPE_CARD" ||
        (
          payload.action === "TRY_DOUBLE" &&
          payload.diceValues[0] === payload.diceValues[1]
        );

      const endsTurnAfterFailedDouble =
        payload.action === "TRY_DOUBLE" &&
        payload.diceValues[0] !== payload.diceValues[1] &&
        payload.failedAttemptsBefore < 2;

      if (
        movesAfterJailAction ||
        endsTurnAfterFailedDouble
      ) {
        game.phase = "STOCK_TRADING";
      }
    }

    if (
      request.kind === "JAIL_FINE_ACTION_DECIDED" &&
      request.payload.action === "PAY"
    ) {
      game.phase = "STOCK_TRADING";
    }

    game.updatedAt = Date.now();

    return cloneClientState(game);
  }
  
  devEndTurn(
    roomId: string,
    playerId: string,
  ): ClientUlsanMarbleGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (game.activePlayerId !== playerId) {
      throw new Error(
        "현재 플레이어만 DEV 턴 종료를 사용할 수 있습니다.",
      );
    }

    if (game.phase !== "WAITING_FOR_ROLL") {
      throw new Error(
        "DEV 턴 종료는 주사위 대기 상태에서만 사용할 수 있습니다.",
      );
    }

    const nextPlayerIndex =
      (game.activePlayerIndex + 1) %
      game.playerIds.length;

    const completedRound =
      nextPlayerIndex === 0;

    game.activePlayerIndex =
      nextPlayerIndex;

    game.activePlayerId =
      game.playerIds[nextPlayerIndex];

    if (completedRound) {
      game.turnNumber += 1;
    }

    game.turnSequence += 1;
    game.phase = "WAITING_FOR_ROLL";

    game.diceRoll = null;
    game.stockTrades = [];

    game.updatedAt = Date.now();

    return cloneClientState(game);
  }

  endTurn(
    roomId: string,
    playerId: string,
  ): ClientUlsanMarbleGameState {
    const game = this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (game.activePlayerId !== playerId) {
      throw new Error(
        "현재 플레이어만 턴을 종료할 수 있습니다.",
      );
    }

    if (game.phase !== "STOCK_TRADING") {
      throw new Error(
        "아직 턴을 종료할 수 없습니다.",
      );
    }

    const nextPlayerIndex =
      (game.activePlayerIndex + 1) %
      game.playerIds.length;

    const completedRound =
      nextPlayerIndex === 0;

    game.activePlayerIndex =
      nextPlayerIndex;

    game.activePlayerId =
      game.playerIds[nextPlayerIndex];

    if (completedRound) {
      game.turnNumber += 1;
    }

    game.turnSequence += 1;
    game.phase = "WAITING_FOR_ROLL";

    game.diceRoll = null;
    game.stockTrades = [];

    game.updatedAt = Date.now();

    return cloneClientState(game);
  }

  removeGame(roomId: string): void {
    this.games.delete(roomId);
  }
}

export const ulsanMarbleGameManager =
  new UlsanMarbleGameManager();