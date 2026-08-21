import {
  useCallback,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleArrivalContext,
  UlsanMarbleAuctionActionDecidedPayload,
  UlsanMarbleAuctionSnapshotPayload,
  UlsanMarbleGameEventRequest,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  AUCTION_MINIMUM_INCREMENT,
  AUCTION_RESPONSE_TIME_MS,
  AUCTION_START_PRICE,
  MAX_AUCTION_ITEMS_PER_PLAYER,
} from "./auctionItems";

import {
  awardAuctionItem,
  createAuctionBidderOrder,
  drawAuctionItem,
  getNextAuctionBidder,
  getPlayerAuctionItems,
  hasAuctionItem,
} from "./auctionRules";

import type {
  AuctionError,
  AuctionState,
  PendingAuction,
} from "./auctionTypes";

type WithdrawMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseAuctionResolutionOptions {
  pendingAuction:
    PendingAuction | null;

  setPendingAuction:
    Dispatch<
      SetStateAction<
        PendingAuction | null
      >
    >;

  setAuctionError:
    Dispatch<
      SetStateAction<
        AuctionError | null
      >
    >;

  auctionStateRef:
    MutableRefObject<AuctionState>;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  commitAuctionState: (
    nextState: AuctionState,
  ) => void;

  withdraw: WithdrawMoney;

  completeTileResolution:
    () => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createAuctionId(
  turnSequence: number,
  arrivalPlayerId: string,
  arrivalId?: string,
): string {
  return [
    "AUCTION",
    turnSequence,
    arrivalPlayerId,
    arrivalId ??
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
  ].join(":");
}

function createActionId(
  auctionId: string,
  action: string,
): string {
  return [
    auctionId,
    action,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join(":");
}

function toSnapshot(
  auction: PendingAuction,
): UlsanMarbleAuctionSnapshotPayload {
  return {
    ...auction,

    item: {
      ...auction.item,
    },

    eligibleBidderIds: [
      ...auction.eligibleBidderIds,
    ],

    activeBidderIds: [
      ...auction.activeBidderIds,
    ],
  };
}

function fromSnapshot(
  snapshot:
    UlsanMarbleAuctionSnapshotPayload,
): PendingAuction {
  return {
    ...snapshot,

    item: {
      ...snapshot.item,
    },

    eligibleBidderIds: [
      ...snapshot.eligibleBidderIds,
    ],

    activeBidderIds: [
      ...snapshot.activeBidderIds,
    ],
  };
}

function createSettledAuction(
  auction: PendingAuction,
  winnerPlayerId: string,
  amount: number,
  state: AuctionState,
): PendingAuction {
  const inventory =
    getPlayerAuctionItems(
      state,
      winnerPlayerId,
    );

  const needsDiscard =
    inventory.length >=
    MAX_AUCTION_ITEMS_PER_PLAYER;

  return {
    ...auction,

    currentBid: amount,

    highestBidderId:
      winnerPlayerId,

    winnerPlayerId,

    currentBidderId: null,
    activeBidderIds: [],

    result:
      needsDiscard
        ? null
        : "SOLD",

    stage:
      needsDiscard
        ? "CHOOSE_DISCARD"
        : "RESULT",

    deadlineAt: null,
  };
}

export function useAuctionResolution({
  pendingAuction,
  setPendingAuction,
  setAuctionError,

  auctionStateRef,
  playersRef,

  localPlayerId,

  turnNumber,
  turnSequence,

  commitAuctionState,
  withdraw,
  completeTileResolution,

  onNetworkGameEventRequest,
}: UseAuctionResolutionOptions) {
  const pendingAuctionRef =
    useRef<
      PendingAuction | null
    >(pendingAuction);

  pendingAuctionRef.current =
    pendingAuction;

  const appliedActionIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  /*
   * 네트워크 요청을 보낸 뒤
   * 서버 echo가 도착하기 전에
   * 동일 버튼이 여러 번 눌리는 것을 막는다.
   */
  const publishedActionIdRef =
    useRef<string | null>(
      null,
    );

  const commitPendingAuction =
    useCallback(
      (
        nextAuction:
          PendingAuction | null,
      ) => {
        pendingAuctionRef.current =
          nextAuction;

        setPendingAuction(
          nextAuction,
        );
      },
      [
        setPendingAuction,
      ],
    );

  const applyAuctionActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleAuctionActionDecidedPayload,
      ): boolean => {
        if (
          payload.turnNumber !==
            turnNumber ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        const currentAuction =
          pendingAuctionRef.current;

        /*
         * START
         */
        if (
          payload.action ===
          "START"
        ) {
          if (
            currentAuction &&
            currentAuction.auctionId !==
              payload.auctionId
          ) {
            return false;
          }

          commitAuctionState({
            ...auctionStateRef.current,

            deck: {
              cycle:
                payload.nextDeck
                  .cycle,

              drawPile:
                payload.nextDeck
                  .drawPile.map(
                    (item) => ({
                      ...item,
                    }),
                  ),
            },
          });

          commitPendingAuction(
            fromSnapshot(
              payload.auction,
            ),
          );
        }

        /*
         * BID / PASS
         */
        else if (
          payload.action ===
            "BID" ||
          payload.action ===
            "PASS"
        ) {
          if (
            !currentAuction ||
            currentAuction.auctionId !==
              payload.auctionId ||
            currentAuction.stage !==
              "BIDDING"
          ) {
            return false;
          }

          const nextAuction =
            fromSnapshot(
              payload.auction,
            );

          const settlesAuction =
            nextAuction.stage ===
              "CHOOSE_DISCARD" ||
            (
              nextAuction.stage ===
                "RESULT" &&
              nextAuction.result ===
                "SOLD"
            );

          if (settlesAuction) {
            const winnerPlayerId =
              nextAuction
                .winnerPlayerId;

            if (!winnerPlayerId) {
              return false;
            }

            /*
             * 즉시 RESULT라면
             * 아이템 지급 가능 여부를
             * 돈 차감 전에 먼저 검사.
             */
            const awardedState =
              nextAuction.stage ===
                "RESULT"
                ? awardAuctionItem(
                    auctionStateRef
                      .current,

                    winnerPlayerId,

                    nextAuction.item,
                  )
                : null;

            if (
              nextAuction.stage ===
                "RESULT" &&
              !awardedState
            ) {
              setAuctionError(
                "DUPLICATE_ITEM",
              );

              return false;
            }

            const payment =
              withdraw(
                winnerPlayerId,

                nextAuction
                  .currentBid,

                "AUCTION_PURCHASE",

                `아이템 경매 · ${nextAuction.item.itemId}`,
              );

            if (!payment.ok) {
              setAuctionError(
                "PAYMENT_FAILED",
              );

              return false;
            }

            if (awardedState) {
              commitAuctionState(
                awardedState,
              );
            }
          }

          commitPendingAuction(
            nextAuction,
          );
        }

        /*
         * DISCARD
         */
        else if (
          payload.action ===
          "DISCARD"
        ) {
          if (
            !currentAuction ||
            currentAuction.auctionId !==
              payload.auctionId ||
            currentAuction.stage !==
              "CHOOSE_DISCARD" ||
            currentAuction
              .winnerPlayerId !==
              payload.playerId
          ) {
            return false;
          }

          const nextState =
            awardAuctionItem(
              auctionStateRef.current,

              payload.playerId,

              currentAuction.item,

              payload
                .discardInstanceId,
            );

          if (!nextState) {
            setAuctionError(
              "INVALID_DISCARD",
            );

            return false;
          }

          commitAuctionState(
            nextState,
          );

          commitPendingAuction(
            fromSnapshot(
              payload.auction,
            ),
          );
        }

        /*
         * CLOSE
         */
        else {
          if (
            !currentAuction ||
            currentAuction.auctionId !==
              payload.auctionId ||
            currentAuction.stage !==
              "RESULT" ||
            currentAuction
              .arrivalPlayerId !==
              payload.playerId
          ) {
            return false;
          }

          appliedActionIdsRef.current.add(
            payload.actionId,
          );

          if (
            publishedActionIdRef.current ===
            payload.actionId
          ) {
            publishedActionIdRef.current =
              null;
          }

          commitPendingAuction(null);
          setAuctionError(null);

          completeTileResolution();

          return true;
        }

        setAuctionError(null);

        appliedActionIdsRef.current.add(
          payload.actionId,
        );

        if (
          publishedActionIdRef.current ===
          payload.actionId
        ) {
          publishedActionIdRef.current =
            null;
        }

        return true;
      },
      [
        auctionStateRef,
        commitAuctionState,
        commitPendingAuction,
        completeTileResolution,
        setAuctionError,
        turnNumber,
        turnSequence,
        withdraw,
      ],
    );

  const publishOrApply =
    useCallback(
      (
        payload:
          UlsanMarbleAuctionActionDecidedPayload,
      ): boolean => {
        if (
          publishedActionIdRef.current
        ) {
          return true;
        }

        publishedActionIdRef.current =
          payload.actionId;

        /*
         * 네트워크 모드:
         * 로컬에서 먼저 적용하지 않는다.
         * 서버 echo가 오면 적용한다.
         */
        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "AUCTION_ACTION_DECIDED",

              payload,
            });

            return true;
          } catch (error) {
            publishedActionIdRef.current =
              null;

            throw error;
          }
        }

        /*
         * 단독 실행 모드:
         * 즉시 로컬 적용.
         */
        const applied =
          applyAuctionActionDecided(
            payload,
          );

        if (!applied) {
          publishedActionIdRef.current =
            null;
        }

        return applied;
      },
      [
        applyAuctionActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const startAuctionResolution =
    useCallback(
      (
        arrivalPlayerId: string,

        arrival?:
          UlsanMarbleArrivalContext,
      ): boolean => {
        if (
          pendingAuctionRef.current ||
          publishedActionIdRef.current
        ) {
          return true;
        }

        if (
          arrival &&
          (
            arrival.playerId !==
              arrivalPlayerId ||
            arrival.turnSequence !==
              turnSequence
          )
        ) {
          return false;
        }

        /*
         * 네트워크에서는
         * 실제 도착 플레이어의 브라우저만
         * 난수를 생성한다.
         */
        if (
          onNetworkGameEventRequest &&
          arrivalPlayerId !==
            localPlayerId
        ) {
          return true;
        }

        const drawResult =
          drawAuctionItem(
            auctionStateRef.current,
          );

        const bidderIds =
          createAuctionBidderOrder(
            playersRef.current,
            arrivalPlayerId,
          );

        const auctionId =
          createAuctionId(
            turnSequence,
            arrivalPlayerId,
            arrival?.arrivalId,
          );

        const nextAuction:
          PendingAuction = {
            auctionId,

            arrivalPlayerId,

            item: {
              ...drawResult.item,
            },

            eligibleBidderIds: [
              ...bidderIds,
            ],

            activeBidderIds: [
              ...bidderIds,
            ],

            currentBidderId:
              bidderIds[0] ?? null,

            highestBidderId: null,

            currentBid: 0,

            winnerPlayerId: null,

            result:
              bidderIds.length === 0
                ? "UNSOLD"
                : null,

            stage:
              bidderIds.length === 0
                ? "RESULT"
                : "BIDDING",

            deadlineAt:
              bidderIds.length === 0
                ? null
                : Date.now() +
                  AUCTION_RESPONSE_TIME_MS,
          };

        return publishOrApply({
          action: "START",

          actionId:
            createActionId(
              auctionId,
              "START",
            ),

          auctionId,

          turnNumber,
          turnSequence,

          auction:
            toSnapshot(
              nextAuction,
            ),

          nextDeck: {
            cycle:
              drawResult
                .state.deck.cycle,

            drawPile:
              drawResult
                .state.deck
                .drawPile.map(
                  (item) => ({
                    ...item,
                  }),
                ),
          },
        });
      },
      [
        auctionStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        playersRef,
        publishOrApply,
        turnNumber,
        turnSequence,
      ],
    );

  const placeAuctionBid =
    useCallback(
      (
        amount: number,
      ): void => {
        const auction =
          pendingAuctionRef.current;

        if (
          !auction ||
          auction.stage !==
            "BIDDING"
        ) {
          setAuctionError(
            "NO_PENDING_AUCTION",
          );

          return;
        }

        const bidderId =
          auction.currentBidderId;

        if (!bidderId) {
          setAuctionError(
            "NOT_CURRENT_BIDDER",
          );

          return;
        }

        if (
          onNetworkGameEventRequest &&
          bidderId !==
            localPlayerId
        ) {
          setAuctionError(
            "NOT_CURRENT_BIDDER",
          );

          return;
        }

        const bidder =
          playersRef.current.find(
            (player) =>
              player.id ===
              bidderId,
          );

        if (!bidder) {
          setAuctionError(
            "PLAYER_NOT_FOUND",
          );

          return;
        }

        const minimumBid =
          auction.currentBid > 0
            ? auction.currentBid +
              AUCTION_MINIMUM_INCREMENT
            : AUCTION_START_PRICE;

        const safeAmount =
          Math.trunc(amount);

        if (
          safeAmount <
            minimumBid ||
          safeAmount %
            AUCTION_MINIMUM_INCREMENT !==
            0
        ) {
          setAuctionError(
            "INVALID_BID",
          );

          return;
        }

        if (
          bidder.money <
          safeAmount
        ) {
          setAuctionError(
            "INSUFFICIENT_CASH",
          );

          return;
        }

        if (
          hasAuctionItem(
            auctionStateRef.current,
            bidderId,
            auction.item.itemId,
          )
        ) {
          setAuctionError(
            "DUPLICATE_ITEM",
          );

          return;
        }

        const biddingAuction:
          PendingAuction = {
            ...auction,

            currentBid:
              safeAmount,

            highestBidderId:
              bidderId,
          };

        const nextBidderId =
          getNextAuctionBidder(
            auction
              .eligibleBidderIds,

            auction
              .activeBidderIds,

            bidderId,

            bidderId,
          );

        const nextAuction:
          PendingAuction =
          nextBidderId
            ? {
                ...biddingAuction,

                currentBidderId:
                  nextBidderId,

                deadlineAt:
                  Date.now() +
                  AUCTION_RESPONSE_TIME_MS,
              }
            : createSettledAuction(
                biddingAuction,
                bidderId,
                safeAmount,
                auctionStateRef
                  .current,
              );

        publishOrApply({
          action: "BID",

          actionId:
            createActionId(
              auction.auctionId,
              "BID",
            ),

          auctionId:
            auction.auctionId,

          turnNumber,
          turnSequence,

          bidderId,

          amount:
            safeAmount,

          auction:
            toSnapshot(
              nextAuction,
            ),
        });
      },
      [
        auctionStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        playersRef,
        publishOrApply,
        setAuctionError,
        turnNumber,
        turnSequence,
      ],
    );

  const passAuctionBid =
    useCallback(
      (): void => {
        const auction =
          pendingAuctionRef.current;

        if (
          !auction ||
          auction.stage !==
            "BIDDING"
        ) {
          setAuctionError(
            "NO_PENDING_AUCTION",
          );

          return;
        }

        const bidderId =
          auction.currentBidderId;

        if (!bidderId) {
          setAuctionError(
            "NOT_CURRENT_BIDDER",
          );

          return;
        }

        if (
          onNetworkGameEventRequest &&
          bidderId !==
            localPlayerId
        ) {
          setAuctionError(
            "NOT_CURRENT_BIDDER",
          );

          return;
        }

        const activeBidderIds =
          auction.activeBidderIds.filter(
            (id) =>
              id !== bidderId,
          );

        let nextAuction:
          PendingAuction;

        /*
         * 아무도 입찰하지 않고
         * 마지막 참가자까지 포기.
         */
        if (
          !auction.highestBidderId &&
          activeBidderIds.length === 0
        ) {
          nextAuction = {
            ...auction,

            activeBidderIds: [],

            currentBidderId: null,

            result: "UNSOLD",

            stage: "RESULT",

            deadlineAt: null,
          };
        } else {
          const nextBidderId =
            getNextAuctionBidder(
              auction
                .eligibleBidderIds,

              activeBidderIds,

              bidderId,

              auction
                .highestBidderId,
            );

          if (nextBidderId) {
            nextAuction = {
              ...auction,

              activeBidderIds,

              currentBidderId:
                nextBidderId,

              deadlineAt:
                Date.now() +
                AUCTION_RESPONSE_TIME_MS,
            };
          } else if (
            auction.highestBidderId
          ) {
            nextAuction =
              createSettledAuction(
                {
                  ...auction,
                  activeBidderIds,
                },

                auction
                  .highestBidderId,

                auction.currentBid,

                auctionStateRef
                  .current,
              );
          } else {
            nextAuction = {
              ...auction,

              activeBidderIds: [],

              currentBidderId: null,

              result: "UNSOLD",

              stage: "RESULT",

              deadlineAt: null,
            };
          }
        }

        publishOrApply({
          action: "PASS",

          actionId:
            createActionId(
              auction.auctionId,
              "PASS",
            ),

          auctionId:
            auction.auctionId,

          turnNumber,
          turnSequence,

          bidderId,

          auction:
            toSnapshot(
              nextAuction,
            ),
        });
      },
      [
        auctionStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        publishOrApply,
        setAuctionError,
        turnNumber,
        turnSequence,
      ],
    );

  const discardAuctionItemForWinner =
    useCallback(
      (
        instanceId: string,
      ): void => {
        const auction =
          pendingAuctionRef.current;

        if (
          !auction ||
          auction.stage !==
            "CHOOSE_DISCARD" ||
          !auction.winnerPlayerId
        ) {
          setAuctionError(
            "NO_PENDING_AUCTION",
          );

          return;
        }

        if (
          onNetworkGameEventRequest &&
          auction.winnerPlayerId !==
            localPlayerId
        ) {
          setAuctionError(
            "INVALID_DISCARD",
          );

          return;
        }

        /*
         * 보내기 전에
         * 폐기 가능한 아이템인지 검사.
         */
        const previewState =
          awardAuctionItem(
            auctionStateRef.current,

            auction.winnerPlayerId,

            auction.item,

            instanceId,
          );

        if (!previewState) {
          setAuctionError(
            "INVALID_DISCARD",
          );

          return;
        }

        const nextAuction:
          PendingAuction = {
            ...auction,

            result: "SOLD",

            stage: "RESULT",

            deadlineAt: null,
          };

        publishOrApply({
          action: "DISCARD",

          actionId:
            createActionId(
              auction.auctionId,
              "DISCARD",
            ),

          auctionId:
            auction.auctionId,

          turnNumber,
          turnSequence,

          playerId:
            auction.winnerPlayerId,

          discardInstanceId:
            instanceId,

          auction:
            toSnapshot(
              nextAuction,
            ),
        });
      },
      [
        auctionStateRef,
        localPlayerId,
        onNetworkGameEventRequest,
        publishOrApply,
        setAuctionError,
        turnNumber,
        turnSequence,
      ],
    );

  const closePendingAuction =
    useCallback(
      (): void => {
        const auction =
          pendingAuctionRef.current;

        if (
          !auction ||
          auction.stage !==
            "RESULT"
        ) {
          return;
        }

        /*
         * 네트워크에서는
         * 경매장에 도착한 플레이어만
         * 결과 확인을 누른다.
         */
        if (
          onNetworkGameEventRequest &&
          auction.arrivalPlayerId !==
            localPlayerId
        ) {
          return;
        }

        publishOrApply({
          action: "CLOSE",

          actionId:
            createActionId(
              auction.auctionId,
              "CLOSE",
            ),

          auctionId:
            auction.auctionId,

          turnNumber,
          turnSequence,

          playerId:
            auction.arrivalPlayerId,
        });
      },
      [
        localPlayerId,
        onNetworkGameEventRequest,
        publishOrApply,
        turnNumber,
        turnSequence,
      ],
    );

  const resetAuctionResolution =
    useCallback(
      (): void => {
        pendingAuctionRef.current =
          null;

        setPendingAuction(null);
        setAuctionError(null);

        appliedActionIdsRef.current.clear();

        publishedActionIdRef.current =
          null;
      },
      [
        setAuctionError,
        setPendingAuction,
      ],
    );

  return {
    startAuctionResolution,

    placeAuctionBid,
    passAuctionBid,
    discardAuctionItemForWinner,
    closePendingAuction,

    applyAuctionActionDecided,
    resetAuctionResolution,
  };
}