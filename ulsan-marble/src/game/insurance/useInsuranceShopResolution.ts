import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { PropertyData } from "../../types";
import type {
  MoneyOperationResult,
  TransactionReason,
} from "../economy/economyTypes";
import type {
  PropertyMarketMap,
} from "../market/marketTypes";
import type {
  PropertyOwnershipMap,
} from "../property/propertyTypes";

import {
  createOrRenewInsuranceContract,
  getInsurancePremium,
  INSURANCE_PLANS,
  isInsuranceContractActive,
} from "./insuranceRules";

import type {
  InsuranceContractMap,
  InsurancePlanType,
  InsuranceShopError,
  PendingInsuranceShop,
} from "./insuranceTypes";

import type {
  UlsanMarbleArrivalContext,
  UlsanMarbleGameEventRequest,
  UlsanMarbleInsuranceActionDecidedPayload,
} from "../../../../shared/ulsanMarbleProtocol";

interface UseInsuranceShopResolutionOptions {
  pendingInsuranceShop:
    PendingInsuranceShop | null;

  setPendingInsuranceShop: Dispatch<
    SetStateAction<
      PendingInsuranceShop | null
    >
  >;

  setInsuranceShopError: Dispatch<
    SetStateAction<
      InsuranceShopError | null
    >
  >;

  insuranceContractsRef:
    MutableRefObject<InsuranceContractMap>;

  propertyOwnershipsRef:
    MutableRefObject<PropertyOwnershipMap>;

  propertyMarketRef:
    MutableRefObject<PropertyMarketMap>;

  properties: PropertyData[];

  turnNumber: number;
  turnSequence: number;

  localPlayerId: string;

  commitInsuranceContracts: (
    nextContracts:
      InsuranceContractMap,
  ) => void;

  canPlayerAfford: (
    playerId: string,
    amount: number,
  ) => boolean;

  withdraw: (
    playerId: string,
    amount: number,
    reason: TransactionReason,
    memo?: string,
  ) => MoneyOperationResult;

  completeTileResolution: () => void;

  onNetworkGameEventRequest?: (
    request:
      UlsanMarbleGameEventRequest,
  ) => void;
}

export function useInsuranceShopResolution({
  pendingInsuranceShop,
  setPendingInsuranceShop,
  setInsuranceShopError,

  insuranceContractsRef,
  propertyOwnershipsRef,
  propertyMarketRef,

  properties,

  turnNumber,
  turnSequence,

  localPlayerId,

  commitInsuranceContracts,
  canPlayerAfford,
  withdraw,

  completeTileResolution,

  onNetworkGameEventRequest,
}: UseInsuranceShopResolutionOptions) {
  const pendingShopRef =
    useRef<PendingInsuranceShop | null>(
      pendingInsuranceShop,
    );

  const pendingActionIdRef =
    useRef<string | null>(null);

  const appliedActionIdsRef =
    useRef<Set<string>>(new Set());

  const actionSequenceRef =
    useRef(0);

  useEffect(() => {
    pendingShopRef.current =
      pendingInsuranceShop;
  }, [pendingInsuranceShop]);

  const propertyMap = useMemo(
    () =>
      new Map(
        properties.map(
          (property) => [
            property.id,
            property,
          ],
        ),
      ),
    [properties],
  );

  const createActionId =
    useCallback(
      (
        visitId: string,
      ): string => {
        actionSequenceRef.current += 1;

        return [
          "INSURANCE",
          visitId,
          actionSequenceRef.current,
        ].join(":");
      },
      [],
    );

  const openInsuranceShop =
    useCallback(
      (
        playerId: string,
        tileId: number,
        arrival?:
          UlsanMarbleArrivalContext,
      ) => {
        const visitTurnSequence =
          arrival?.turnSequence ??
          turnSequence;

        const visitId =
          arrival?.arrivalId ??
          [
            "INSURANCE",
            visitTurnSequence,
            playerId,
            tileId,
          ].join(":");

        if (
          pendingShopRef.current
            ?.visitId === visitId
        ) {
          return;
        }

        const nextShop:
          PendingInsuranceShop = {
            playerId,
            visitId,
            tileId,
          };

        pendingActionIdRef.current =
          null;

        pendingShopRef.current =
          nextShop;

        setInsuranceShopError(null);

        setPendingInsuranceShop(
          nextShop,
        );
      },
      [
        setInsuranceShopError,
        setPendingInsuranceShop,
        turnSequence,
      ],
    );

  const applyInsuranceActionDecided =
    useCallback(
      (
        payload:
          UlsanMarbleInsuranceActionDecidedPayload,
      ): boolean => {

        if (
          appliedActionIdsRef.current.has(
            payload.actionId,
          )
        ) {
          return true;
        }

        const shop =
          pendingShopRef.current;

        if (
          !shop ||
          shop.playerId !==
            payload.playerId ||
          shop.visitId !==
            payload.visitId
        ) {
          return false;
        }

        if (
          payload.action === "CLOSE"
        ) {
          appliedActionIdsRef.current.add(
            payload.actionId,
          );

          if (
            pendingActionIdRef.current ===
            payload.actionId
          ) {
            pendingActionIdRef.current =
              null;
          }

          pendingShopRef.current =
            null;

          setPendingInsuranceShop(null);
          setInsuranceShopError(null);

          completeTileResolution();

          return true;
        }

        const property =
          propertyMap.get(
            payload.propertyId,
          );

        const ownership =
          propertyOwnershipsRef.current[
            payload.propertyId
          ];

        if (
          !property ||
          !ownership ||
          ownership.ownerPlayerId !==
            payload.playerId
        ) {
          setInsuranceShopError(
            "PROPERTY_NOT_OWNED",
          );

          return false;
        }

        if (
          ownership.stage === "LAND"
        ) {
          setInsuranceShopError(
            "PROPERTY_NOT_DEVELOPED",
          );

          return false;
        }

        const plan =
          INSURANCE_PLANS[
            payload.planType
          ];

        if (!plan) {
          setInsuranceShopError(
            "PLAN_NOT_FOUND",
          );

          return false;
        }

        if (
          payload.contract
            .propertyId !==
            payload.propertyId ||
          payload.contract.playerId !==
            payload.playerId ||
          payload.contract.planType !==
            payload.planType ||
          payload.contract.premiumPaid !==
            payload.premium
        ) {
          setInsuranceShopError(
            "PAYMENT_FAILED",
          );

          return false;
        }

        const paymentResult =
          withdraw(
            payload.playerId,
            payload.premium,
            "INSURANCE_PREMIUM",
            `${property.name} ${plan.name} 보험료`,
          );

        if (!paymentResult.ok) {
          setInsuranceShopError(
            paymentResult.error ===
              "INSUFFICIENT_FUNDS"
              ? "INSUFFICIENT_FUNDS"
              : "PAYMENT_FAILED",
          );

          return false;
        }

        commitInsuranceContracts({
          ...insuranceContractsRef.current,

          [payload.propertyId]: {
            propertyId:
              payload.contract
                .propertyId,

            playerId:
              payload.contract
                .playerId,

            planType:
              payload.contract
                .planType,

            premiumPaid:
              payload.contract
                .premiumPaid,

            coverageRate:
              payload.contract
                .coverageRate,

            startedTurn:
              payload.contract
                .startedTurn,

            expiresAfterTurn:
              payload.contract
                .expiresAfterTurn,
          },
        });

        setInsuranceShopError(null);

        appliedActionIdsRef.current.add(
          payload.actionId,
        );

        if (
          pendingActionIdRef.current ===
          payload.actionId
        ) {
          pendingActionIdRef.current =
            null;
        }

        return true;
      },
      [
        commitInsuranceContracts,
        completeTileResolution,
        insuranceContractsRef,
        propertyMap,
        propertyOwnershipsRef,
        setInsuranceShopError,
        setPendingInsuranceShop,
        turnNumber,
        turnSequence,
        withdraw,
      ],
    );

  const buyInsurance =
    useCallback(
      (
        propertyId: string,
        planType:
          InsurancePlanType,
      ) => {
        const shop =
          pendingShopRef.current;

        if (!shop) {
          setInsuranceShopError(
            "NO_PENDING_SHOP",
          );

          return;
        }

        if (
          onNetworkGameEventRequest &&
          shop.playerId !==
            localPlayerId
        ) {
          return;
        }

        if (
          pendingActionIdRef.current
        ) {
          return;
        }

        const plan =
          INSURANCE_PLANS[
            planType
          ];

        if (!plan) {
          setInsuranceShopError(
            "PLAN_NOT_FOUND",
          );

          return;
        }

        const property =
          propertyMap.get(
            propertyId,
          );

        const ownership =
          propertyOwnershipsRef.current[
            propertyId
          ];

        if (
          !property ||
          !ownership ||
          ownership.ownerPlayerId !==
            shop.playerId
        ) {
          setInsuranceShopError(
            "PROPERTY_NOT_OWNED",
          );

          return;
        }

        if (
          ownership.stage === "LAND"
        ) {
          setInsuranceShopError(
            "PROPERTY_NOT_DEVELOPED",
          );

          return;
        }

        const currentContract =
          insuranceContractsRef.current[
            propertyId
          ];

        if (
          isInsuranceContractActive(
            currentContract,
            turnNumber,
          ) &&
          currentContract.planType ===
            "COMPREHENSIVE" &&
          planType === "BASIC"
        ) {
          setInsuranceShopError(
            "DOWNGRADE_NOT_ALLOWED",
          );

          return;
        }

        const premium =
          getInsurancePremium(
            property,
            propertyMarketRef.current,
            planType,
          );

        if (
          !canPlayerAfford(
            shop.playerId,
            premium,
          )
        ) {
          setInsuranceShopError(
            "INSUFFICIENT_FUNDS",
          );

          return;
        }

        const nextContracts =
          createOrRenewInsuranceContract(
            insuranceContractsRef.current,
            propertyId,
            shop.playerId,
            planType,
            premium,
            turnNumber,
          );

        const contract =
          nextContracts[propertyId];

        if (!contract) {
          setInsuranceShopError(
            "PAYMENT_FAILED",
          );

          return;
        }

        const payload:
          UlsanMarbleInsuranceActionDecidedPayload =
          {
            actionId:
              createActionId(
                shop.visitId,
              ),

            playerId:
              shop.playerId,

            visitId:
              shop.visitId,

            turnNumber,
            turnSequence,

            action: "BUY",

            propertyId,
            planType,
            premium,

            contract: {
              ...contract,
            },
          };

        if (
          onNetworkGameEventRequest
        ) {
          pendingActionIdRef.current =
            payload.actionId;

          setInsuranceShopError(null);

          onNetworkGameEventRequest({
            kind:
              "INSURANCE_ACTION_DECIDED",
            payload,
          });

          return;
        }

        applyInsuranceActionDecided(
          payload,
        );
      },
      [
        applyInsuranceActionDecided,
        canPlayerAfford,
        createActionId,
        insuranceContractsRef,
        localPlayerId,
        onNetworkGameEventRequest,
        propertyMap,
        propertyMarketRef,
        propertyOwnershipsRef,
        setInsuranceShopError,
        turnNumber,
        turnSequence,
      ],
    );

  const closeInsuranceShop =
    useCallback(() => {
      const shop =
        pendingShopRef.current;

      if (!shop) return;

      if (
        onNetworkGameEventRequest &&
        shop.playerId !==
          localPlayerId
      ) {
        return;
      }

      if (
        pendingActionIdRef.current
      ) {
        return;
      }

      const payload:
        UlsanMarbleInsuranceActionDecidedPayload =
        {
          actionId:
            createActionId(
              shop.visitId,
            ),

          playerId:
            shop.playerId,

          visitId:
            shop.visitId,

          turnNumber,
          turnSequence,

          action: "CLOSE",
        };

      if (
        onNetworkGameEventRequest
      ) {
        pendingActionIdRef.current =
          payload.actionId;

        onNetworkGameEventRequest({
          kind:
            "INSURANCE_ACTION_DECIDED",
          payload,
        });

        return;
      }

      applyInsuranceActionDecided(
        payload,
      );
    }, [
      applyInsuranceActionDecided,
      createActionId,
      localPlayerId,
      onNetworkGameEventRequest,
      turnNumber,
      turnSequence,
    ]);

  const resetInsuranceShopResolution =
    useCallback(() => {
      pendingShopRef.current =
        null;

      pendingActionIdRef.current =
        null;

      appliedActionIdsRef.current.clear();

      actionSequenceRef.current =
        0;

      setPendingInsuranceShop(null);
      setInsuranceShopError(null);
    }, [
      setInsuranceShopError,
      setPendingInsuranceShop,
    ]);

  return {
    openInsuranceShop,

    buyInsurance,
    closeInsuranceShop,

    applyInsuranceActionDecided,

    resetInsuranceShopResolution,
  };
}