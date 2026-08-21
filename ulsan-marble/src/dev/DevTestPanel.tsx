import { useEffect, useMemo, useState } from "react";
import type { DiceValue } from "../game/dice";
import type {
  ActiveDisasterPenalty,
  DisasterState,
  DisasterType,
} from "../game/disaster/disasterTypes";
import type { LottoState } from "../game/lottery/lotteryTypes";
import {
  getInsuranceRemainingTurns,
  INSURANCE_PLANS,
  isInsuranceContractActive,
} from "../game/insurance/insuranceRules";
import type {
  InsuranceContractMap,
  InsurancePlanType,
} from "../game/insurance/insuranceTypes";
import type { MayorPolicy, MayorTerm } from "../game/election/electionTypes";
import { getPolicyTaxMultiplier } from "../game/election/policyEffects";
import { getPropertyTaxAmount } from "../game/economy/tax";
import type { PropertyMarketMap } from "../game/market/marketTypes";
import { getPortfolioMarketValue, getStockPrice, getStockQuote } from "../game/stock/stockMarket";
import type { StockCompanyData, StockMarketMap, StockPortfolioMap } from "../game/stock/stockTypes";
import {
  getCurrentPropertyPrice,
  getPropertyMarketState,
  getPropertyPriceIndex,
} from "../game/market/propertyMarket";
import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import type { PropertyOwnershipMap } from "../game/property/propertyTypes";
import type { BoardTile, PropertyData } from "../types";
import type { PlayerTokenData } from "../components/PlayerToken";
import {
  getGeneralDepositBalance,
  getRecurringSavingsContract,
} from "../game/bank/bankRules";
import type { BankState } from "../game/bank/bankTypes";
import type { EconomicNewsState } from "../game/economicNews/economicNewsTypes";
import {
  FESTIVAL_IDS,
  getFestivalDefinition,
} from "../game/festival/festivalData";
import type {
  ActiveFestival,
  FestivalId,
  TouristNpcState,
} from "../game/festival/festivalTypes";
import { getCityHallTaxMultiplier } from "../game/cityHall/cityHallRules";
import type {
  CityHallProjectTerm,
  CityHallState,
} from "../game/cityHall/cityHallTypes";
import "./DevTestPanel.css";

interface DevTestPanelProps {
  players: PlayerTokenData[];
  activePlayerId: string;
  tiles: BoardTile[];
  properties: PropertyData[];
  propertyOwnerships: PropertyOwnershipMap;
  propertyMarket: PropertyMarketMap;
  stockCompanies: StockCompanyData[];
  stockMarket: StockMarketMap;
  stockPortfolios: StockPortfolioMap;
  lottoState: LottoState;
  currentMayorTerm: MayorTerm | null;
  activeMayorPolicy: MayorPolicy | null;
  cityHallState: CityHallState;
  activeCityHallTerm: CityHallProjectTerm | null;
  disasterState: DisasterState;
  activeDisasterPenalties: ActiveDisasterPenalty[];
  insuranceContracts: InsuranceContractMap;
  bankState: BankState;
  economicNewsState: EconomicNewsState;
  activeFestival: ActiveFestival | null;
  touristNpc: TouristNpcState | null;
  festivalBusy: boolean;
  turnNumber: number;
  canUseActions: boolean;
  canReset: boolean;
  canEndTurn: boolean;
  onEndTurn: () => void;
  onSelectPlayer: (playerId: string) => void;
  onSetTurnNumber: (turnNumber: number) => void;
  onMovePlayer: (steps: number) => void | Promise<void>;
  onSetPlayerMoney: (amount: number) => void;
  onRunPropertyMarketCycle: () => void;
  onRunStockMarketCycle: () => void;
  onRunLottoDraw: () => void;
  onRunMayorElection: () => void;
  onRunCityHall: () => void;
  onRunRandomEconomicNews: () => void;
  onResetRandomEconomicNewsCooldown: () => void;
  onRunDisaster: (type: DisasterType) => void;
  onResetDisasterCooldown: () => void;
  onRunFestival: (festivalId: FestivalId) => void;
  onEndFestival: () => void;
  onSetInsuranceContract: (
    propertyId: string,
    planType: InsurancePlanType,
  ) => void;
  onExpireInsuranceContract: (propertyId: string) => void;
  onTeleportPlayer: (position: number) => void;
  onRollDice: (
    firstDice: DiceValue,
    secondDice: DiceValue,
  ) => void | Promise<void>;
  onResetGame: () => void;
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return minimum;

  return Math.min(
    Math.max(Math.trunc(value), minimum),
    maximum,
  );
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

export function DevTestPanel({
  players,
  activePlayerId,
  tiles,
  properties,
  propertyOwnerships,
  propertyMarket,
  stockCompanies,
  stockMarket,
  stockPortfolios,
  lottoState,
  currentMayorTerm,
  activeMayorPolicy,
  cityHallState,
  activeCityHallTerm,
  disasterState,
  activeDisasterPenalties,
  insuranceContracts,
  bankState,
  economicNewsState,
  activeFestival,
  touristNpc,
  festivalBusy,
  turnNumber,
  canUseActions,
  canReset,
  canEndTurn,
  onEndTurn,
  onSelectPlayer,
  onSetTurnNumber,
  onMovePlayer,
  onSetPlayerMoney,
  onRunPropertyMarketCycle,
  onRunStockMarketCycle,
  onRunLottoDraw,
  onRunMayorElection,
  onRunCityHall,
  onRunRandomEconomicNews,
  onResetRandomEconomicNewsCooldown,
  onRunDisaster,
  onResetDisasterCooldown,
  onRunFestival,
  onEndFestival,
  onSetInsuranceContract,
  onExpireInsuranceContract,
  onTeleportPlayer,
  onRollDice,
  onResetGame,
}: DevTestPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [moveSteps, setMoveSteps] = useState(1);
  const [turnAmount, setTurnAmount] = useState(turnNumber);
  const [moneyAmount, setMoneyAmount] = useState(2000);
  const [targetPosition, setTargetPosition] = useState(0);
  const [firstDice, setFirstDice] = useState<DiceValue>(1);
  const [secondDice, setSecondDice] = useState<DiceValue>(1);
  const [disasterType, setDisasterType] =
    useState<DisasterType>("TYPHOON");
  const [insurancePlanType, setInsurancePlanType] =
    useState<InsurancePlanType>("BASIC");
  const [festivalId, setFestivalId] =
    useState<FestivalId>("ULSAN_INDUSTRY");
  const [insurancePropertyId, setInsurancePropertyId] = useState("");

  const activePlayer = useMemo(
    () =>
      players.find((player) => player.id === activePlayerId) ??
      players[0],
    [activePlayerId, players],
  );

  const propertyMap = useMemo(
    () =>
      new Map<string, PropertyData>(
        properties.map((property) => [property.id, property]),
      ),
    [properties],
  );

  const stockCompanyMap = useMemo(
    () => new Map(stockCompanies.map((company) => [company.id, company])),
    [stockCompanies],
  );

  const activePlayerInsurableProperties = useMemo(
    () =>
      Object.values(propertyOwnerships)
        .filter(
          (ownership) =>
            ownership.ownerPlayerId === activePlayer?.id &&
            ownership.stage !== "LAND",
        )
        .flatMap((ownership) => {
          const property = propertyMap.get(ownership.propertyId);
          return property ? [{ property, ownership }] : [];
        })
        .sort(
          (first, second) =>
            first.property.boardTileId - second.property.boardTileId,
        ),
    [activePlayer?.id, propertyMap, propertyOwnerships],
  );

  useEffect(() => {
    if (
      activePlayerInsurableProperties.some(
        ({ property }) => property.id === insurancePropertyId,
      )
    ) {
      return;
    }

    setInsurancePropertyId(
      activePlayerInsurableProperties[0]?.property.id ?? "",
    );
  }, [activePlayerInsurableProperties, insurancePropertyId]);

  const playerAssets = useMemo(
    () =>
      players.map((player) => {
        const ownedProperties = Object.values(propertyOwnerships)
          .filter(
            (ownership) => ownership.ownerPlayerId === player.id,
          )
          .map((ownership) => {
            const property = propertyMap.get(ownership.propertyId);
            const currentLandPrice = property
              ? getCurrentPropertyPrice(property, propertyMarket)
              : 0;

            return {
              ownership,
              property,
              currentLandPrice,
              currentValue:
                currentLandPrice + ownership.constructionInvestment,
            };
          })
          .sort((first, second) => {
            const firstTileId = first.property?.boardTileId ?? 999;
            const secondTileId = second.property?.boardTileId ?? 999;
            return firstTileId - secondTileId;
          });

        const propertyPurchaseTotal = ownedProperties.reduce(
          (total, item) => total + item.ownership.purchasePrice,
          0,
        );
        const constructionInvestmentTotal = ownedProperties.reduce(
          (total, item) =>
            total + item.ownership.constructionInvestment,
          0,
        );
        const currentPropertyValueTotal = ownedProperties.reduce(
          (total, item) => total + item.currentValue,
          0,
        );
        const estimatedTax = ownedProperties.reduce(
          (total, item) =>
            item.property
              ? total +
                getPropertyTaxAmount(
                  item.property,
                  item.ownership.stage,
                  getPropertyPriceIndex(
                    propertyMarket,
                    item.property.id,
                  ),
                  getPolicyTaxMultiplier(activeMayorPolicy) *
                    getCityHallTaxMultiplier(activeCityHallTerm),
                )
              : total,
          0,
        );
        const stockPortfolio = stockPortfolios[player.id] ?? {};
        const ownedStocks = Object.values(stockPortfolio)
          .map((holding) => {
            const company = stockCompanyMap.get(holding.companyId);
            const currentPrice = getStockPrice(stockMarket, holding.companyId);
            return {
              holding,
              company,
              currentPrice,
              currentValue: holding.quantity * currentPrice,
            };
          })
          .sort((first, second) =>
            (first.company?.name ?? first.holding.companyId).localeCompare(
              second.company?.name ?? second.holding.companyId,
              "ko",
            ),
          );
        const currentStockValueTotal = getPortfolioMarketValue(
          stockPortfolio,
          stockMarket,
        );

        const lottoTicketCount = lottoState.tickets.filter(
          (ticket) =>
            ticket.playerId === player.id &&
            ticket.drawNumber === lottoState.drawNumber,
        ).length;
        const generalDepositBalance = getGeneralDepositBalance(
          bankState,
          player.id,
        );
        const savingsContract = getRecurringSavingsContract(
          bankState,
          player.id,
        );
        const savingsPrincipal = savingsContract?.principalPaid ?? 0;

        return {
          player,
          ownedProperties,
          ownedStocks,
          lottoTicketCount,
          generalDepositBalance,
          savingsContract,
          savingsPrincipal,
          propertyPurchaseTotal,
          constructionInvestmentTotal,
          currentPropertyValueTotal,
          currentStockValueTotal,
          estimatedTax,
          totalAssets:
            player.money +
            generalDepositBalance +
            savingsPrincipal +
            currentPropertyValueTotal +
            currentStockValueTotal,
        };
      }),
    [
      activeCityHallTerm,
      activeMayorPolicy,
      bankState,
      lottoState,
      players,
      propertyMap,
      propertyMarket,
      propertyOwnerships,
      stockCompanyMap,
      stockMarket,
      stockPortfolios,
    ],
  );

  const propertyMarketRows = useMemo(
    () =>
      [...properties]
        .sort((first, second) => first.boardTileId - second.boardTileId)
        .map((property) => ({
          property,
          state: getPropertyMarketState(propertyMarket, property.id),
          currentPrice: getCurrentPropertyPrice(property, propertyMarket),
        })),
    [properties, propertyMarket],
  );

  const stockMarketRows = useMemo(
    () =>
      stockCompanies.map((company) => ({
        company,
        quote: getStockQuote(stockMarket, company.id),
      })),
    [stockCompanies, stockMarket],
  );

  const maximumPosition = Math.max(tiles.length - 1, 0);
  const targetTile = tiles[targetPosition];

  useEffect(() => {
    if (!activePlayer) return;
    setTargetPosition(activePlayer.position);
    setMoneyAmount(activePlayer.money);
  }, [activePlayer]);

  useEffect(() => {
    setTurnAmount(turnNumber);
  }, [turnNumber]);

  return (
    <section
      className={`dev-test-panel${expanded ? " dev-test-panel--expanded" : ""}`}
      aria-label="개발용 게임 테스트 도구"
    >
      <button
        type="button"
        className="dev-test-panel__toggle"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span>DEV 테스트</span>
        <strong>{expanded ? "−" : "+"}</strong>
      </button>

      {expanded && (
        <div className="dev-test-panel__body">
          <div className="dev-test-panel__status">
            <span>{canUseActions ? "입력 가능" : "게임 처리 중"}</span>
            <strong>
              {activePlayer
                ? `${turnNumber}턴 · ${activePlayer.name} · ${activePlayer.position}번 칸`
                : "플레이어 없음"}
            </strong>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">
              전체 플레이어 자산
            </span>

            <div className="dev-test-panel__assets">
              {playerAssets.map((asset) => {
                const active = asset.player.id === activePlayerId;

                return (
                  <article
                    key={asset.player.id}
                    className={`dev-asset-card${
                      active ? " dev-asset-card--active" : ""
                    }`}
                    style={{
                      ["--dev-player-color" as string]: asset.player.color,
                    }}
                  >
                    <div className="dev-asset-card__header">
                      <strong>
                        {asset.player.name}
                        {asset.player.isBankrupt ? " · 파산" : ""}
                      </strong>
                      <span>{asset.player.position}번 칸</span>
                    </div>

                    <dl className="dev-asset-card__summary">
                      <div>
                        <dt>현금</dt>
                        <dd>{formatMoney(asset.player.money)}</dd>
                      </div>
                      <div>
                        <dt>일반예금</dt>
                        <dd>{formatMoney(asset.generalDepositBalance)}</dd>
                      </div>
                      <div>
                        <dt>적금 원금</dt>
                        <dd>{formatMoney(asset.savingsPrincipal)}</dd>
                      </div>
                      <div>
                        <dt>부동산</dt>
                        <dd>{asset.ownedProperties.length}개</dd>
                      </div>
                      <div>
                        <dt>주식 종목</dt>
                        <dd>{asset.ownedStocks.length}개</dd>
                      </div>
                      <div>
                        <dt>주식 평가액</dt>
                        <dd>{formatMoney(asset.currentStockValueTotal)}</dd>
                      </div>
                      <div>
                        <dt>로또 티켓</dt>
                        <dd>{asset.lottoTicketCount}장</dd>
                      </div>
                      <div>
                        <dt>매입가 합계</dt>
                        <dd>{formatMoney(asset.propertyPurchaseTotal)}</dd>
                      </div>
                      <div>
                        <dt>건설 투자</dt>
                        <dd>
                          {formatMoney(asset.constructionInvestmentTotal)}
                        </dd>
                      </div>
                      <div>
                        <dt>현재 평가액</dt>
                        <dd>{formatMoney(asset.currentPropertyValueTotal)}</dd>
                      </div>
                      <div>
                        <dt>예상 세금</dt>
                        <dd>{formatMoney(asset.estimatedTax)}</dd>
                      </div>
                      <div>
                        <dt>총자산</dt>
                        <dd>{formatMoney(asset.totalAssets)}</dd>
                      </div>
                    </dl>

                    <div className="dev-asset-card__properties">
                      {asset.savingsContract && (
                        <span>
                          정기적금
                          <em>
                            {asset.savingsContract.installmentsPaid}/{asset.savingsContract.installmentCount}회 · 실패 {asset.savingsContract.failedPayments}/2
                          </em>
                          <b>{formatMoney(asset.savingsContract.principalPaid)}</b>
                        </span>
                      )}
                      {asset.ownedProperties.length === 0 ? (
                        <small>보유 부동산 없음</small>
                      ) : (
                        asset.ownedProperties.map(({ ownership, property, currentLandPrice, currentValue }) => (
                          <span key={ownership.propertyId}>
                            {property?.name ?? ownership.propertyId}
                            <em>
                              {getDevelopmentStageLabel(ownership.stage)}
                            </em>
                            <b title={`토지 현재가 ${formatMoney(currentLandPrice)}`}>
                              {formatMoney(currentValue)}
                            </b>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="dev-asset-card__stocks">
                      {asset.ownedStocks.length === 0 ? (
                        <small>보유 주식 없음</small>
                      ) : (
                        asset.ownedStocks.map(({ holding, company, currentPrice, currentValue }) => (
                          <span key={holding.companyId}>
                            {company?.name ?? holding.companyId}
                            <em>{holding.quantity}주 · {formatMoney(currentPrice)}</em>
                            <b>{formatMoney(currentValue)}</b>
                          </span>
                        ))
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <small className="dev-test-panel__hint">
              총자산은 현금, 일반예금, 적금 납입원금, 현재 부동산·주식 평가액의 합계입니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">전체 턴 설정</span>

            <div className="dev-test-panel__row">
              <input
                type="number"
                min={1}
                max={9999}
                value={turnAmount}
                disabled={!canUseActions}
                aria-label="설정할 전체 턴"
                onChange={(event) =>
                  setTurnAmount(
                    clampInteger(Number(event.target.value), 1, 9999),
                  )
                }
              />

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => onSetTurnNumber(turnAmount)}
              >
                턴 설정
              </button>
            </div>

            <small className="dev-test-panel__hint">
              5턴으로 설정하고 마지막 정상 플레이어의 행동을 끝내면 세금 정산을 바로 테스트할 수 있습니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">부동산 시세</span>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunPropertyMarketCycle}
            >
              시세 변동 즉시 실행
            </button>

            <div className="dev-test-panel__market-list">
              {propertyMarketRows.map(({ property, state, currentPrice }) => (
                <div className="dev-market-row" key={property.id}>
                  <span>{property.name}</span>
                  <small>{formatMoney(currentPrice)}</small>
                  <b
                    className={
                      state.lastChangeRate > 0
                        ? "is-up"
                        : state.lastChangeRate < 0
                          ? "is-down"
                          : ""
                    }
                  >
                    {formatRate(state.lastChangeRate)}
                  </b>
                </div>
              ))}
            </div>

            <small className="dev-test-panel__hint">
              정기 변동은 5턴 세금 정산 뒤 실행됩니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">주식 시세</span>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunStockMarketCycle}
            >
              주식 변동 즉시 실행
            </button>

            <div className="dev-test-panel__market-list">
              {stockMarketRows.map(({ company, quote }) => (
                <div className="dev-market-row" key={company.id}>
                  <span>{company.name}</span>
                  <small>{formatMoney(quote?.currentPrice ?? company.basePrice)}</small>
                  <b
                    className={
                      (quote?.lastChangeRate ?? 0) > 0
                        ? "is-up"
                        : (quote?.lastChangeRate ?? 0) < 0
                          ? "is-down"
                          : ""
                    }
                  >
                    {formatRate(quote?.lastChangeRate ?? 0)}
                  </b>
                </div>
              ))}
            </div>

            <small className="dev-test-panel__hint">
              주식은 모든 정상 플레이어의 행동이 끝날 때마다 변동합니다.
            </small>
          </div>


          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">로또 추첨</span>

            <div className="dev-test-panel__status">
              <span>{lottoState.drawNumber}회차 · 판매 {lottoState.tickets.filter((ticket) => ticket.drawNumber === lottoState.drawNumber).length}장</span>
              <strong>1등 누적 {formatMoney(lottoState.jackpot)}</strong>
            </div>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunLottoDraw}
            >
              로또 추첨 즉시 실행
            </button>

            <small className="dev-test-panel__hint">
              정기 추첨은 5턴마다 주식시장 변동 뒤 실행됩니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">시장선거</span>

            <div className="dev-test-panel__status">
              <span>
                {currentMayorTerm
                  ? `시장 ${currentMayorTerm.candidate.name}`
                  : "현재 시장 없음"}
              </span>
              <strong>
                {currentMayorTerm?.policy.name ?? "10턴 종료 후 첫 선거"}
              </strong>
            </div>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunMayorElection}
            >
              시장선거 즉시 실행
            </button>

            <small className="dev-test-panel__hint">
              정기선거는 10턴마다 로또 추첨 뒤 진행되며 당선 정책은 다음 턴부터 적용됩니다.
            </small>
          </div>


          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">울산시청 시정사업</span>

            <div className="dev-test-panel__status">
              <span>
                {activeCityHallTerm
                  ? `${activeCityHallTerm.project.name} · ${activeCityHallTerm.selectedTurn}턴 선택`
                  : cityHallState.scheduledTerm
                    ? `${cityHallState.scheduledTerm.project.name} · 발효 대기`
                    : "현재 시정사업 없음"}
              </span>
              <strong>
                {activeCityHallTerm
                  ? `${activeCityHallTerm.expiresAfterTurn - turnNumber + 1}턴 남음 · ${activeCityHallTerm.project.effectDescription}`
                  : cityHallState.scheduledTerm
                    ? `${cityHallState.scheduledTerm.activeFromTurn}턴부터 · ${cityHallState.scheduledTerm.project.effectDescription}`
                    : "32번 시청 칸 도착 시 후보 3개 공개"}
              </strong>
            </div>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunCityHall}
            >
              시정사업 선택 즉시 실행
            </button>

            <small className="dev-test-panel__hint">
              선택한 사업은 다음 전체 턴부터 4턴간 적용되며 새 사업은 기존 사업을 교체합니다.
            </small>
          </div>


          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">랜덤 경제뉴스</span>

            <div className="dev-test-panel__status">
              <span>
                최근 랜덤 발생 {economicNewsState.lastRandomPublishedTurn === null
                  ? "없음"
                  : `${economicNewsState.lastRandomPublishedTurn}턴`}
              </span>
              <strong>대기·적용 뉴스 {economicNewsState.activeNews.filter((news) => news.expiresAfterTurn >= turnNumber).length}개</strong>
            </div>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onRunRandomEconomicNews}
            >
              경제 속보 강제 발생
            </button>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onResetRandomEconomicNewsCooldown}
            >
              뉴스 쿨다운 초기화
            </button>

            <div className="dev-test-panel__market-list">
              {economicNewsState.activeNews
                .filter((news) => news.expiresAfterTurn >= turnNumber)
                .map((news) => (
                  <div className="dev-market-row" key={news.instanceId}>
                    <span>{news.definition.headline}</span>
                    <small>
                      발표 {news.publishedTurn} · 시작 {news.activeFromTurn} · 종료 {news.expiresAfterTurn}
                    </small>
                    <b>{news.source}</b>
                  </div>
                ))}
            </div>

            <small className="dev-test-panel__hint">
              정기 판정은 3턴부터 라운드 종료마다 15% 확률이며, 발생 후 2턴 동안 재발하지 않습니다. 일반 화면에서는 시작·종료 시점을 숨깁니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">축제 시스템</span>

            <div className="dev-test-panel__status">
              <span>
                {activeFestival
                  ? `활성 · ${getFestivalDefinition(activeFestival.festivalId).name}`
                  : "현재 활성 축제 없음"}
              </span>
              <strong>
                {touristNpc
                  ? `관광객 ${touristNpc.position}번 칸 · 누적 ${touristNpc.travelledSteps}칸`
                  : festivalBusy
                    ? "축제 처리 중"
                    : "관광객 없음"}
              </strong>
            </div>

            <div className="dev-test-panel__row">
              <select
                value={festivalId}
                disabled={
                  !canUseActions ||
                  festivalBusy ||
                  Boolean(activeFestival)
                }
                aria-label="강제 개최할 축제"
                onChange={(event) =>
                  setFestivalId(event.target.value as FestivalId)
                }
              >
                {FESTIVAL_IDS.map((id) => (
                  <option key={id} value={id}>
                    {getFestivalDefinition(id).name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  !canUseActions ||
                  festivalBusy ||
                  Boolean(activeFestival)
                }
                onClick={() => onRunFestival(festivalId)}
              >
                강제 개최
              </button>

              <button
                type="button"
                disabled={festivalBusy || !activeFestival}
                onClick={onEndFestival}
              >
                강제 종료
              </button>
            </div>

            <small className="dev-test-panel__hint">
              강제 개최는 5턴·40% 확률을 무시합니다. 발표 연출 뒤 관광객이 즉시 한 번 이동합니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">자연재해</span>

            <div className="dev-test-panel__status">
              <span>
                최근 발생 {disasterState.lastOccurredTurn === null
                  ? "없음"
                  : `${disasterState.lastOccurredTurn}턴`}
              </span>
              <strong>
                활성 통행료 페널티 {activeDisasterPenalties.length}곳
              </strong>
            </div>

            <div className="dev-test-panel__row">
              <select
                value={disasterType}
                disabled={!canUseActions}
                aria-label="강제 발생할 자연재해"
                onChange={(event) =>
                  setDisasterType(event.target.value as DisasterType)
                }
              >
                <option value="TYPHOON">태풍</option>
                <option value="HEAVY_RAIN">집중호우</option>
                <option value="EARTHQUAKE">지진</option>
                <option value="WILDFIRE">산불</option>
              </select>

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => onRunDisaster(disasterType)}
              >
                강제 발생
              </button>
            </div>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canUseActions}
              onClick={onResetDisasterCooldown}
            >
              재해 쿨다운 초기화
            </button>

            <small className="dev-test-panel__hint">
              정기 재해는 4턴부터 라운드 종료마다 10% 확률로 판정하며 발생 후 4턴 동안 재발하지 않습니다.
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">보험 계약</span>

            <div className="dev-test-panel__status">
              <span>
                활성 계약 {Object.values(insuranceContracts).filter((contract) =>
                  isInsuranceContractActive(contract, turnNumber),
                ).length}건
              </span>
              <strong>
                선택 플레이어 가입 가능 {activePlayerInsurableProperties.length}곳
              </strong>
            </div>

            <div className="dev-test-panel__row">
              <select
                value={insurancePropertyId}
                disabled={!canUseActions || activePlayerInsurableProperties.length === 0}
                aria-label="보험 테스트 부동산"
                onChange={(event) => setInsurancePropertyId(event.target.value)}
              >
                {activePlayerInsurableProperties.length === 0 ? (
                  <option value="">개발 부동산 없음</option>
                ) : (
                  activePlayerInsurableProperties.map(({ property }) => {
                    const contract = insuranceContracts[property.id];
                    const active = isInsuranceContractActive(contract, turnNumber);
                    return (
                      <option key={property.id} value={property.id}>
                        {property.name}
                        {active && contract
                          ? ` · ${INSURANCE_PLANS[contract.planType].name} ${getInsuranceRemainingTurns(contract, turnNumber)}턴`
                          : " · 미가입"}
                      </option>
                    );
                  })
                )}
              </select>

              <select
                value={insurancePlanType}
                disabled={!canUseActions || !insurancePropertyId}
                aria-label="DEV 보험 상품"
                onChange={(event) =>
                  setInsurancePlanType(event.target.value as InsurancePlanType)
                }
              >
                <option value="BASIC">기본형 50%</option>
                <option value="COMPREHENSIVE">종합형 80%</option>
              </select>
            </div>

            <div className="dev-test-panel__row">
              <button
                type="button"
                disabled={!canUseActions || !insurancePropertyId}
                onClick={() =>
                  onSetInsuranceContract(insurancePropertyId, insurancePlanType)
                }
              >
                강제 가입·연장
              </button>
              <button
                type="button"
                disabled={
                  !canUseActions ||
                  !insurancePropertyId ||
                  !insuranceContracts[insurancePropertyId]
                }
                onClick={() => onExpireInsuranceContract(insurancePropertyId)}
              >
                즉시 만료
              </button>
            </div>

            <small className="dev-test-panel__hint">
              강제 가입은 보험료를 차감하지 않습니다. 실제 가입은 33번·42번 보험사 칸에서 테스트하세요.
            </small>
          </div>

          <label className="dev-test-panel__field">
            <span>테스트 플레이어</span>
            <select
              value={activePlayerId}
              disabled={!canUseActions}
              onChange={(event) => onSelectPlayer(event.target.value)}
            >
              {players.map((player) => (
                <option
                  key={player.id}
                  value={player.id}
                  disabled={player.isBankrupt}
                >
                  {player.name} · {player.position}번 · {player.money}만원
                  {player.isBankrupt ? " · 파산" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">테스트 자금</span>

            <div className="dev-test-panel__row">
              <input
                type="number"
                min={0}
                max={999999999}
                value={moneyAmount}
                disabled={!canUseActions}
                aria-label="설정할 현금"
                onChange={(event) =>
                  setMoneyAmount(
                    clampInteger(
                      Number(event.target.value),
                      0,
                      999999999,
                    ),
                  )
                }
              />

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => onSetPlayerMoney(moneyAmount)}
              >
                현금 설정
              </button>
            </div>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">수동 이동</span>

            <div className="dev-test-panel__row">
              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => void onMovePlayer(1)}
              >
                1칸 이동
              </button>

              <input
                type="number"
                min={1}
                max={120}
                value={moveSteps}
                disabled={!canUseActions}
                aria-label="이동 칸 수"
                onChange={(event) =>
                  setMoveSteps(
                    clampInteger(Number(event.target.value), 1, 120),
                  )
                }
              />

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => void onMovePlayer(moveSteps)}
              >
                이동
              </button>
            </div>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">지정 칸 테스트</span>

            <div className="dev-test-panel__row">
              <input
                type="number"
                min={0}
                max={maximumPosition}
                value={targetPosition}
                disabled={!canUseActions}
                aria-label="이동할 칸 번호"
                onChange={(event) =>
                  setTargetPosition(
                    clampInteger(
                      Number(event.target.value),
                      0,
                      maximumPosition,
                    ),
                  )
                }
              />

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => onTeleportPlayer(targetPosition)}
              >
                바로 이동
              </button>
            </div>

            <small className="dev-test-panel__hint">
              {targetTile
                ? `${targetTile.id}번 · ${targetTile.name}`
                : "존재하지 않는 칸"}
            </small>
          </div>

          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">주사위 강제 지정</span>

            <div className="dev-test-panel__row dev-test-panel__row--dice">
              <select
                value={firstDice}
                disabled={!canUseActions}
                aria-label="첫 번째 주사위"
                onChange={(event) =>
                  setFirstDice(Number(event.target.value) as DiceValue)
                }
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <span>+</span>

              <select
                value={secondDice}
                disabled={!canUseActions}
                aria-label="두 번째 주사위"
                onChange={(event) =>
                  setSecondDice(Number(event.target.value) as DiceValue)
                }
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!canUseActions}
                onClick={() => void onRollDice(firstDice, secondDice)}
              >
                굴리기
              </button>
            </div>
          </div>
          
          <div className="dev-test-panel__group">
            <span className="dev-test-panel__group-title">
              DEV 턴 제어
            </span>

            <button
              type="button"
              className="dev-test-panel__market-run"
              disabled={!canEndTurn}
              onClick={onEndTurn}
            >
              현재 플레이어 턴 종료
            </button>
          </div>

            <button
              type="button"
              className="dev-test-panel__reset"
              disabled={!canReset}
              onClick={onResetGame}
            >
              위치·자금·부동산·주식·복권·시장정책·재난 전체 초기화
            </button>
         </div>
      )}
    </section>
  );
}