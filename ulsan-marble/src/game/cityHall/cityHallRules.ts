import type { TaxAssessment } from "../economy/taxTypes";
import type { PropertyDevelopmentStage } from "../property/propertyTypes";
import {
  CITY_HALL_PROJECT_CATEGORY_LABELS,
  CITY_HALL_PROJECTS,
} from "./cityHallProjects";
import type {
  CityHallApplicationType,
  CityHallPlayerBenefits,
  CityHallProjectCategory,
  CityHallProjectDefinition,
  CityHallProjectTerm,
  CityHallState,
} from "./cityHallTypes";

const MAX_CITY_HALL_HISTORY = 20;

export const CITY_HALL_DEVELOPMENT_SUPPORT_RATE = 0.3;
export const CITY_HALL_PROPERTY_TAX_SUPPORT_RATE = 0.3;

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const currentItem = result[index];
    const targetItem = result[target];
    if (currentItem === undefined || targetItem === undefined) continue;
    result[index] = targetItem;
    result[target] = currentItem;
  }

  return result;
}

function createEmptyPlayerBenefits(): CityHallPlayerBenefits {
  return {
    developmentSupport: null,
    propertyTaxSupport: null,
  };
}

function getPlayerBenefits(
  state: CityHallState,
  playerId: string,
): CityHallPlayerBenefits {
  return state.playerBenefits[playerId] ?? createEmptyPlayerBenefits();
}

function updateTermById(
  state: CityHallState,
  instanceId: string,
  updater: (term: CityHallProjectTerm) => CityHallProjectTerm,
): CityHallState {
  return {
    ...state,
    currentTerm:
      state.currentTerm?.instanceId === instanceId
        ? updater(state.currentTerm)
        : state.currentTerm,
    scheduledTerm:
      state.scheduledTerm?.instanceId === instanceId
        ? updater(state.scheduledTerm)
        : state.scheduledTerm,
  };
}

export function createInitialCityHallState(): CityHallState {
  return {
    currentTerm: null,
    scheduledTerm: null,
    history: [],
    playerBenefits: {},
  };
}

export function getCityHallProjectCategoryLabel(
  category: CityHallProjectCategory,
): string {
  return CITY_HALL_PROJECT_CATEGORY_LABELS[category];
}

export function getActiveCityHallTerm(
  state: CityHallState,
  turnNumber: number,
): CityHallProjectTerm | null {
  const current = state.currentTerm;
  if (
    current &&
    turnNumber >= current.activeFromTurn &&
    turnNumber <= current.expiresAfterTurn
  ) {
    return current;
  }

  return null;
}

export function getScheduledCityHallTerm(
  state: CityHallState,
  turnNumber: number,
): CityHallProjectTerm | null {
  const scheduled = state.scheduledTerm;
  if (!scheduled || turnNumber >= scheduled.activeFromTurn) return null;
  return scheduled;
}

/**
 * 이전 선택형 UI와 개발자 도구의 호환을 위한 후보 생성 함수입니다.
 * 실제 시청 도착 처리에서는 activateRandomCityHallProject를 사용합니다.
 */
export function createCityHallProjectCandidates(
  excludedProjectIds: string[] = [],
  random: () => number = Math.random,
): CityHallProjectDefinition[] {
  const excluded = new Set(excludedProjectIds);
  const availableProjects = CITY_HALL_PROJECTS.filter(
    (project) => !excluded.has(project.id),
  );
  const categories = shuffle(
    [...new Set(availableProjects.map((project) => project.category))],
    random,
  ).slice(0, 3);

  return categories.flatMap((category) => {
    const candidates = availableProjects.filter(
      (project) => project.category === category,
    );
    const selected = candidates[Math.floor(random() * candidates.length)];
    return selected ? [selected] : [];
  });
}

export function activateRandomCityHallProject(
  state: CityHallState,
  triggeredByPlayerId: string,
  turnNumber: number,
  stockIndustryIds: string[],
  random: () => number = Math.random,
): { state: CityHallState; term: CityHallProjectTerm } {
  const activeProjectId = getActiveCityHallTerm(state, turnNumber)?.project.id;
  const availableProjects = CITY_HALL_PROJECTS.filter(
    (project) => project.id !== activeProjectId,
  );
  const project =
    availableProjects[Math.floor(random() * availableProjects.length)] ??
    CITY_HALL_PROJECTS[0];

  if (!project) {
    throw new Error("City hall project pool is empty.");
  }

  const targetIndustryId =
    project.targetType === "STOCK_INDUSTRY" && stockIndustryIds.length > 0
      ? stockIndustryIds[Math.floor(random() * stockIndustryIds.length)] ?? null
      : null;

  const term: CityHallProjectTerm = {
    instanceId: `city-hall-${project.id}-${turnNumber}-${Date.now()}-${random()
      .toString(36)
      .slice(2, 7)}`,
    project,
    selectedByPlayerId: triggeredByPlayerId,
    selectedTurn: turnNumber,
    activeFromTurn: turnNumber,
    expiresAfterTurn: turnNumber + project.durationTurns - 1,
    targetIndustryId,
    oneTimeEffectConsumed: false,
  };

  const nextState: CityHallState = {
    ...state,
    currentTerm: term,
    scheduledTerm: null,
    history: [
      {
        instanceId: term.instanceId,
        projectId: project.id,
        projectName: project.name,
        selectedByPlayerId: triggeredByPlayerId,
        selectedTurn: turnNumber,
        activeFromTurn: term.activeFromTurn,
        expiresAfterTurn: term.expiresAfterTurn,
        targetIndustryId,
      },
      ...state.history,
    ].slice(0, MAX_CITY_HALL_HISTORY),
  };

  return { state: nextState, term };
}


export function applyResolvedCityHallProjectTerm(
  state: CityHallState,
  term: CityHallProjectTerm,
): CityHallState {
  return {
    ...state,
    currentTerm: term,
    scheduledTerm: null,
    history: [
      {
        instanceId: term.instanceId,
        projectId: term.project.id,
        projectName: term.project.name,
        selectedByPlayerId: term.selectedByPlayerId,
        selectedTurn: term.selectedTurn,
        activeFromTurn: term.activeFromTurn,
        expiresAfterTurn: term.expiresAfterTurn,
        targetIndustryId: term.targetIndustryId,
      },
      ...state.history.filter(
        (item) => item.instanceId !== term.instanceId,
      ),
    ].slice(0, MAX_CITY_HALL_HISTORY),
  };
}

export function scheduleCityHallProject(
  state: CityHallState,
  project: CityHallProjectDefinition,
  selectedByPlayerId: string,
  selectedTurn: number,
  targetIndustryId: string | null,
  random: () => number = Math.random,
): CityHallState {
  const term: CityHallProjectTerm = {
    instanceId: `city-hall-${project.id}-${selectedTurn}-${Date.now()}-${random()
      .toString(36)
      .slice(2, 7)}`,
    project,
    selectedByPlayerId,
    selectedTurn,
    activeFromTurn: selectedTurn,
    expiresAfterTurn: selectedTurn + project.durationTurns - 1,
    targetIndustryId,
    oneTimeEffectConsumed: false,
  };

  return {
    ...state,
    currentTerm: term,
    scheduledTerm: null,
    history: [
      {
        instanceId: term.instanceId,
        projectId: project.id,
        projectName: project.name,
        selectedByPlayerId,
        selectedTurn,
        activeFromTurn: term.activeFromTurn,
        expiresAfterTurn: term.expiresAfterTurn,
        targetIndustryId,
      },
      ...state.history,
    ].slice(0, MAX_CITY_HALL_HISTORY),
  };
}

export function grantCityHallDevelopmentSupport(
  state: CityHallState,
  playerId: string,
  propertyId: string,
  turnNumber: number,
): CityHallState {
  const benefits = getPlayerBenefits(state, playerId);

  return {
    ...state,
    playerBenefits: {
      ...state.playerBenefits,
      [playerId]: {
        ...benefits,
        developmentSupport: {
          propertyId,
          multiplier: 1 - CITY_HALL_DEVELOPMENT_SUPPORT_RATE,
          grantedTurn: turnNumber,
        },
      },
    },
  };
}

export function getCityHallDevelopmentSupportMultiplier(
  state: CityHallState,
  playerId: string,
  propertyId: string,
): number {
  const support = getPlayerBenefits(state, playerId).developmentSupport;

  return support?.propertyId === propertyId
    ? Math.max(0, support.multiplier)
    : 1;
}

export function consumeCityHallDevelopmentSupport(
  state: CityHallState,
  playerId: string,
  propertyId: string,
): CityHallState {
  const benefits = getPlayerBenefits(state, playerId);
  if (benefits.developmentSupport?.propertyId !== propertyId) return state;

  return {
    ...state,
    playerBenefits: {
      ...state.playerBenefits,
      [playerId]: {
        ...benefits,
        developmentSupport: null,
      },
    },
  };
}

export function grantCityHallPropertyTaxSupport(
  state: CityHallState,
  playerId: string,
  propertyId: string,
  turnNumber: number,
): CityHallState {
  const benefits = getPlayerBenefits(state, playerId);

  return {
    ...state,
    playerBenefits: {
      ...state.playerBenefits,
      [playerId]: {
        ...benefits,
        propertyTaxSupport: {
          propertyId,
          multiplier: 1 - CITY_HALL_PROPERTY_TAX_SUPPORT_RATE,
          grantedTurn: turnNumber,
        },
      },
    },
  };
}

export function applyCityHallPropertyTaxSupports(
  state: CityHallState,
  assessments: TaxAssessment[],
): {
  state: CityHallState;
  assessments: TaxAssessment[];
  supportedPlayerIds: string[];
} {
  let nextState = state;
  const supportedPlayerIds: string[] = [];

  const nextAssessments = assessments.map((assessment) => {
    const benefits = getPlayerBenefits(nextState, assessment.playerId);
    const support = benefits.propertyTaxSupport;
    if (!support) return assessment;

    let applied = false;
    const items = assessment.items.map((item) => {
      if (item.propertyId !== support.propertyId) return item;
      applied = true;
      return {
        ...item,
        amount: Math.max(1, Math.round(item.amount * support.multiplier)),
      };
    });

    if (!applied) return assessment;

    supportedPlayerIds.push(assessment.playerId);
    nextState = {
      ...nextState,
      playerBenefits: {
        ...nextState.playerBenefits,
        [assessment.playerId]: {
          ...benefits,
          propertyTaxSupport: null,
        },
      },
    };

    return {
      ...assessment,
      items,
      totalAmount: items.reduce((total, item) => total + item.amount, 0),
    };
  });

  return {
    state: nextState,
    assessments: nextAssessments,
    supportedPlayerIds,
  };
}

export function getCityHallApplicationLabel(
  applicationType: CityHallApplicationType,
): string {
  switch (applicationType) {
    case "DEVELOPMENT_PERMIT":
      return "개발제한 해제 신청";
    case "DEVELOPMENT_SUPPORT":
      return "개발비 지원 신청";
    case "PROPERTY_TAX_SUPPORT":
      return "부동산세 지원 신청";
  }
}

export function consumeCityHallOneTimeStockBoost(
  state: CityHallState,
  turnNumber: number,
): CityHallState {
  const activeTerm = getActiveCityHallTerm(state, turnNumber);
  if (
    !activeTerm ||
    activeTerm.oneTimeEffectConsumed ||
    !activeTerm.project.effects.oneTimeStockIndustryBoost
  ) {
    return state;
  }

  return updateTermById(state, activeTerm.instanceId, (term) => ({
    ...term,
    oneTimeEffectConsumed: true,
    expiresAfterTurn: Math.min(term.expiresAfterTurn, turnNumber),
  }));
}

export function getCityHallConstructionCostMultiplier(
  term: CityHallProjectTerm | null,
): number {
  return Math.max(0, term?.project.effects.constructionCostMultiplier ?? 1);
}

export function getCityHallPropertyMarketOptions(
  term: CityHallProjectTerm | null,
): { changeBias: number; minimumChangeRate: number | undefined } {
  return {
    changeBias: term?.project.effects.propertyMarketChangeBias ?? 0,
    minimumChangeRate:
      term?.project.effects.propertyMarketMinimumChangeRate,
  };
}

export function getCityHallTollMultiplier(
  term: CityHallProjectTerm | null,
  stage: PropertyDevelopmentStage,
): number {
  if (!term) return 1;

  let multiplier = 1;
  if (stage === "LANDMARK") {
    multiplier *= term.project.effects.landmarkTollMultiplier ?? 1;
  } else {
    multiplier *= term.project.effects.nonLandmarkTollMultiplier ?? 1;
  }

  return Math.max(0, multiplier);
}

export function getCityHallStockMarketOptions(
  term: CityHallProjectTerm | null,
): {
  industryChangeBiases: Record<string, number>;
  minimumFinalChangeRate: number | undefined;
  hasConsumableOneTimeBoost: boolean;
} {
  if (!term) {
    return {
      industryChangeBiases: {},
      minimumFinalChangeRate: undefined,
      hasConsumableOneTimeBoost: false,
    };
  }

  const industryChangeBiases: Record<string, number> = {};
  const targetIndustryId = term.targetIndustryId;
  if (targetIndustryId && term.project.effects.stockIndustryChangeBias) {
    industryChangeBiases[targetIndustryId] =
      term.project.effects.stockIndustryChangeBias;
  }

  const oneTimeBoost = term.project.effects.oneTimeStockIndustryBoost;
  const hasConsumableOneTimeBoost = Boolean(
    targetIndustryId && oneTimeBoost && !term.oneTimeEffectConsumed,
  );
  if (targetIndustryId && hasConsumableOneTimeBoost) {
    industryChangeBiases[targetIndustryId] =
      (industryChangeBiases[targetIndustryId] ?? 0) + (oneTimeBoost ?? 0);
  }

  return {
    industryChangeBiases,
    minimumFinalChangeRate:
      term.project.effects.stockMinimumFinalChangeRate,
    hasConsumableOneTimeBoost,
  };
}

export function getCityHallTaxMultiplier(
  term: CityHallProjectTerm | null,
): number {
  return Math.max(0, term?.project.effects.propertyTaxMultiplier ?? 1);
}

export function getCityHallBankInterestMultiplier(
  term: CityHallProjectTerm | null,
): number {
  return Math.max(0, term?.project.effects.bankInterestMultiplier ?? 1);
}

export function getCityHallPortSuccessChanceDelta(
  term: CityHallProjectTerm | null,
): number {
  return term?.project.effects.portSuccessChanceDelta ?? 0;
}

export function getCityHallDisasterRepairCostMultiplier(
  term: CityHallProjectTerm | null,
): number {
  return Math.max(
    0,
    term?.project.effects.disasterRepairCostMultiplier ?? 1,
  );
}
