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

    pendingGameEventAcks: Map<
      number,
      {
        turnSequence: number;
        ackedPlayerIds: Set<string>;
      }
    >;

    turnReadyPlayerIds: Set<string>;

    pendingEndTurnPlayerId:
      string | null;
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
    controllerPlayerId: state.controllerPlayerId,
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
    controllerPlayerId: string,
    roundLimit:
     ClientUlsanMarbleGameState["roundLimit"],
  ): ClientUlsanMarbleGameState {
    if (playerIds.length === 0) {
      throw new Error(
        "울산마블 참가자가 존재하지 않습니다.",
      );
    }

    if (
      !playerIds.includes(
        controllerPlayerId,
      )
    ) {
      throw new Error(
        "울산마블 진행 담당자가 참가자에 포함되어 있지 않습니다.",
      );
    }

    const game: InternalUlsanMarbleGameState = {
      roomId,
      playerIds: [...playerIds],

      activePlayerIndex: 0,
      activePlayerId: playerIds[0],
      controllerPlayerId,
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
      pendingGameEventAcks:new Map(),
      turnReadyPlayerIds:new Set(),
      pendingEndTurnPlayerId:null,
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
    /*
    * 각 참가자 본인이 수행할 수 있는
    * 비현재턴 행동.
    *
    * 실제 발행 권한은 각 event validator가
    * playerId / voterId / taxpayerId 등을
    * 다시 검증한다.
    */
    request.kind ===
      "AUCTION_ACTION_DECIDED" ||
    request.kind ===
      "MINI_GAME_ACTION_DECIDED" ||
    request.kind ===
      "TAX_ACTION_DECIDED" ||
    request.kind ===
      "MAYOR_ELECTION_VOTE_CAST" ||
    request.kind ===
      "DISASTER_ACTION_DECIDED" ||
    (
      /*
      * DEV 재난은 정기 전역 진행과 별개이므로
      * 기존 DEV 허용 정책을 유지한다.
      */
      request.kind ===
        "DISASTER_RESOLVED" &&
      request.payload.mode ===
        "DEV"
    );

  const allowsControllerPublisher =
    playerId ===
      game.controllerPlayerId &&
    (
      request.kind ===
        "MACRO_ECONOMY_RESOLVED" ||
      request.kind ===
        "COMPANY_DIVIDEND_EVENT_RESOLVED" ||  
      request.kind ===
        "STOCK_MARKET_RESOLVED" ||
      request.kind ===
        "STOCK_MARKET_SETTLEMENT_CONFIRMED" ||

      /*
      * 부동산시장 전역 정산
      */
      request.kind ===
        "PROPERTY_MARKET_RESOLVED" ||
      request.kind ===
        "PROPERTY_MARKET_SETTLEMENT_CONFIRMED" ||

      /*
      * 항구 전역 정산
      */
      request.kind ===
        "PORT_SETTLEMENT_RESOLVED" ||
      request.kind ===
        "PORT_SETTLEMENT_CONFIRMED" ||

      /*
      * 로또 정기 추첨
      */
      request.kind ===
        "LOTTO_DRAW_RESOLVED" ||
      request.kind ===
        "LOTTO_DRAW_CONFIRMED" ||

      /*
      * 정기 세금 부과 시작.
      * 이후 TAX_ACTION_DECIDED는
      * 각 납세자 행동이다.
      */
      request.kind ===
        "TAX_SETTLEMENT_STARTED" ||

      /*
      * 경제뉴스.
      * RANDOM 정기뉴스는 controller,
      * NEWSPAPER는 현재 플레이어도 가능하므로
      * 각 validator에서 source까지 검사한다.
      */
      request.kind ===
        "ECONOMIC_NEWS_DRAW_DECIDED" ||
      request.kind ===
        "ECONOMIC_NEWS_APPLIED" ||
      request.kind ===
        "ECONOMIC_NEWS_CONFIRMED" ||

      /*
      * 정기 재난 결과 생성.
      * 피해자 PAY / SELL / BANKRUPTCY는
      * DISASTER_ACTION_DECIDED 쪽이다.
      */
      request.kind ===
        "DISASTER_RESOLVED" ||

      /*
      * 축제
      */
      request.kind ===
        "FESTIVAL_TRIGGER_RESOLVED" ||
      request.kind ===
        "FESTIVAL_ANNOUNCEMENT_CONFIRMED" ||
      request.kind ===
        "TOURIST_TURN_RESOLVED" ||
      request.kind ===
        "TOURIST_TURN_CONFIRMED" ||
      request.kind ===
        "FESTIVAL_DEV_ENDED" ||

      /*
      * 시장선거 진행.
      * 투표 자체는 voter가 한다.
      */
      request.kind ===
        "MAYOR_ELECTION_STARTED" ||
      request.kind ===
        "MAYOR_ELECTION_RESULT_RESOLVED" ||
      request.kind ===
        "MAYOR_ELECTION_RESULT_CONFIRMED"
    );

    if (
      !allowsNonActivePublisher &&
      !allowsControllerPublisher &&
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

    game.pendingGameEventAcks.set(
      gameEvent.eventId,
      {
        turnSequence:
          gameEvent.turnSequence,

        ackedPlayerIds:
          new Set(),
      },
    );

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
      request.kind ===
      "JAIL_ENTRY_CONFIRMED"
    ) {
      /*
      * 구치소 입장은 추가 주사위를 포함한
      * 현재 행동을 종료한다.
      */
      game.phase =
        "STOCK_TRADING";
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
  
  ackGameEvent(
    roomId: string,
    playerId: string,
    eventId: number,
    turnSequence: number,
  ): ClientUlsanMarbleGameState {
    const game =
      this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (
      !game.playerIds.includes(
        playerId,
      )
    ) {
      throw new Error(
        "게임 참가자가 아닙니다.",
      );
    }

    const pending =
      game.pendingGameEventAcks.get(
        eventId,
      );

    /*
    * 이미 전원 ACK가 끝난 이벤트에
    * 중복 ACK가 도착한 경우.
    */
    if (!pending) {
      return cloneClientState(game);
    }

    if (
      pending.turnSequence !==
      turnSequence
    ) {
      throw new Error(
        "게임 이벤트 ACK의 턴 정보가 일치하지 않습니다.",
      );
    }

    pending.ackedPlayerIds.add(
      playerId,
    );

    console.log(
      "[GAME EVENT ACK]",
      "eventId =", eventId,
      "turnSeq =", turnSequence,
      "player =", playerId,
      "acked =",
      pending.ackedPlayerIds.size,
      "/",
      game.playerIds.length,
    );

    const allAcked =
      game.playerIds.every(
        (id) =>
          pending.ackedPlayerIds.has(
            id,
          ),
      );

    if (allAcked) {
      game.pendingGameEventAcks.delete(
        eventId,
      );

      console.log(
        "[GAME EVENT ACK COMPLETE]",
        "eventId =", eventId,
        "turnSeq =", turnSequence,
      );
    }

    /*
    * END_TURN이 이미 들어와 있었다면
    * 마지막 ACK가 barrier를 열 수 있다.
    */
    this.tryCommitPendingTurnEnd(game,);

    game.updatedAt = Date.now();

    return cloneClientState(game);
  }

  markTurnReady(
    roomId: string,
    playerId: string,
    turnSequence: number,
  ): ClientUlsanMarbleGameState {
    const game =
      this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (
      !game.playerIds.includes(
        playerId,
      )
    ) {
      throw new Error(
        "게임 참가자가 아닙니다.",
      );
    }

    /*
    * 이미 서버가 다음 턴으로 넘어간 뒤
    * 늦게 온 신호는 무시한다.
    */
    if (
      turnSequence <
      game.turnSequence
    ) {
      return cloneClientState(game);
    }

    if (
      turnSequence !==
      game.turnSequence
    ) {
      throw new Error(
        "현재 턴과 일치하지 않는 준비 신호입니다.",
      );
    }

    game.turnReadyPlayerIds.add(
      playerId,
    );

    console.log(
      "[TURN READY]",
      "turnSeq =", turnSequence,
      "player =", playerId,
      "ready =",
      game.turnReadyPlayerIds.size,
      "/",
      game.playerIds.length,);

    this.tryCommitPendingTurnEnd(game,);

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

    game.pendingEndTurnPlayerId = null;

    game.turnReadyPlayerIds.clear();

    game.turnSequence += 1;
    game.phase = "WAITING_FOR_ROLL";

    game.diceRoll = null;
    game.stockTrades = [];

    game.updatedAt = Date.now();

    return cloneClientState(game);
  }

  private canCommitPendingTurnEnd(
    game: InternalUlsanMarbleGameState,
  ): boolean {
    if (!game.pendingEndTurnPlayerId) {
      return false;
    }

    /*
    * 턴 종료를 요청한 플레이어가
    * 여전히 현재 플레이어여야 한다.
    */
    if (
      game.activePlayerId !==
      game.pendingEndTurnPlayerId
    ) {
      return false;
    }

    if (
      game.phase !==
      "STOCK_TRADING"
    ) {
      return false;
    }

    /*
    * 현재 턴에서 아직 모든 클라이언트의
    * ACK를 받지 못한 GAME EVENT가 하나라도
    * 있으면 턴을 넘기지 않는다.
    */
    const hasPendingCurrentTurnEventAck =
      [
        ...game.pendingGameEventAcks.values(),
      ].some(
        (pending) =>
          pending.turnSequence ===
          game.turnSequence,
      );

    if (
      hasPendingCurrentTurnEventAck
    ) {
      return false;
    }

    /*
    * 모든 참가 클라이언트가
    * 현재 턴 처리를 실제로 끝냈어야 한다.
    */
    return game.playerIds.every(
      (playerId) =>
        game.turnReadyPlayerIds.has(
          playerId,
        ),
    );
  }

  private tryCommitPendingTurnEnd(
    game: InternalUlsanMarbleGameState,
  ): void {
    if (
      !this.canCommitPendingTurnEnd(
        game,
      )
    ) {
      return;
    }

    const endingPlayerId =
      game.pendingEndTurnPlayerId;

    const completedTurnSequence =
      game.turnSequence;

    const nextPlayerIndex =
      (
        game.activePlayerIndex + 1
      ) %
      game.playerIds.length;

    const completedRound =
      nextPlayerIndex === 0;

    game.activePlayerIndex =
      nextPlayerIndex;

    game.activePlayerId =
      game.playerIds[
        nextPlayerIndex
      ];

    if (completedRound) {
      game.turnNumber += 1;
    }

    game.turnSequence += 1;

    game.phase =
      "WAITING_FOR_ROLL";

    game.diceRoll = null;
    game.stockTrades = [];

    /*
    * 이전 턴 barrier 상태 제거.
    */
    game.pendingEndTurnPlayerId =
      null;

    game.turnReadyPlayerIds.clear();

    game.updatedAt =
      Date.now();

    console.log(
      "[TURN END COMMIT]",
      "player =",
      endingPlayerId,
      "completedSeq =",
      completedTurnSequence,
      "nextPlayer =",
      game.activePlayerId,
      "nextSeq =",
      game.turnSequence,
    );
  }

  endTurn(
    roomId: string,
    playerId: string,
  ): ClientUlsanMarbleGameState {
    const game =
      this.games.get(roomId);

    if (!game) {
      throw new Error(
        "울산마블 게임 상태가 없습니다.",
      );
    }

    if (
      game.activePlayerId !==
      playerId
    ) {
      throw new Error(
        "현재 플레이어만 턴을 종료할 수 있습니다.",
      );
    }

    if (
      game.phase !==
      "STOCK_TRADING"
    ) {
      throw new Error(
        "아직 턴을 종료할 수 없습니다.",
      );
    }

    if (
      game.pendingEndTurnPlayerId ===
      playerId
    ) {
      this.tryCommitPendingTurnEnd(
        game,
      );

      return cloneClientState(
        game,
      );
    }

    game.pendingEndTurnPlayerId =
      playerId;

    const pendingCurrentTurnEventCount =
      [
        ...game.pendingGameEventAcks
          .values(),
      ].filter(
        (pending) =>
          pending.turnSequence ===
          game.turnSequence,
      ).length;

    console.log(
      "[TURN END PENDING]",
      "player =",
      playerId,
      "turnSeq =",
      game.turnSequence,
      "pendingEvents =",
      pendingCurrentTurnEventCount,
      "ready =",
      game.turnReadyPlayerIds.size,
      "/",
      game.playerIds.length,
    );

    this.tryCommitPendingTurnEnd(
      game,
    );

    game.updatedAt =
      Date.now();

    return cloneClientState(game);
  }

  removeGame(roomId: string): void {
    this.games.delete(roomId);
  }
}

export const ulsanMarbleGameManager =
  new UlsanMarbleGameManager();