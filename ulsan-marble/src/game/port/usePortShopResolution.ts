import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  UlsanMarbleGameEventRequest,
  UlsanMarblePortActionDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

import type {
  PlayerTokenData,
} from "../../components/PlayerToken";

import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";

import {
  PORT_CONTRACTS,
  PORT_CONTRACT_DURATION_TURNS,
  addPortContract,
  createPortContract,
  getPlayerActivePortContract,
} from "./portRules";

import type {
  PendingPortShop,
  PortContractType,
  PortShopError,
  PortState,
} from "./portTypes";

type WithdrawMoney = (
  playerId: string,
  amount: number,
  reason: TransactionReason,
  memo?: string,
) => MoneyOperationResult;

interface UsePortShopResolutionOptions {
  pendingPortShop:
    PendingPortShop | null;

  setPendingPortShop: Dispatch<
    SetStateAction<
      PendingPortShop | null
    >
  >;

  setPortShopError: Dispatch<
    SetStateAction<
      PortShopError | null
    >
  >;

  portStateRef:
    MutableRefObject<PortState>;

  playersRef:
    MutableRefObject<
      PlayerTokenData[]
    >;

  localPlayerId: string;

  turnNumber: number;
  turnSequence: number;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  withdraw: WithdrawMoney;

  commitPortState: (
    nextState: PortState,
  ) => void;

  completeTileResolution:
    () => void;

  onNetworkGameEventRequest?: (
    event:
      UlsanMarbleGameEventRequest,
  ) => void;
}

function createPortActionKey(
  payload:
    UlsanMarblePortActionDecidedPayload,
): string {
  switch (payload.action) {
    case "START_CONTRACT":
      return [
        payload.visitId,
        payload.action,
        payload.contract.id,
      ].join(":");

    case "CLOSE":
      return [
        payload.visitId,
        payload.action,
      ].join(":");
  }
}

export function usePortShopResolution({
  pendingPortShop,
  setPendingPortShop,
  setPortShopError,

  portStateRef,
  playersRef,

  localPlayerId,

  turnNumber,
  turnSequence,

  canPlayerAfford,
  withdraw,

  commitPortState,
  completeTileResolution,

  onNetworkGameEventRequest,
}: UsePortShopResolutionOptions) {
  const portActionPublishRef =
    useRef<string | null>(null);

  useEffect(() => {
    portActionPublishRef.current =
      null;
  }, [
    pendingPortShop?.visitId,
  ]);

  const applyPortActionDecided =
    useCallback(
      (
        payload:
          UlsanMarblePortActionDecidedPayload,
      ): boolean => {
        /*
         * 이미 같은 계약이 반영된 경우에는
         * 중복 결제 없이 이벤트만 소비한다.
         */
        if (
          payload.action ===
          "START_CONTRACT"
        ) {
          const existingContract =
            portStateRef.current
              .activeContracts
              .find(
                (contract) =>
                  contract.id ===
                  payload.contract.id,
              );

          if (existingContract) {
            portActionPublishRef.current =
              null;

            return true;
          }
        }

        const pending =
          pendingPortShop;

        /*
         * 상대 클라이언트에서 아직
         * PORT 도착 처리가 완료되지 않았다.
         */
        if (!pending) {
          return false;
        }

        if (
          pending.playerId !==
            payload.playerId ||
          pending.visitId !==
            payload.visitId ||
          payload.turnSequence !==
            turnSequence
        ) {
          return false;
        }

        if (
          payload.action === "CLOSE"
        ) {
          portActionPublishRef.current =
            null;

          setPendingPortShop(null);
          setPortShopError(null);

          completeTileResolution();

          return true;
        }

        const {
          contract,
        } = payload;

        if (
          contract.playerId !==
            payload.playerId ||
          contract.purchasedTurn !==
            turnNumber ||
          contract.settlesAfterTurn !==
            turnNumber +
              PORT_CONTRACT_DURATION_TURNS
        ) {
          return false;
        }

        const definition =
          PORT_CONTRACTS[
            contract.type
          ];

        if (
          !definition ||
          contract.investmentAmount !==
            definition.investmentAmount
        ) {
          return false;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              payload.playerId,
          );

        if (!player) {
          portActionPublishRef.current =
            null;

          setPortShopError(
            "PLAYER_NOT_FOUND",
          );

          return true;
        }

        if (
          getPlayerActivePortContract(
            portStateRef.current,
            player.id,
          )
        ) {
          portActionPublishRef.current =
            null;

          setPortShopError(
            "ACTIVE_CONTRACT_EXISTS",
          );

          return true;
        }

        const paymentResult =
          withdraw(
            player.id,
            contract.investmentAmount,
            "PORT_INVESTMENT",
            `울산항 · ${definition.name}`,
          );

        if (!paymentResult.ok) {
          portActionPublishRef.current =
            null;

          setPortShopError(
            paymentResult.error ===
              "INSUFFICIENT_FUNDS"
              ? "INSUFFICIENT_FUNDS"
              : "PAYMENT_FAILED",
          );

          return true;
        }

        commitPortState(
          addPortContract(
            portStateRef.current,
            contract,
          ),
        );

        portActionPublishRef.current =
          null;

        setPendingPortShop(null);
        setPortShopError(null);

        completeTileResolution();

        return true;
      },
      [
        commitPortState,
        completeTileResolution,
        pendingPortShop,
        playersRef,
        portStateRef,
        setPendingPortShop,
        setPortShopError,
        turnNumber,
        turnSequence,
        withdraw,
      ],
    );

  const publishPortAction =
    useCallback(
      (
        payload:
          UlsanMarblePortActionDecidedPayload,
      ): void => {
        const requestKey =
          createPortActionKey(payload);

        if (
          portActionPublishRef.current
        ) {
          return;
        }

        portActionPublishRef.current =
          requestKey;

        if (
          onNetworkGameEventRequest
        ) {
          try {
            onNetworkGameEventRequest({
              kind:
                "PORT_ACTION_DECIDED",
              payload,
            });
          } catch (error) {
            portActionPublishRef.current =
              null;

            throw error;
          }

          return;
        }

        const applied =
          applyPortActionDecided(
            payload,
          );

        if (!applied) {
          portActionPublishRef.current =
            null;
        }
      },
      [
        applyPortActionDecided,
        onNetworkGameEventRequest,
      ],
    );

  const buyPortContract =
    useCallback(
      (
        type:
          PortContractType,
      ): void => {
        const pending =
          pendingPortShop;

        if (!pending) {
          setPortShopError(
            "NO_PENDING_PORT",
          );
          return;
        }

        if (
          onNetworkGameEventRequest &&
          pending.playerId !==
            localPlayerId
        ) {
          return;
        }

        const definition =
          PORT_CONTRACTS[type];

        if (!definition) {
          setPortShopError(
            "CONTRACT_NOT_FOUND",
          );
          return;
        }

        const player =
          playersRef.current.find(
            (candidate) =>
              candidate.id ===
              pending.playerId,
          );

        if (!player) {
          setPortShopError(
            "PLAYER_NOT_FOUND",
          );
          return;
        }

        if (
          getPlayerActivePortContract(
            portStateRef.current,
            player.id,
          )
        ) {
          setPortShopError(
            "ACTIVE_CONTRACT_EXISTS",
          );
          return;
        }

        if (
          !canPlayerAfford(
            player.id,
            definition.investmentAmount,
          )
        ) {
          setPortShopError(
            "INSUFFICIENT_FUNDS",
          );
          return;
        }

        /*
         * Date.now / Math.random이 들어간
         * 계약 ID는 구매자 화면에서 한 번만 생성한다.
         */
        const contract =
          createPortContract(
            player.id,
            type,
            turnNumber,
          );

        setPortShopError(null);

        publishPortAction({
          action:
            "START_CONTRACT",

          playerId:
            player.id,

          visitId:
            pending.visitId,

          turnSequence,

          contract,
        });
      },
      [
        canPlayerAfford,
        localPlayerId,
        onNetworkGameEventRequest,
        pendingPortShop,
        playersRef,
        portStateRef,
        publishPortAction,
        setPortShopError,
        turnNumber,
        turnSequence,
      ],
    );

  const closePortShop =
    useCallback((): void => {
      const pending =
        pendingPortShop;

      if (!pending) {
        return;
      }

      if (
        onNetworkGameEventRequest &&
        pending.playerId !==
          localPlayerId
      ) {
        return;
      }

      setPortShopError(null);

      publishPortAction({
        action: "CLOSE",

        playerId:
          pending.playerId,

        visitId:
          pending.visitId,

        turnSequence,
      });
    }, [
      localPlayerId,
      onNetworkGameEventRequest,
      pendingPortShop,
      publishPortAction,
      setPortShopError,
      turnSequence,
    ]);

  const resetPortShopResolution =
    useCallback((): void => {
      portActionPublishRef.current =
        null;

      setPendingPortShop(null);
      setPortShopError(null);
    }, [
      setPendingPortShop,
      setPortShopError,
    ]);

  return {
    buyPortContract,
    closePortShop,

    applyPortActionDecided,
    resetPortShopResolution,
  };
}