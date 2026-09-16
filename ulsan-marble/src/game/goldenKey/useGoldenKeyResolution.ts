import {useCallback,useRef,type Dispatch,type SetStateAction,} from "react";
import type {PlayerTokenData,} from "../../components/PlayerToken";
import type {BoardTile,PropertyData,} from "../../types";
import type {MoneyOperationResult,TransactionReason,} from "../economy/economyTypes";
import {getPolicySalary,} from "../election/policyEffects";
import type {PropertyMarketMap,} from "../market/marketTypes";
import type {PropertyOwnershipMap,} from "../property/propertyTypes";
import {getPortfolioMarketValue,} from "../stock/stockMarket";
import type {StockCompanyData,StockMarketMap,StockPortfolioMap,} from "../stock/stockTypes";
import {
  applyGoldenKeyPropertyMarketRate,
  applyGoldenKeyStockMarketRate,
  getGoldenKeyCashPercentageAmount,
  getGoldenKeyPropertyMarketTargets,
  getGoldenKeyRelativePosition,
  getGoldenKeyStockMarketTargets,
  getNearestForwardTilePosition,
  getNextEligiblePlayer,
  getOwnedPropertyCurrentValue,
  getRandomPropertyTilePosition,
} from "./goldenKeyRules";
import type {PendingGoldenKeyResolution,} from "./goldenKeyTypes";
import type {
  UlsanMarbleGameEventRequest,
  UlsanMarbleGoldenKeyAppliedPayload,
  UlsanMarbleGoldenKeyConfirmedPayload,
  UlsanMarbleArrivalContext,
} from "../../../../shared/ulsanMarbleProtocol";

type ValueRef<T> = {
  current: T;
};

type PlayerMoneyAction = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

type TransferMoneyAction = (
  fromPlayerId: string,
  toPlayerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UseGoldenKeyResolutionOptions {
  pendingGoldenKey:
    PendingGoldenKeyResolution | null;

  setPendingGoldenKey: Dispatch<
    SetStateAction<
      PendingGoldenKeyResolution | null
    >
  >;

  playersRef:
    ValueRef<PlayerTokenData[]>;

  propertyOwnershipsRef:
    ValueRef<PropertyOwnershipMap>;

  propertyMarketRef:
    ValueRef<PropertyMarketMap>;

  stockPortfoliosRef:
    ValueRef<StockPortfolioMap>;

  stockMarketRef:
    ValueRef<StockMarketMap>;

  properties: PropertyData[];
  stockCompanies: StockCompanyData[];
  tiles: BoardTile[];

  baseSalary: number;

  activeMayorPolicy:
    Parameters<typeof getPolicySalary>[1];

  turnNumber: number;
  turnSequence: number;
  
  commitPlayers: (
    players: PlayerTokenData[],
  ) => void;

  commitPropertyMarket: (
    market: PropertyMarketMap,
  ) => void;

  commitStockMarket: (
    market: StockMarketMap,
  ) => void;

  deposit: PlayerMoneyAction;
  withdraw: PlayerMoneyAction;
  transfer: TransferMoneyAction;

  resolveArrivalTile: (
    position: number,
    playerId: string,
    arrival?: UlsanMarbleArrivalContext,
  ) => void;

  localPlayerId: string;

  onNetworkGameEventRequest?: (
    event: UlsanMarbleGameEventRequest,
  ) => void;

  completeTileResolution: () => void;
}

export function useGoldenKeyResolution({
  pendingGoldenKey,
  setPendingGoldenKey,

  localPlayerId,
  onNetworkGameEventRequest,

  playersRef,
  propertyOwnershipsRef,
  propertyMarketRef,
  stockPortfoliosRef,
  stockMarketRef,

  properties,
  stockCompanies,
  tiles,

  baseSalary,
  activeMayorPolicy,
  turnNumber,
  turnSequence,

  commitPlayers,
  commitPropertyMarket,
  commitStockMarket,

  deposit,
  withdraw,
  transfer,

  resolveArrivalTile,
  completeTileResolution,
}: UseGoldenKeyResolutionOptions) {

  const publishingGoldenKeyRef = useRef<string | null>(null);  
  const confirmingGoldenKeyRef = useRef<string | null>(null);

  const applyNetworkGoldenKeyApplied = useCallback(
    (
      payload: UlsanMarbleGoldenKeyAppliedPayload,
    ): boolean => {
      if (
        !pendingGoldenKey ||
        pendingGoldenKey.stage !== "DRAWN"
      ) {
        return false;
      }

      if (
        pendingGoldenKey.playerId !==
          payload.playerId ||
        pendingGoldenKey.card.id !==
          payload.cardId
      ) {
        return false;
      }

      const effect =
        pendingGoldenKey.card.effect;

      if (
        payload.propertyMarketTargetIds.length > 0 &&
        effect.type !== "PROPERTY_MARKET"
      ) {
        console.error(
          "[UlsanMarble] 부동산 시장 대상과 카드 효과가 일치하지 않습니다.",
          payload,
        );
        return true;
      }

      if (
        payload.stockMarketTargetIds.length > 0 &&
        effect.type !== "STOCK_MARKET"
      ) {
        console.error(
          "[UlsanMarble] 주식 시장 대상과 카드 효과가 일치하지 않습니다.",
          payload,
        );
        return true;
      }

      for (
        const operation of
        payload.moneyOperations
      ) {
        let result: MoneyOperationResult;

        switch (operation.kind) {
          case "DEPOSIT":
            result = deposit(
              operation.playerId,
              operation.amount,
              "EVENT",
              `황금열쇠 · ${pendingGoldenKey.card.title}`,
            );
            break;

          case "WITHDRAW":
            result = withdraw(
              operation.playerId,
              operation.amount,
              "EVENT",
              `황금열쇠 · ${pendingGoldenKey.card.title}`,
            );
            break;

          case "TRANSFER":
            result = transfer(
              operation.fromPlayerId,
              operation.toPlayerId,
              operation.amount,
              "EVENT",
              `황금열쇠 · ${pendingGoldenKey.card.title}`,
            );
            break;

          default:
            return true;
        }

        if (!result.ok) {
          console.error(
            "[UlsanMarble] 황금열쇠 금액 적용 실패",
            operation,
          );
          return true;
        }
      }

      if (
        payload.playerPatches.length > 0
      ) {
        const patchMap = new Map(
          payload.playerPatches.map(
            (patch) => [
              patch.playerId,
              patch,
            ],
          ),
        );

        const nextPlayers =
          playersRef.current.map(
            (player) => {
              const patch =
                patchMap.get(player.id);

              if (!patch) {
                return player;
              }

              return {
                ...player,

                ...(patch.position !== undefined
                  ? {
                      position:
                        patch.position,
                    }
                  : {}),

                ...(patch.jailEscapeCards !==
                undefined
                  ? {
                      jailEscapeCards:
                        patch.jailEscapeCards,
                    }
                  : {}),
              };
            },
          );

        commitPlayers(nextPlayers);
      }

      if (
        effect.type === "PROPERTY_MARKET" &&
        payload.propertyMarketTargetIds
          .length > 0
      ) {
        const nextMarket =
          applyGoldenKeyPropertyMarketRate(
            properties,
            propertyMarketRef.current,
            effect.rate,
            turnNumber,
            payload.propertyMarketTargetIds,
          );

        commitPropertyMarket(nextMarket);
      }

      if (
        effect.type === "STOCK_MARKET" &&
        payload.stockMarketTargetIds
          .length > 0
      ) {
        const nextMarket =
          applyGoldenKeyStockMarketRate(
            stockCompanies,
            stockMarketRef.current,
            effect.rate,
            payload.stockMarketTargetIds,
          );

        commitStockMarket(nextMarket);
      }

      setPendingGoldenKey((current) => {
        if (
          !current ||
          current.playerId !== payload.playerId ||
          current.card.id !== payload.cardId
        ) {
          return current;
        }

        return {
          ...current,
          stage: "RESOLVED",
          resultText: payload.resultText,
          followUpPosition: payload.followUpPosition,
        };
      });

      const requestKey =
        `${payload.playerId}:${payload.cardId}`;

      if (
        publishingGoldenKeyRef.current ===
        requestKey
      ) {
        publishingGoldenKeyRef.current = null;
      }

      return true;
    },
    [
      commitPlayers,
      commitPropertyMarket,
      commitStockMarket,
      deposit,
      pendingGoldenKey,
      playersRef,
      properties,
      propertyMarketRef,
      setPendingGoldenKey,
      stockCompanies,
      stockMarketRef,
      transfer,
      turnNumber,
      withdraw,
    ],
  );

  const applyPendingGoldenKey = useCallback(() => {
    if (
      !pendingGoldenKey ||
      pendingGoldenKey.stage !== "DRAWN"
    ) {
      return;
    }

    /*
    * 온라인에서는 해당 카드를 뽑은
    * 본인 클라이언트만 적용 결과를 확정한다.
    */
    if (
      onNetworkGameEventRequest &&
      pendingGoldenKey.playerId !==
        localPlayerId
    ) {
      return;
    }

    const player =
      playersRef.current.find(
        (candidate) =>
          candidate.id ===
          pendingGoldenKey.playerId,
      );

    if (!player) {
      console.error(
        "[UlsanMarble] 황금열쇠 적용 플레이어를 찾지 못했습니다.",
        pendingGoldenKey.playerId,
      );
      return;
    }

    const requestKey =
      `${player.id}:${pendingGoldenKey.card.id}`;

    if (
      publishingGoldenKeyRef.current ===
      requestKey
    ) {
      return;
    }

    const effect =
      pendingGoldenKey.card.effect;

    const moneyOperations:
      UlsanMarbleGoldenKeyAppliedPayload[
        "moneyOperations"
      ] = [];

    const playerPatches:
      UlsanMarbleGoldenKeyAppliedPayload[
        "playerPatches"
      ] = [];

    const propertyMarketTargetIds:
      string[] = [];

    const stockMarketTargetIds:
      string[] = [];

    let resultText =
      pendingGoldenKey.card.description;

    let followUpPosition:
      number | null = null;

    switch (effect.type) {
      case "CASH": {
        if (effect.amount > 0) {
          moneyOperations.push({
            kind: "DEPOSIT",
            playerId: player.id,
            amount: effect.amount,
          });
        }

        resultText =
          `${effect.amount.toLocaleString("ko-KR")}` +
          "만원을 받았습니다.";
        break;
      }

      case "CASH_PERCENT": {
        const amount =
          getGoldenKeyCashPercentageAmount(
            player.money,
            effect.rate,
            effect.maximumAmount,
          );

        if (amount > 0) {
          moneyOperations.push({
            kind: "WITHDRAW",
            playerId: player.id,
            amount,
          });
        }

        resultText =
          `${amount.toLocaleString("ko-KR")}` +
          "만원을 납부했습니다.";
        break;
      }

      case "EACH_PLAYER_TRANSFER": {
        const opponents =
          playersRef.current.filter(
            (candidate) =>
              candidate.id !== player.id &&
              !candidate.isBankrupt,
          );

        let totalAmount = 0;

        if (
          effect.direction ===
          "FROM_OTHERS"
        ) {
          for (const opponent of opponents) {
            const amount = Math.min(
              effect.amountPerPlayer,
              Math.max(0, opponent.money),
            );

            if (amount <= 0) continue;

            moneyOperations.push({
              kind: "TRANSFER",
              fromPlayerId: opponent.id,
              toPlayerId: player.id,
              amount,
            });

            totalAmount += amount;
          }

          resultText =
            "다른 플레이어들에게서 총 " +
            `${totalAmount.toLocaleString("ko-KR")}` +
            "만원을 받았습니다.";
        } else {
          const amountPerPlayer =
            opponents.length === 0
              ? 0
              : Math.min(
                  effect.amountPerPlayer,
                  Math.floor(
                    Math.max(0, player.money) /
                      opponents.length,
                  ),
                );

          for (const opponent of opponents) {
            if (amountPerPlayer <= 0) break;

            moneyOperations.push({
              kind: "TRANSFER",
              fromPlayerId: player.id,
              toPlayerId: opponent.id,
              amount: amountPerPlayer,
            });

            totalAmount += amountPerPlayer;
          }

          resultText =
            "다른 플레이어들에게 총 " +
            `${totalAmount.toLocaleString("ko-KR")}` +
            "만원을 지급했습니다.";
        }

        break;
      }

      case "ALL_PLAYERS_CASH": {
        const eligiblePlayers =
          playersRef.current.filter(
            (candidate) =>
              !candidate.isBankrupt,
          );

        if (effect.amount > 0) {
          for (
            const candidate of
            eligiblePlayers
          ) {
            moneyOperations.push({
              kind: "DEPOSIT",
              playerId: candidate.id,
              amount: effect.amount,
            });
          }
        }

        resultText =
          `정상 플레이어 ${eligiblePlayers.length}명이 각각 ` +
          `${effect.amount.toLocaleString("ko-KR")}` +
          "만원을 받았습니다.";
        break;
      }

      case "PORTFOLIO_REWARD": {
        const portfolioValue =
          getPortfolioMarketValue(
            stockPortfoliosRef.current[
              player.id
            ],
            stockMarketRef.current,
          );

        const amount = Math.min(
          effect.maximumAmount,
          Math.max(
            effect.minimumAmount,
            Math.round(
              portfolioValue *
                effect.rate,
            ),
          ),
        );

        if (amount > 0) {
          moneyOperations.push({
            kind: "DEPOSIT",
            playerId: player.id,
            amount,
          });
        }

        resultText =
          "주식 평가액 " +
          `${portfolioValue.toLocaleString("ko-KR")}` +
          "만원을 기준으로 " +
          `${amount.toLocaleString("ko-KR")}` +
          "만원을 받았습니다.";
        break;
      }

      case "PROPERTY_REWARD": {
        const propertyValue =
          getOwnedPropertyCurrentValue(
            player.id,
            properties,
            propertyOwnershipsRef.current,
            propertyMarketRef.current,
          );

        const amount = Math.min(
          effect.maximumAmount,
          Math.max(
            effect.minimumAmount,
            Math.round(
              propertyValue *
                effect.rate,
            ),
          ),
        );

        if (amount > 0) {
          moneyOperations.push({
            kind: "DEPOSIT",
            playerId: player.id,
            amount,
          });
        }

        resultText =
          "부동산 평가액 " +
          `${propertyValue.toLocaleString("ko-KR")}` +
          "만원을 기준으로 " +
          `${amount.toLocaleString("ko-KR")}` +
          "만원을 받았습니다.";
        break;
      }

      case "PROPERTY_MARKET": {
        const targets =
          getGoldenKeyPropertyMarketTargets(
            properties,
            propertyOwnershipsRef.current,
            player.id,
            effect.scope,
            effect.count,
          );

        if (targets.ids.length === 0) {
          resultText =
            "효과를 적용할 부동산이 없어 시세가 변동하지 않았습니다.";
          break;
        }

        propertyMarketTargetIds.push(
          ...targets.ids,
        );

        resultText =
          `${targets.label} 시세가 ` +
          `${effect.rate > 0 ? "+" : ""}` +
          `${(effect.rate * 100).toFixed(0)}% 변동했습니다.`;
        break;
      }

      case "STOCK_MARKET": {
        const targets =
          getGoldenKeyStockMarketTargets(
            stockCompanies,
            stockPortfoliosRef.current,
            player.id,
            effect.scope,
            effect.count,
          );

        if (targets.ids.length === 0) {
          resultText =
            "효과를 적용할 보유 종목이 없어 주가가 변동하지 않았습니다.";
          break;
        }

        stockMarketTargetIds.push(
          ...targets.ids,
        );

        resultText =
          `${targets.label} 주가가 ` +
          `${effect.rate > 0 ? "+" : ""}` +
          `${(effect.rate * 100).toFixed(0)}% 변동했습니다.`;
        break;
      }

      case "JAIL_ESCAPE_CARD": {
        const quantity = Math.max(
          1,
          Math.trunc(effect.quantity),
        );

        playerPatches.push({
          playerId: player.id,
          jailEscapeCards:
            Math.max(
              0,
              player.jailEscapeCards ?? 0,
            ) + quantity,
        });

        resultText =
          `구치소 탈출권 ${quantity}장을 보관했습니다.`;
        break;
      }

      case "MOVE_TO_TILE": {
        const targetPosition = Math.min(
          Math.max(
            Math.trunc(effect.tileId),
            0,
          ),
          Math.max(
            tiles.length - 1,
            0,
          ),
        );

        playerPatches.push({
          playerId: player.id,
          position: targetPosition,
        });

        followUpPosition =
          targetPosition;

        if (effect.grantSalary) {
          const salaryAmount =
            getPolicySalary(
              baseSalary,
              activeMayorPolicy,
              player.completedLaps ?? 0,
            );
            
          if (salaryAmount > 0) {
            moneyOperations.push({
              kind: "DEPOSIT",
              playerId: player.id,
              amount: salaryAmount,
            });
          }

          resultText =
            `${tiles[targetPosition]?.name ?? "목적지"}로 이동하고 ` +
            `${salaryAmount.toLocaleString("ko-KR")}` +
            "만원을 받았습니다.";
        } else {
          resultText =
            `${tiles[targetPosition]?.name ?? "목적지"}로 이동했습니다.`;
        }

        break;
      }

      case "MOVE_RELATIVE": {
        const targetPosition =
          getGoldenKeyRelativePosition(
            player.position,
            effect.steps,
            tiles.length,
          );

        playerPatches.push({
          playerId: player.id,
          position: targetPosition,
        });

        followUpPosition =
          targetPosition;

        resultText =
          `${effect.steps > 0 ? "앞으로" : "뒤로"} ` +
          `${Math.abs(effect.steps)}칸 이동해 ` +
          `${tiles[targetPosition]?.name ?? `${targetPosition}번 칸`}` +
          "에 도착했습니다.";
        break;
      }

      case "MOVE_RANDOM_PROPERTY": {
        const targetPosition =
          getRandomPropertyTilePosition(
            tiles,
            propertyOwnershipsRef.current,
            effect.unownedOnly,
          );

        if (targetPosition === null) {
          resultText =
            effect.unownedOnly
              ? "미소유 부동산이 없어 현재 위치에 머뭅니다."
              : "이동할 일반 부동산이 없어 현재 위치에 머뭅니다.";
          break;
        }

        playerPatches.push({
          playerId: player.id,
          position: targetPosition,
        });

        followUpPosition =
          targetPosition;

        resultText =
          `${tiles[targetPosition]?.name ?? "무작위 부동산"}으로 이동했습니다.`;
        break;
      }

      case "MOVE_NEAREST_TILE_TYPE": {
        const targetPosition =
          getNearestForwardTilePosition(
            tiles,
            player.position,
            effect.tileType,
          );

        if (targetPosition === null) {
          resultText =
            "이동할 목적지가 없어 현재 위치에 머뭅니다.";
          break;
        }

        playerPatches.push({
          playerId: player.id,
          position: targetPosition,
        });

        followUpPosition =
          targetPosition;

        resultText =
          `${tiles[targetPosition]?.name ?? `${targetPosition}번 칸`}` +
          "으로 이동했습니다.";
        break;
      }

      case "SWAP_WITH_NEXT_PLAYER": {
        const targetPlayer =
          getNextEligiblePlayer(
            playersRef.current,
            player.id,
          );

        if (!targetPlayer) {
          resultText =
            "위치를 교환할 다른 정상 플레이어가 없습니다.";
          break;
        }

        playerPatches.push(
          {
            playerId: player.id,
            position:
              targetPlayer.position,
          },
          {
            playerId:
              targetPlayer.id,
            position:
              player.position,
          },
        );

        resultText =
          `${targetPlayer.name}과 위치를 교환했습니다. ` +
          "도착 효과는 발생하지 않습니다.";
        break;
      }
    }

    const payload:
      UlsanMarbleGoldenKeyAppliedPayload = {
        playerId: player.id,
        cardId:
          pendingGoldenKey.card.id,

        moneyOperations,
        playerPatches,

        propertyMarketTargetIds,
        stockMarketTargetIds,

        resultText,
        followUpPosition,
      };

    publishingGoldenKeyRef.current =
      requestKey;

    if (onNetworkGameEventRequest) {
      try {
        onNetworkGameEventRequest({
          kind: "GOLDEN_KEY_APPLIED",
          payload,
        });
      } catch (error) {
        publishingGoldenKeyRef.current =
          null;
        throw error;
      }

      return;
    }

    /*
    * 단독 실행 모드에서는 같은 확정 payload를
    * 네트워크 수신 함수에 직접 전달한다.
    */
    const applied =
      applyNetworkGoldenKeyApplied(
        payload,
      );

    if (!applied) {
      publishingGoldenKeyRef.current =
        null;
    }
  }, [
    activeMayorPolicy,
    applyNetworkGoldenKeyApplied,
    baseSalary,
    localPlayerId,
    onNetworkGameEventRequest,
    pendingGoldenKey,
    playersRef,
    properties,
    propertyMarketRef,
    propertyOwnershipsRef,
    stockCompanies,
    stockMarketRef,
    stockPortfoliosRef,
    tiles,
  ]);  

  const applyNetworkGoldenKeyConfirmed = useCallback(
    (payload: UlsanMarbleGoldenKeyConfirmedPayload): boolean => {
      if (
        !pendingGoldenKey ||
        pendingGoldenKey.stage !== "RESOLVED"
      ) {
        return false;
      }

      if (
        payload.turnSequence !== turnSequence ||
        payload.playerId !== pendingGoldenKey.playerId ||
        payload.cardId !== pendingGoldenKey.card.id
      ) {
        return false;
      }

      const { followUpPosition, playerId, card } = pendingGoldenKey;
      const requestKey = `${payload.turnSequence}:${payload.playerId}:${payload.cardId}`;

      setPendingGoldenKey(null);

      if (confirmingGoldenKeyRef.current === requestKey) {
        confirmingGoldenKeyRef.current = null;
      }

      if (followUpPosition !== null) {
        const goldenKeyArrival: UlsanMarbleArrivalContext = {
          arrivalId: `GOLDEN_KEY:${payload.turnSequence}:${card.id}`,
          cause: "GOLDEN_KEY",
          playerId,
          position: followUpPosition,
          turnSequence: payload.turnSequence,
        };

        resolveArrivalTile(
          followUpPosition,
          playerId,
          goldenKeyArrival,
        );

        return true;
      }

      console.log(
        "[GK CONFIRMED COMPLETE TILE]",
        {
          playerId,
          cardId: card.id,
          turnSequence:
            payload.turnSequence,
          followUpPosition,
        },
      );

      completeTileResolution();
      return true;
    },
    [
      completeTileResolution,
      pendingGoldenKey,
      resolveArrivalTile,
      setPendingGoldenKey,
      turnSequence,
    ],
  );  

  const closePendingGoldenKey = useCallback(() => {
    if (
      !pendingGoldenKey ||
      pendingGoldenKey.stage !== "RESOLVED" ||
      pendingGoldenKey.playerId !== localPlayerId
    ) {
      return;
    }

    const payload: UlsanMarbleGoldenKeyConfirmedPayload = {
      playerId: pendingGoldenKey.playerId,
      cardId: pendingGoldenKey.card.id,
      turnSequence,
    };

    const requestKey =
      `${payload.turnSequence}:${payload.playerId}:${payload.cardId}`;

    if (confirmingGoldenKeyRef.current === requestKey) {
      return;
    }

    confirmingGoldenKeyRef.current = requestKey;

    if (onNetworkGameEventRequest) {
      try {
        onNetworkGameEventRequest({
          kind: "GOLDEN_KEY_CONFIRMED",
          payload,
        });
      } catch (error) {
        confirmingGoldenKeyRef.current = null;
        throw error;
      }

      return;
    }

    const applied =
      applyNetworkGoldenKeyConfirmed(payload);

    if (!applied) {
      confirmingGoldenKeyRef.current = null;
    }
  }, [
    applyNetworkGoldenKeyConfirmed,
    localPlayerId,
    onNetworkGameEventRequest,
    pendingGoldenKey,
    turnSequence,
  ]);

  return {
    applyPendingGoldenKey,
    applyNetworkGoldenKeyApplied,
    applyNetworkGoldenKeyConfirmed,
    closePendingGoldenKey,
  };
}  