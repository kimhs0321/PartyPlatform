import type {
  StockCompanyData,
} from "./stockTypes";

import type {
  CompanyDividendEvent,
  CompanyDividendModifier,
  CompanyDividendModifierMap,
} from "./companyDividendTypes";

export function createInitialCompanyDividendModifiers(
  companies: StockCompanyData[],
): CompanyDividendModifierMap {
  return Object.fromEntries(
    companies.map((company) => [
      company.id,
      {
      companyId: company.id,
      persistentRateModifier: 0,
      specialDividendRate: 0,
      suspendNextDividend: false,
      lastChangedTurn: null,
    },
    ]),
  );
}

export function getEffectiveCompanyDividendRate(
  company: StockCompanyData,
  modifier:
    | CompanyDividendModifier
    | undefined,
): number {
  if (
    modifier?.suspendNextDividend
  ) {
    return 0;
  }

  const persistentRateModifier =
    modifier?.persistentRateModifier ?? 0;

  const specialDividendRate =
    modifier?.specialDividendRate ?? 0;

  const MAX_DIVIDEND_RATE =
    0.075;

  return Math.max(
    0,
    Math.min(
      MAX_DIVIDEND_RATE,
      company.dividendRatePerSettlement +
        persistentRateModifier +
        specialDividendRate,
    ),
  );
}

const MIN_PERSISTENT_DIVIDEND_MODIFIER =
  -0.03;

const MAX_PERSISTENT_DIVIDEND_MODIFIER =
  0.03;

function clampPersistentDividendModifier(
  value: number,
): number {
  return Math.max(
    MIN_PERSISTENT_DIVIDEND_MODIFIER,
    Math.min(
      MAX_PERSISTENT_DIVIDEND_MODIFIER,
      value,
    ),
  );
}

export function applyCompanyDividendEvent(
  currentMap: CompanyDividendModifierMap,
  event: CompanyDividendEvent,
): CompanyDividendModifierMap {
  const current:
    CompanyDividendModifier =
    currentMap[event.companyId] ?? {
      companyId:
        event.companyId,

      persistentRateModifier: 0,
      specialDividendRate: 0,
      suspendNextDividend: false,

      lastChangedTurn: null,
    };

  const nextPersistentRateModifier =
    clampPersistentDividendModifier(
      current.persistentRateModifier +
        event.persistentRateDelta,
    );

  const nextSpecialDividendRate =
    Math.max(
      current.specialDividendRate,
      event.specialDividendRate,
    );

  return {
    ...currentMap,

    [event.companyId]: {
      ...current,

      persistentRateModifier:
        nextPersistentRateModifier,

      specialDividendRate:
        nextSpecialDividendRate,

      lastChangedTurn:
        event.turnNumber,

      suspendNextDividend:
        event.type ===
          "DIVIDEND_SUSPENDED"
          ? true
          : current.suspendNextDividend,

    },
  };
}

export function consumeOneTimeDividendEffects(
  currentMap: CompanyDividendModifierMap,
): CompanyDividendModifierMap {
  let changed = false;

  const nextEntries =
    Object.entries(
      currentMap,
    ).map(
      ([companyId, modifier]) => {
        if (
          modifier.specialDividendRate <=
            0 &&
          !modifier.suspendNextDividend
        ) {
          return [
            companyId,
            modifier,
          ] as const;
        }

        changed = true;

        return [
          companyId,
          {
            ...modifier,
            specialDividendRate: 0,
            suspendNextDividend: false,
          },
        ] as const;
      },
    );

  return changed
    ? Object.fromEntries(
        nextEntries,
      )
    : currentMap;
}
