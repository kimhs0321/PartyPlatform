import type {
  PortContract,
  PortContractDefinition,
  PortContractType,
  PortSettlementModifier,
  PortSettlementResult,
  PortState,
} from "./portTypes";

export const PORT_CONTRACT_DURATION_TURNS = 3;
export const PORT_TYPHOON_CHANCE_DELTA = -0.15;
export const PORT_SHIPBUILDING_UP_CHANCE_DELTA = 0.05;
export const MAX_PORT_SETTLEMENT_HISTORY = 24;

export const PORT_CONTRACTS: Record<PortContractType, PortContractDefinition> = {
  COASTAL: {
    type: "COASTAL",
    name: "국내 연안 운송",
    description: "낮은 위험으로 짧은 연안 운송 계약을 체결합니다.",
    investmentAmount: 100,
    baseSuccessChance: 0.8,
    successPayout: 140,
    failurePayout: 50,
  },
  EAST_ASIA: {
    type: "EAST_ASIA",
    name: "동아시아 수출",
    description: "중간 위험과 수익의 동아시아 수출 계약입니다.",
    investmentAmount: 200,
    baseSuccessChance: 0.6,
    successPayout: 340,
    failurePayout: 80,
  },
  OCEAN: {
    type: "OCEAN",
    name: "대양 수출",
    description: "높은 위험을 감수하고 큰 수익을 노리는 장거리 계약입니다.",
    investmentAmount: 300,
    baseSuccessChance: 0.4,
    successPayout: 6_50,
    failurePayout: 0,
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function createInitialPortState(): PortState {
  return {
    activeContracts: [],
    settlementHistory: [],
  };
}

export function getPlayerActivePortContract(
  state: PortState,
  playerId: string,
): PortContract | null {
  return (
    state.activeContracts.find((contract) => contract.playerId === playerId) ??
    null
  );
}

export function createPortContract(
  playerId: string,
  type: PortContractType,
  purchasedTurn: number,
): PortContract {
  const definition = PORT_CONTRACTS[type];

  return {
    id: `port-${playerId}-${purchasedTurn}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    playerId,
    type,
    purchasedTurn,
    settlesAfterTurn: purchasedTurn + PORT_CONTRACT_DURATION_TURNS,
    investmentAmount: definition.investmentAmount,
  };
}

export function addPortContract(
  state: PortState,
  contract: PortContract,
): PortState {
  return {
    ...state,
    activeContracts: [...state.activeContracts, contract],
  };
}

export function removePlayerPortContracts(
  state: PortState,
  playerId: string,
): PortState {
  const activeContracts = state.activeContracts.filter(
    (contract) => contract.playerId !== playerId,
  );

  if (activeContracts.length === state.activeContracts.length) return state;

  return {
    ...state,
    activeContracts,
  };
}

export function getDuePortContracts(
  state: PortState,
  turnNumber: number,
  disabledPlayerIds: string[] = [],
): PortContract[] {
  const disabledSet = new Set(disabledPlayerIds);

  return state.activeContracts.filter(
    (contract) =>
      contract.settlesAfterTurn <= turnNumber &&
      !disabledSet.has(contract.playerId),
  );
}

export function settlePortContracts(
  state: PortState,
  contracts: PortContract[],
  options: {
    typhoonActive: boolean;
    shipbuildingTrendUp: boolean;
    economicNewsChanceDelta?: number;
    cityHallChanceDelta?: number;
    random?: () => number;
  },
): { state: PortState; results: PortSettlementResult[] } {
  const random = options.random ?? Math.random;
  const settledIds = new Set(contracts.map((contract) => contract.id));
  const results = contracts.map((contract) => {
    const definition = PORT_CONTRACTS[contract.type];
    const modifiers: PortSettlementModifier[] = [];

    if (options.typhoonActive) {
      modifiers.push({
        type: "TYPHOON",
        label: "태풍 영향",
        chanceDelta: PORT_TYPHOON_CHANCE_DELTA,
      });
    }

    if (options.shipbuildingTrendUp) {
      modifiers.push({
        type: "SHIPBUILDING_UP",
        label: "조선·해양 테마 상승",
        chanceDelta: PORT_SHIPBUILDING_UP_CHANCE_DELTA,
      });
    }

    if (options.economicNewsChanceDelta) {
      modifiers.push({
        type: "ECONOMIC_NEWS",
        label: "경제신문 영향",
        chanceDelta: options.economicNewsChanceDelta,
      });
    }

    if (options.cityHallChanceDelta) {
      modifiers.push({
        type: "CITY_HALL",
        label: "울산시청 시정사업",
        chanceDelta: options.cityHallChanceDelta,
      });
    }

    const finalSuccessChance = clamp(
      definition.baseSuccessChance +
        modifiers.reduce((sum, modifier) => sum + modifier.chanceDelta, 0),
      0.05,
      0.95,
    );
    const success = random() < finalSuccessChance;
    const payoutAmount = success
      ? definition.successPayout
      : definition.failurePayout;

    return {
      contract,
      definition,
      success,
      finalSuccessChance,
      modifiers,
      payoutAmount,
      netProfit: payoutAmount - contract.investmentAmount,
    };
  });

  return {
    state: {
      activeContracts: state.activeContracts.filter(
        (contract) => !settledIds.has(contract.id),
      ),
      settlementHistory: [
        ...results,
        ...state.settlementHistory,
      ].slice(0, MAX_PORT_SETTLEMENT_HISTORY),
    },
    results,
  };
}
