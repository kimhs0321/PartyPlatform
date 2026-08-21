import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActiveEconomicNews } from "../game/economicNews/economicNewsTypes";
import type { CityHallProjectTerm } from "../game/cityHall/cityHallTypes";
import type { StockIndustryData } from "../game/stock/stockTypes";
import "./EconomicNewsIndicator.css";

const PRIORITY_DISPLAY_MS = 5_000;
const ROTATION_INTERVAL_MS = 4_000;

type InformationKind =
  | "ECONOMIC"
  | "CITY_HALL"
  | "DISASTER";

type InformationTone =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "CITY"
  | "DISASTER";

interface InformationItem {
  key: string;
  kind: InformationKind;
  label: string;
  headline: string;
  effect: string;
  meta: string | null;
  tone: InformationTone;
  sortTurn: number;
}

interface EconomicNewsIndicatorProps {
  news: ActiveEconomicNews[];
  cityHallTerm: CityHallProjectTerm | null;
  disasterPenalties: readonly unknown[];
  industries: StockIndustryData[];
  turnNumber: number;
}

const DISASTER_TYPE_LABELS: Record<string, string> = {
  TYPHOON: "태풍 피해",
  HEAVY_RAIN: "집중호우 피해",
  FLOOD: "침수 피해",
  FIRE: "대형 화재",
  EARTHQUAKE: "지진 피해",
  HEAT_WAVE: "폭염 피해",
  COLD_WAVE: "한파 피해",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getCandidateRecords(value: unknown): Record<string, unknown>[] {
  const root = asRecord(value);
  if (!root) return [];

  const records = [root];
  for (const key of ["event", "definition", "disaster", "penalty"]) {
    const nested = asRecord(root[key]);
    if (nested) records.push(nested);
  }

  return records;
}

function readString(
  value: unknown,
  keys: string[],
): string | null {
  for (const record of getCandidateRecords(value)) {
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return null;
}

function readNumber(
  value: unknown,
  keys: string[],
): number | null {
  for (const record of getCandidateRecords(value)) {
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function getRemainingTurnLabel(
  activeFromTurn: number | null | undefined,
  expiresAfterTurn: number | null | undefined,
  turnNumber: number,
): string | null {
  if (
    typeof activeFromTurn === "number" &&
    turnNumber < activeFromTurn
  ) {
    const waitingTurns = Math.max(1, activeFromTurn - turnNumber);
    return waitingTurns === 1
      ? "다음 턴 적용"
      : `${waitingTurns}턴 후 적용`;
  }

  if (typeof expiresAfterTurn !== "number") return null;

  const remainingTurns = expiresAfterTurn - turnNumber + 1;
  return remainingTurns > 0
    ? `${remainingTurns}턴 남음`
    : null;
}

function createEconomicItems(
  news: ActiveEconomicNews[],
  turnNumber: number,
): InformationItem[] {
  return news.map((item) => {
    const stockRelated =
      item.definition.effect.type === "STOCK_INDUSTRY_BIAS";

    return {
      key: `economic:${item.instanceId}`,
      kind: "ECONOMIC",
      label:
        item.source === "NEWSPAPER"
          ? "경제신문"
          : "경제 속보",
      headline: item.definition.headline,
      effect: item.definition.effectDescription,
      meta: stockRelated
        ? null
        : getRemainingTurnLabel(
            item.activeFromTurn,
            item.expiresAfterTurn,
            turnNumber,
          ),
      tone: item.definition.tone,
      sortTurn: item.publishedTurn,
    };
  });
}

function createCityHallItem(
  cityHallTerm: CityHallProjectTerm | null,
  industries: StockIndustryData[],
  turnNumber: number,
): InformationItem | null {
  if (!cityHallTerm || turnNumber > cityHallTerm.expiresAfterTurn) {
    return null;
  }

  const targetIndustryName = cityHallTerm.targetIndustryId
    ? industries.find(
        (industry) => industry.id === cityHallTerm.targetIndustryId,
      )?.name ?? cityHallTerm.targetIndustryId
    : null;
  const stockRelated =
    cityHallTerm.project.category === "STOCK" ||
    Boolean(cityHallTerm.targetIndustryId);
  const effect = targetIndustryName
    ? `${targetIndustryName} · ${cityHallTerm.project.effectDescription}`
    : cityHallTerm.project.effectDescription;

  return {
    key: `city:${cityHallTerm.instanceId}`,
    kind: "CITY_HALL",
    label: "시청 브리핑",
    headline: cityHallTerm.project.name,
    effect,
    meta: stockRelated
      ? null
      : getRemainingTurnLabel(
          cityHallTerm.activeFromTurn,
          cityHallTerm.expiresAfterTurn,
          turnNumber,
        ),
    tone: "CITY",
    sortTurn: cityHallTerm.selectedTurn,
  };
}

function createDisasterItems(
  disasterPenalties: readonly unknown[],
  turnNumber: number,
): InformationItem[] {
  return disasterPenalties.map((penalty, index) => {
    const type =
      readString(penalty, ["type", "disasterType", "eventType"]) ??
      "DISASTER";
    const headline =
      readString(penalty, [
        "name",
        "title",
        "disasterName",
        "eventName",
      ]) ??
      DISASTER_TYPE_LABELS[type] ??
      "자연재해 영향 지속";
    const effect =
      readString(penalty, [
        "effectDescription",
        "summary",
        "description",
        "penaltyDescription",
      ]) ??
      "피해 지역의 복구비와 시장 활동에 재난 영향이 적용됩니다.";
    const instanceId =
      readString(penalty, [
        "instanceId",
        "id",
        "eventId",
        "disasterId",
      ]) ?? `${type}-${index}`;
    const startedTurn =
      readNumber(penalty, [
        "startedTurn",
        "occurredTurn",
        "triggeredTurn",
        "turnNumber",
      ]) ?? 0;
    const activeFromTurn =
      readNumber(penalty, ["activeFromTurn", "startedTurn"]);
    const expiresAfterTurn =
      readNumber(penalty, ["expiresAfterTurn", "endTurn"]);

    return {
      key: `disaster:${instanceId}`,
      kind: "DISASTER",
      label: "재난 속보",
      headline,
      effect,
      meta: getRemainingTurnLabel(
        activeFromTurn,
        expiresAfterTurn,
        turnNumber,
      ),
      tone: "DISASTER",
      sortTurn: startedTurn,
    };
  });
}

export function EconomicNewsIndicator({
  news,
  cityHallTerm,
  disasterPenalties,
  industries,
  turnNumber,
}: EconomicNewsIndicatorProps) {
  const items = useMemo(() => {
    const combined: InformationItem[] = [
      ...createEconomicItems(news, turnNumber),
      ...createDisasterItems(disasterPenalties, turnNumber),
    ];

    const cityHallItem = createCityHallItem(
      cityHallTerm,
      industries,
      turnNumber,
    );
    if (cityHallItem) combined.push(cityHallItem);

    return combined.sort(
      (first, second) =>
        second.sortTurn - first.sortTurn ||
        first.key.localeCompare(second.key),
    );
  }, [
    cityHallTerm,
    disasterPenalties,
    industries,
    news,
    turnNumber,
  ]);

  const itemKeys = useMemo(
    () => items.map((item) => item.key),
    [items],
  );
  const keySignature = itemKeys.join("|");
  const knownKeysRef = useRef<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [priorityKey, setPriorityKey] = useState<string | null>(null);

  useEffect(() => {
    const currentKeySet = new Set(itemKeys);

    if (itemKeys.length === 0) {
      knownKeysRef.current = currentKeySet;
      setActiveKey(null);
      setPriorityKey(null);
      return;
    }

    const newestItem = items.find(
      (item) => !knownKeysRef.current.has(item.key),
    );
    knownKeysRef.current = currentKeySet;

    if (newestItem) {
      setActiveKey(newestItem.key);
      setPriorityKey(newestItem.key);
      return;
    }

    setActiveKey((currentKey) =>
      currentKey && currentKeySet.has(currentKey)
        ? currentKey
        : itemKeys[0],
    );
  }, [items, itemKeys, keySignature]);

  useEffect(() => {
    if (!priorityKey) return;

    const timeoutId = window.setTimeout(() => {
      setPriorityKey((currentKey) =>
        currentKey === priorityKey ? null : currentKey,
      );
    }, PRIORITY_DISPLAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [priorityKey]);

  useEffect(() => {
    if (priorityKey || itemKeys.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveKey((currentKey) => {
        const currentIndex = currentKey
          ? itemKeys.indexOf(currentKey)
          : -1;
        return itemKeys[(currentIndex + 1) % itemKeys.length];
      });
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [itemKeys, keySignature, priorityKey]);

  const activeItem =
    items.find((item) => item.key === activeKey) ??
    items[0] ??
    null;

  if (!activeItem) return null;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeItem.key),
  );

  return (
    <aside
      className={`economic-news-indicator economic-news-indicator--${activeItem.tone.toLowerCase()}`}
      aria-live="polite"
      aria-label="울산마블 통합 정보"
    >
      <div className="economic-news-indicator__live">
        <span />
        LIVE
      </div>

      <div
        className="economic-news-indicator__item"
        key={activeItem.key}
      >
        <strong className="economic-news-indicator__label">
          {activeItem.label}
        </strong>

        <div className="economic-news-indicator__message">
          <b>{activeItem.headline}</b>
          <span>{activeItem.effect}</span>
        </div>

        {activeItem.meta && (
          <em className="economic-news-indicator__meta">
            {activeItem.meta}
          </em>
        )}
      </div>

      {items.length > 1 && (
        <small className="economic-news-indicator__count">
          {activeIndex + 1}/{items.length}
        </small>
      )}
    </aside>
  );
}
