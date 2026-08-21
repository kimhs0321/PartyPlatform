import type {
  UlsanMarbleAuctionActionDecidedPayload,
  UlsanMarbleAuctionSnapshotPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

import type {
  ClientUlsanMarbleGameState,
} from "../types/ulsanMarbleGame";

const AUCTION_START_PRICE = 50;
const AUCTION_MINIMUM_INCREMENT = 10;

function fail(
  message: string,
): never {
  throw new Error(message);
}

function sameArray(
  first: string[],
  second: string[],
): boolean {
  return (
    first.length ===
      second.length &&
    first.every(
      (value, index) =>
        value ===
        second[index],
    )
  );
}

function validatePlayer(
  game:
    ClientUlsanMarbleGameState,

  playerId:
    string,
): void {
  if (
    !game.playerIds.includes(
      playerId,
    )
  ) {
    fail(
      "경매 플레이어 정보가 올바르지 않습니다.",
    );
  }
}

function validateSnapshot(
  game:
    ClientUlsanMarbleGameState,

  auction:
    UlsanMarbleAuctionSnapshotPayload,
): void {
  if (
    !auction.auctionId ||
    !auction.item.instanceId
  ) {
    fail(
      "경매 정보가 올바르지 않습니다.",
    );
  }

  validatePlayer(
    game,
    auction.arrivalPlayerId,
  );

  const eligibleSet =
    new Set(
      auction.eligibleBidderIds,
    );

  if (
    eligibleSet.size !==
    auction
      .eligibleBidderIds.length
  ) {
    fail(
      "경매 참가자 정보가 중복되었습니다.",
    );
  }

  for (
    const playerId of
    auction.eligibleBidderIds
  ) {
    validatePlayer(
      game,
      playerId,
    );
  }

  for (
    const playerId of
    auction.activeBidderIds
  ) {
    if (
      !eligibleSet.has(playerId)
    ) {
      fail(
        "활성 응찰자 정보가 올바르지 않습니다.",
      );
    }
  }

  for (
    const playerId of [
      auction.currentBidderId,
      auction.highestBidderId,
      auction.winnerPlayerId,
    ]
  ) {
    if (
      playerId !== null &&
      !eligibleSet.has(playerId)
    ) {
      fail(
        "경매 응찰자 정보가 올바르지 않습니다.",
      );
    }
  }

  if (
    !Number.isInteger(
      auction.currentBid,
    ) ||
    auction.currentBid < 0
  ) {
    fail(
      "경매 입찰 금액이 올바르지 않습니다.",
    );
  }

  if (
    auction.stage ===
    "BIDDING"
  ) {
    if (
      !auction.currentBidderId ||
      auction.result !== null ||
      auction.winnerPlayerId !==
        null ||
      auction.deadlineAt ===
        null
    ) {
      fail(
        "경매 진행 상태가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    auction.currentBidderId !==
      null ||
    auction.deadlineAt !== null
  ) {
    fail(
      "종료된 경매의 응찰 정보가 올바르지 않습니다.",
    );
  }

  if (
    auction.stage ===
    "CHOOSE_DISCARD"
  ) {
    if (
      !auction.winnerPlayerId ||
      auction.result !== null
    ) {
      fail(
        "경매 아이템 반납 상태가 올바르지 않습니다.",
      );
    }

    return;
  }

  if (
    auction.stage !==
    "RESULT"
  ) {
    fail(
      "경매 단계가 올바르지 않습니다.",
    );
  }

  if (
    auction.result === "SOLD" &&
    !auction.winnerPlayerId
  ) {
    fail(
      "경매 낙찰자 정보가 없습니다.",
    );
  }

  if (
    auction.result ===
      "UNSOLD" &&
    auction.winnerPlayerId
  ) {
    fail(
      "유찰 경매에 낙찰자가 지정되어 있습니다.",
    );
  }
}

function findLatestAuction(
  game:
    ClientUlsanMarbleGameState,

  auctionId: string,
):
  | UlsanMarbleAuctionSnapshotPayload
  | null {
  for (
    let index =
      game.gameEvents.length - 1;

    index >= 0;

    index -= 1
  ) {
    const event =
      game.gameEvents[index];

    if (
      event.kind !==
        "AUCTION_ACTION_DECIDED" ||
      event.payload.auctionId !==
        auctionId
    ) {
      continue;
    }

    if (
      event.payload.action ===
      "CLOSE"
    ) {
      return null;
    }

    return event.payload.auction;
  }

  return null;
}

function ensureSameAuction(
  previous:
    UlsanMarbleAuctionSnapshotPayload,

  next:
    UlsanMarbleAuctionSnapshotPayload,
): void {
  if (
    previous.auctionId !==
      next.auctionId ||
    previous.arrivalPlayerId !==
      next.arrivalPlayerId ||
    previous.item.instanceId !==
      next.item.instanceId ||
    previous.item.itemId !==
      next.item.itemId ||
    !sameArray(
      previous
        .eligibleBidderIds,

      next
        .eligibleBidderIds,
    )
  ) {
    fail(
      "경매 대상 정보가 변경되었습니다.",
    );
  }
}

function calculateNextBidder(
  bidderOrder: string[],
  activeBidderIds: string[],
  currentBidderId: string,
  highestBidderId:
    string | null,
): string | null {
  const activeSet =
    new Set(
      activeBidderIds,
    );

  const currentIndex =
    Math.max(
      0,

      bidderOrder.indexOf(
        currentBidderId,
      ),
    );

  for (
    let offset = 1;

    offset <=
      bidderOrder.length;

    offset += 1
  ) {
    const candidate =
      bidderOrder[
        (
          currentIndex +
          offset
        ) %
          bidderOrder.length
      ];

    if (
      activeSet.has(
        candidate,
      ) &&
      candidate !==
        highestBidderId
    ) {
      return candidate;
    }
  }

  return null;
}

function validateSettlement(
  auction:
    UlsanMarbleAuctionSnapshotPayload,

  winnerPlayerId: string,

  amount: number,
): void {
  if (
    auction.currentBid !==
      amount ||
    auction.highestBidderId !==
      winnerPlayerId ||
    auction.winnerPlayerId !==
      winnerPlayerId ||
    auction.currentBidderId !==
      null ||
    auction.activeBidderIds
      .length !== 0 ||
    auction.deadlineAt !== null
  ) {
    fail(
      "경매 낙찰 결과가 올바르지 않습니다.",
    );
  }

  if (
    auction.stage ===
      "CHOOSE_DISCARD" &&
    auction.result === null
  ) {
    return;
  }

  if (
    auction.stage ===
      "RESULT" &&
    auction.result ===
      "SOLD"
  ) {
    return;
  }

  fail(
    "경매 낙찰 상태가 올바르지 않습니다.",
  );
}

export function validateAuctionActionDecidedEvent(
  game:
    ClientUlsanMarbleGameState,

  playerId: string,

  payload:
    UlsanMarbleAuctionActionDecidedPayload,
): void {
  if (
    payload.turnNumber !==
    game.turnNumber
  ) {
    fail(
      "경매 라운드 정보가 일치하지 않습니다.",
    );
  }

  if (
    payload.turnSequence !==
    game.turnSequence
  ) {
    fail(
      "경매 턴 정보가 일치하지 않습니다.",
    );
  }

  if (
    !payload.actionId ||
    !payload.auctionId
  ) {
    fail(
      "경매 이벤트 정보가 올바르지 않습니다.",
    );
  }

  validatePlayer(
    game,
    playerId,
  );

  const duplicateAction =
    game.gameEvents.some(
      (event) =>
        event.kind ===
          "AUCTION_ACTION_DECIDED" &&
        event.payload.actionId ===
          payload.actionId,
    );

  if (duplicateAction) {
    fail(
      "이미 처리된 경매 이벤트입니다.",
    );
  }

  /*
   * START
   */
  if (
    payload.action ===
    "START"
  ) {
    if (
      playerId !==
      game.activePlayerId
    ) {
      fail(
        "현재 플레이어만 경매를 시작할 수 있습니다.",
      );
    }

    const alreadyStarted =
      game.gameEvents.some(
        (event) =>
          event.kind ===
            "AUCTION_ACTION_DECIDED" &&
          event.payload.auctionId ===
            payload.auctionId,
      );

    if (alreadyStarted) {
      fail(
        "이미 시작된 경매입니다.",
      );
    }

    validateSnapshot(
      game,
      payload.auction,
    );

    if (
      payload.auctionId !==
        payload.auction.auctionId ||
      payload.auction
        .arrivalPlayerId !==
        playerId
    ) {
      fail(
        "경매 시작 정보가 일치하지 않습니다.",
      );
    }

    if (
      payload.auction
        .currentBid !== 0 ||
      payload.auction
        .highestBidderId !==
        null ||
      payload.auction
        .winnerPlayerId !==
        null ||
      !sameArray(
        payload.auction
          .eligibleBidderIds,

        payload.auction
          .activeBidderIds,
      )
    ) {
      fail(
        "경매 초기 상태가 올바르지 않습니다.",
      );
    }

    if (
      payload.auction
        .eligibleBidderIds
        .length > 0
    ) {
      if (
        payload.auction.stage !==
          "BIDDING" ||
        payload.auction
          .currentBidderId !==
          payload.auction
            .eligibleBidderIds[0]
      ) {
        fail(
          "경매 첫 응찰자 정보가 올바르지 않습니다.",
        );
      }
    } else if (
      payload.auction.stage !==
        "RESULT" ||
      payload.auction.result !==
        "UNSOLD"
    ) {
      fail(
        "경매 유찰 상태가 올바르지 않습니다.",
      );
    }

    if (
      !Number.isInteger(
        payload.nextDeck.cycle,
      ) ||
      payload.nextDeck.cycle < 1
    ) {
      fail(
        "경매 덱 정보가 올바르지 않습니다.",
      );
    }

    return;
  }

  const previous =
    findLatestAuction(
      game,
      payload.auctionId,
    );

  if (!previous) {
    fail(
      "진행 중인 경매를 찾을 수 없습니다.",
    );
  }

  /*
   * BID
   */
  if (
    payload.action === "BID"
  ) {
    if (
      previous.stage !==
        "BIDDING" ||
      previous.currentBidderId !==
        playerId ||
      payload.bidderId !==
        playerId
    ) {
      fail(
        "현재 응찰자만 입찰할 수 있습니다.",
      );
    }

    validateSnapshot(
      game,
      payload.auction,
    );

    ensureSameAuction(
      previous,
      payload.auction,
    );

    const minimumBid =
      previous.currentBid > 0
        ? previous.currentBid +
          AUCTION_MINIMUM_INCREMENT
        : AUCTION_START_PRICE;

    if (
      !Number.isInteger(
        payload.amount,
      ) ||
      payload.amount <
        minimumBid ||
      payload.amount %
        AUCTION_MINIMUM_INCREMENT !==
        0 ||
      payload.auction
        .currentBid !==
        payload.amount ||
      payload.auction
        .highestBidderId !==
        playerId
    ) {
      fail(
        "경매 입찰 금액이 올바르지 않습니다.",
      );
    }

    const nextBidder =
      calculateNextBidder(
        previous
          .eligibleBidderIds,

        previous
          .activeBidderIds,

        playerId,

        playerId,
      );

    if (nextBidder) {
      if (
        payload.auction.stage !==
          "BIDDING" ||
        payload.auction
          .currentBidderId !==
          nextBidder
      ) {
        fail(
          "다음 응찰자 정보가 올바르지 않습니다.",
        );
      }

      return;
    }

    validateSettlement(
      payload.auction,
      playerId,
      payload.amount,
    );

    return;
  }

  /*
   * PASS
   */
  if (
    payload.action === "PASS"
  ) {
    if (
      previous.stage !==
        "BIDDING" ||
      previous.currentBidderId !==
        playerId ||
      payload.bidderId !==
        playerId
    ) {
      fail(
        "현재 응찰자만 경매를 포기할 수 있습니다.",
      );
    }

    validateSnapshot(
      game,
      payload.auction,
    );

    ensureSameAuction(
      previous,
      payload.auction,
    );

    const expectedActive =
      previous.activeBidderIds.filter(
        (id) =>
          id !== playerId,
      );

    if (
      payload.auction
        .currentBid !==
        previous.currentBid ||
      payload.auction
        .highestBidderId !==
        previous.highestBidderId
    ) {
      fail(
        "경매 포기 후 입찰 금액이 변경되었습니다.",
      );
    }

    if (
      !previous.highestBidderId &&
      expectedActive.length === 0
    ) {
      if (
        payload.auction.stage !==
          "RESULT" ||
        payload.auction.result !==
          "UNSOLD"
      ) {
        fail(
          "경매 유찰 결과가 올바르지 않습니다.",
        );
      }

      return;
    }

    const nextBidder =
      calculateNextBidder(
        previous
          .eligibleBidderIds,

        expectedActive,

        playerId,

        previous
          .highestBidderId,
      );

    if (nextBidder) {
      if (
        payload.auction.stage !==
          "BIDDING" ||
        payload.auction
          .currentBidderId !==
          nextBidder ||
        !sameArray(
          payload.auction
            .activeBidderIds,

          expectedActive,
        )
      ) {
        fail(
          "경매 다음 응찰자 상태가 올바르지 않습니다.",
        );
      }

      return;
    }

    if (
      previous.highestBidderId
    ) {
      validateSettlement(
        payload.auction,

        previous
          .highestBidderId,

        previous.currentBid,
      );

      return;
    }

    fail(
      "경매 포기 결과가 올바르지 않습니다.",
    );
  }

  /*
   * DISCARD
   */
  if (
    payload.action ===
    "DISCARD"
  ) {
    if (
      previous.stage !==
        "CHOOSE_DISCARD" ||
      previous.winnerPlayerId !==
        playerId ||
      payload.playerId !==
        playerId ||
      !payload.discardInstanceId
    ) {
      fail(
        "낙찰자만 아이템을 반납할 수 있습니다.",
      );
    }

    validateSnapshot(
      game,
      payload.auction,
    );

    ensureSameAuction(
      previous,
      payload.auction,
    );

    if (
      payload.auction.stage !==
        "RESULT" ||
      payload.auction.result !==
        "SOLD" ||
      payload.auction
        .winnerPlayerId !==
        previous.winnerPlayerId ||
      payload.auction
        .currentBid !==
        previous.currentBid
    ) {
      fail(
        "경매 아이템 반납 결과가 올바르지 않습니다.",
      );
    }

    return;
  }

  /*
   * CLOSE
   */
  if (
    payload.action === "CLOSE"
  ) {
    if (
      previous.stage !==
        "RESULT" ||
      previous.arrivalPlayerId !==
        playerId ||
      payload.playerId !==
        playerId
    ) {
      fail(
        "경매 도착 플레이어만 경매 결과를 닫을 수 있습니다.",
      );
    }

    return;
  }

  fail(
    "지원하지 않는 경매 이벤트입니다.",
  );
}