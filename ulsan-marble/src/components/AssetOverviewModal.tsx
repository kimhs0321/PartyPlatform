import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./AssetOverviewModal.css";

import type { SellableStockAsset } from "../game/stock/stockLiquidation";
import type { StockTradeError } from "../game/stock/stockTypes";
import type { PlayerTokenData } from "./PlayerToken";
import { PropertyCard, type PropertyCardData } from "./PropertyCard";
import { StockLiquidationList } from "./StockLiquidationList";

export interface AssetPropertySummary extends PropertyCardData {
  purchasePrice: number;
  constructionInvestment: number;
  estimatedValue: number;
  priceChangeRate: number;
}

export interface AssetSavingsSummary {
  productName: string;
  installmentAmount: number;
  installmentCount: number;
  installmentsPaid: number;
  principalPaid: number;
  maturityPayout: number;
  failedPayments: number;
  nextPaymentTurn: number;
}

export interface AssetInsuranceSummary {
  propertyId: string;
  propertyName: string;
  planName: string;
  coverageRate: number;
  premiumPaid: number;
  remainingTurns: number;
  expiresAfterTurn: number;
}

export interface AssetItemSummary {
  key: string;
  name: string;
  description: string;
  rarity: "COMMON" | "RARE";
  useModeLabel: string;
}

export interface AssetLottoTicketSummary {
  id: string;
  drawNumber: number;
  numbers: number[];
  purchasedTurn: number;
}

interface AssetOverviewModalProps {
  open: boolean;
  player: PlayerTokenData;
  properties: AssetPropertySummary[];
  generalDepositBalance: number;
  savings: AssetSavingsSummary | null;
  insurances: AssetInsuranceSummary[];
  stocks: SellableStockAsset[];
  auctionItems: AssetItemSummary[];
  lottoTickets: AssetLottoTicketSummary[];
  lottoDrawNumber: number;
  canSellStocks: boolean;
  stockTradeError: StockTradeError | null;
  onSellStock: (companyId: string, quantity: number) => void;
  onClose: () => void;
}

type AssetTab = "OVERVIEW" | "PROPERTY" | "FINANCE" | "STOCK" | "OTHER";

const STAGE_LABELS: Record<AssetPropertySummary["stage"], string> = {
  LAND: "토지",
  DEVELOPED: "개발지",
  BUILDING: "건물",
  LANDMARK: "랜드마크",
};

const TABS: Array<{ id: AssetTab; label: string }> = [
  { id: "OVERVIEW", label: "전체" },
  { id: "PROPERTY", label: "부동산" },
  { id: "FINANCE", label: "금융" },
  { id: "STOCK", label: "주식" },
  { id: "OTHER", label: "기타" },
];

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

function getStockErrorLabel(error: StockTradeError | null): string | null {
  switch (error) {
    case "NOT_TRADING_PHASE":
      return "주식 거래 단계에서만 매도할 수 있습니다.";
    case "COMPANY_NOT_FOUND":
      return "종목 정보를 찾을 수 없습니다.";
    case "INVALID_QUANTITY":
      return "매도 수량을 확인해 주세요.";
    case "INSUFFICIENT_HOLDING":
      return "보유 수량이 부족합니다.";
    case "TRADING_UNAVAILABLE":
      return "현재 거래할 수 없는 종목입니다.";
    default:
      return null;
  }
}

function EmptyState({ children }: { children: string }) {
  return <div className="asset-overview-empty">{children}</div>;
}

export function AssetOverviewModal({
  open,
  player,
  properties,
  generalDepositBalance,
  savings,
  insurances,
  stocks,
  auctionItems,
  lottoTickets,
  lottoDrawNumber,
  canSellStocks,
  stockTradeError,
  onSellStock,
  onClose,
}: AssetOverviewModalProps) {
  const [activeTab, setActiveTab] = useState<AssetTab>("OVERVIEW");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setActiveTab("OVERVIEW");
      setSelectedPropertyId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (selectedPropertyId) {
        setSelectedPropertyId(null);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, selectedPropertyId]);

  const totals = useMemo(() => {
    const propertyValue = properties.reduce(
      (total, property) => total + property.estimatedValue,
      0,
    );
    const savingsPrincipal = savings?.principalPaid ?? 0;
    const bankValue = generalDepositBalance + savingsPrincipal;
    const stockValue = stocks.reduce(
      (total, stock) => total + stock.marketValue,
      0,
    );
    const stockPurchaseCost = stocks.reduce(
      (total, stock) => total + stock.holding.totalPurchaseCost,
      0,
    );
    const stockProfitLoss = stockValue - stockPurchaseCost;
    const stockProfitRate =
      stockPurchaseCost > 0 ? stockProfitLoss / stockPurchaseCost : 0;

    return {
      propertyValue,
      savingsPrincipal,
      bankValue,
      stockValue,
      stockProfitLoss,
      stockProfitRate,
      totalValue: player.money + propertyValue + bankValue + stockValue,
    };
  }, [generalDepositBalance, player.money, properties, savings, stocks]);

  if (!open) return null;

  const selectedProperty =
    properties.find((property) => property.propertyId === selectedPropertyId) ??
    null;
  const stockErrorLabel = getStockErrorLabel(stockTradeError);

  return (
    <div
      className="asset-overview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} 자산 현황`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="asset-overview-modal"
        style={{ "--asset-player-color": player.color } as CSSProperties}
      >
        <header className="asset-overview-header">
          <div className="asset-overview-player">
            <span className="asset-overview-player__token">
              {player.shortName}
            </span>
            <div>
              <small>MY ASSETS</small>
              <h2>{player.name} 자산 현황</h2>
            </div>
          </div>

          <div className="asset-overview-total">
            <small>총자산</small>
            <strong>{formatMoney(totals.totalValue)}</strong>
          </div>

          <button
            type="button"
            className="asset-overview-close"
            onClick={onClose}
            aria-label="자산창 닫기"
          >
            ×
          </button>
        </header>

        <nav className="asset-overview-tabs" aria-label="자산 분류">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="asset-overview-body">
          {activeTab === "OVERVIEW" && (
            <div className="asset-overview-overview">
              <section className="asset-overview-summary-grid">
                <article>
                  <span>보유 현금</span>
                  <strong>{formatMoney(player.money)}</strong>
                </article>
                <article>
                  <span>부동산 평가액</span>
                  <strong>{formatMoney(totals.propertyValue)}</strong>
                  <small>{properties.length}곳 보유</small>
                </article>
                <article>
                  <span>은행 자산</span>
                  <strong>{formatMoney(totals.bankValue)}</strong>
                  <small>예금 + 적금 원금</small>
                </article>
                <article>
                  <span>주식 평가액</span>
                  <strong>{formatMoney(totals.stockValue)}</strong>
                  <small
                    className={
                      totals.stockProfitLoss > 0
                        ? "is-profit"
                        : totals.stockProfitLoss < 0
                          ? "is-loss"
                          : ""
                    }
                  >
                    {formatMoney(totals.stockProfitLoss)} ·{" "}
                    {formatRate(totals.stockProfitRate)}
                  </small>
                </article>
              </section>

              <div className="asset-overview-dashboard-grid">
                <section className="asset-overview-panel">
                  <header>
                    <h3>보유 부동산</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("PROPERTY")}
                    >
                      전체 보기
                    </button>
                  </header>
                  {properties.length === 0 ? (
                    <EmptyState>보유 중인 부동산이 없습니다.</EmptyState>
                  ) : (
                    <div className="asset-overview-compact-list">
                      {properties.slice(0, 4).map((property) => (
                        <div key={property.propertyId}>
                          <span>
                            <strong>{property.name}</strong>
                            <small>
                              {property.districtName} ·{" "}
                              {STAGE_LABELS[property.stage]}
                            </small>
                          </span>
                          <b>{formatMoney(property.estimatedValue)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="asset-overview-panel">
                  <header>
                    <h3>금융 현황</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("FINANCE")}
                    >
                      상세 보기
                    </button>
                  </header>
                  <dl className="asset-overview-simple-stats">
                    <div>
                      <dt>일반예금</dt>
                      <dd>{formatMoney(generalDepositBalance)}</dd>
                    </div>
                    <div>
                      <dt>적금 원금</dt>
                      <dd>{formatMoney(totals.savingsPrincipal)}</dd>
                    </div>
                    <div>
                      <dt>유효 보험</dt>
                      <dd>{insurances.length}건</dd>
                    </div>
                  </dl>
                </section>

                <section className="asset-overview-panel">
                  <header>
                    <h3>보유 주식</h3>
                    <button type="button" onClick={() => setActiveTab("STOCK")}>
                      매도 관리
                    </button>
                  </header>
                  {stocks.length === 0 ? (
                    <EmptyState>보유 중인 주식이 없습니다.</EmptyState>
                  ) : (
                    <div className="asset-overview-compact-list">
                      {stocks.slice(0, 4).map((stock) => (
                        <div key={stock.company.id}>
                          <span>
                            <strong>{stock.company.name}</strong>
                            <small>
                              {stock.holding.quantity}주 · 평균{" "}
                              {formatMoney(stock.holding.averagePurchasePrice)}
                            </small>
                          </span>
                          <b
                            className={
                              stock.profitLoss > 0
                                ? "is-profit"
                                : stock.profitLoss < 0
                                  ? "is-loss"
                                  : ""
                            }
                          >
                            {formatRate(stock.profitLossRate)}
                          </b>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="asset-overview-panel">
                  <header>
                    <h3>기타 보유물</h3>
                    <button type="button" onClick={() => setActiveTab("OTHER")}>
                      전체 보기
                    </button>
                  </header>
                  <dl className="asset-overview-simple-stats">
                    <div>
                      <dt>경매 아이템</dt>
                      <dd>{auctionItems.length}개</dd>
                    </div>
                    <div>
                      <dt>{lottoDrawNumber}회차 로또</dt>
                      <dd>{lottoTickets.length}장</dd>
                    </div>
                    <div>
                      <dt>구치소 탈출권</dt>
                      <dd>{player.jailEscapeCards ?? 0}장</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          )}

          {activeTab === "PROPERTY" && (
            <section className="asset-overview-tab-section">
              <div className="asset-overview-section-title">
                <div>
                  <h3>보유 부동산</h3>
                  <p>현재 토지가와 건설 투자액을 합산한 평가액입니다.</p>
                </div>
                <strong>{formatMoney(totals.propertyValue)}</strong>
              </div>

              {properties.length === 0 ? (
                <EmptyState>보유 중인 부동산이 없습니다.</EmptyState>
              ) : (
                <div className="asset-property-list">
                  {properties.map((property) => {
                    const rateClass =
                      property.priceChangeRate > 0
                        ? "is-profit"
                        : property.priceChangeRate < 0
                          ? "is-loss"
                          : "";

                    return (
                      <article
                        className="asset-property-row"
                        key={property.propertyId}
                      >
                        <div className="asset-property-row__title">
                          <span>{property.districtName}</span>
                          <strong>{property.name}</strong>
                          <small>
                            {STAGE_LABELS[property.stage]}
                            {property.insurancePlanName
                              ? ` · ${property.insurancePlanName} 보험`
                              : ""}
                          </small>
                        </div>

                        <dl>
                          <div>
                            <dt>토지 현재가</dt>
                            <dd>{formatMoney(property.currentLandPrice)}</dd>
                          </div>
                          <div>
                            <dt>건설 투자</dt>
                            <dd>
                              {formatMoney(property.constructionInvestment)}
                            </dd>
                          </div>
                          <div>
                            <dt>현재 통행료</dt>
                            <dd>{formatMoney(property.currentToll)}</dd>
                          </div>
                          <div>
                            <dt>가격 변동</dt>
                            <dd className={rateClass}>
                              {formatRate(property.priceChangeRate)}
                            </dd>
                          </div>
                        </dl>

                        <div className="asset-property-row__value">
                          <small>평가액</small>
                          <strong>
                            {formatMoney(property.estimatedValue)}
                          </strong>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPropertyId(property.propertyId)
                            }
                          >
                            카드 보기
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "FINANCE" && (
            <section className="asset-overview-tab-section">
              <div className="asset-finance-grid">
                <article className="asset-finance-card">
                  <header>
                    <span>일반예금</span>
                    <strong>{formatMoney(generalDepositBalance)}</strong>
                  </header>
                  <p>5턴마다 기본 이자가 반영되는 자유 입출금 예금입니다.</p>
                </article>

                <article className="asset-finance-card">
                  <header>
                    <span>적금</span>
                    <strong>{savings ? savings.productName : "미가입"}</strong>
                  </header>
                  {savings ? (
                    <dl>
                      <div>
                        <dt>납입 원금</dt>
                        <dd>{formatMoney(savings.principalPaid)}</dd>
                      </div>
                      <div>
                        <dt>납입 횟수</dt>
                        <dd>
                          {savings.installmentsPaid}/{savings.installmentCount}
                          회
                        </dd>
                      </div>
                      <div>
                        <dt>회당 납입액</dt>
                        <dd>{formatMoney(savings.installmentAmount)}</dd>
                      </div>
                      <div>
                        <dt>만기 수령액</dt>
                        <dd>{formatMoney(savings.maturityPayout)}</dd>
                      </div>
                      <div>
                        <dt>다음 납입</dt>
                        <dd>{savings.nextPaymentTurn}턴</dd>
                      </div>
                      <div>
                        <dt>납입 실패</dt>
                        <dd>{savings.failedPayments}회</dd>
                      </div>
                    </dl>
                  ) : (
                    <p>현재 가입 중인 적금이 없습니다.</p>
                  )}
                </article>
              </div>

              <div className="asset-overview-section-title asset-overview-section-title--sub">
                <div>
                  <h3>부동산 보험</h3>
                  <p>현재 턴 기준으로 보장이 유효한 계약만 표시합니다.</p>
                </div>
                <strong>{insurances.length}건</strong>
              </div>

              {insurances.length === 0 ? (
                <EmptyState>현재 유효한 부동산 보험이 없습니다.</EmptyState>
              ) : (
                <div className="asset-insurance-list">
                  {insurances.map((insurance) => (
                    <article key={insurance.propertyId}>
                      <span>
                        <small>{insurance.planName}</small>
                        <strong>{insurance.propertyName}</strong>
                      </span>
                      <dl>
                        <div>
                          <dt>보장률</dt>
                          <dd>{Math.round(insurance.coverageRate * 100)}%</dd>
                        </div>
                        <div>
                          <dt>납부 보험료</dt>
                          <dd>{formatMoney(insurance.premiumPaid)}</dd>
                        </div>
                        <div>
                          <dt>남은 기간</dt>
                          <dd>{insurance.remainingTurns}턴</dd>
                        </div>
                        <div>
                          <dt>만료</dt>
                          <dd>{insurance.expiresAfterTurn}턴 종료 후</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "STOCK" && (
            <section className="asset-overview-tab-section">
              <div className="asset-overview-section-title">
                <div>
                  <h3>보유 주식</h3>
                  <p>평균 매입가 기준 평가손익과 수익률입니다.</p>
                </div>
                <span className="asset-stock-total">
                  <strong>{formatMoney(totals.stockValue)}</strong>
                  <small
                    className={
                      totals.stockProfitLoss > 0
                        ? "is-profit"
                        : totals.stockProfitLoss < 0
                          ? "is-loss"
                          : ""
                    }
                  >
                    {formatMoney(totals.stockProfitLoss)} ·{" "}
                    {formatRate(totals.stockProfitRate)}
                  </small>
                </span>
              </div>

              {!canSellStocks && stocks.length > 0 && (
                <div className="asset-overview-notice">
                  본인 주식 거래 단계에서만 이 창에서 바로 매도할 수 있습니다.
                </div>
              )}

              {stockErrorLabel && (
                <div className="asset-overview-error">{stockErrorLabel}</div>
              )}

              {stocks.length === 0 ? (
                <EmptyState>보유 중인 주식이 없습니다.</EmptyState>
              ) : (
                <StockLiquidationList
                  assets={stocks}
                  onSellStock={onSellStock}
                  disabled={!canSellStocks}
                  disabledMessage="주식 거래 단계에서 매도 가능"
                />
              )}
            </section>
          )}

          {activeTab === "OTHER" && (
            <section className="asset-overview-tab-section">
              <div className="asset-overview-section-title">
                <div>
                  <h3>경매 아이템</h3>
                  <p>
                    아이템 사용은 기존 게임 화면의 아이템 패널에서 진행합니다.
                  </p>
                </div>
                <strong>{auctionItems.length}/3개</strong>
              </div>

              {auctionItems.length === 0 ? (
                <EmptyState>보유 중인 경매 아이템이 없습니다.</EmptyState>
              ) : (
                <div className="asset-item-list">
                  {auctionItems.map((item) => (
                    <article
                      key={item.key}
                      className={item.rarity === "RARE" ? "is-rare" : ""}
                    >
                      <span>{item.rarity === "RARE" ? "희귀" : "일반"}</span>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <small>{item.useModeLabel}</small>
                    </article>
                  ))}
                </div>
              )}

              <div className="asset-overview-section-title asset-overview-section-title--sub">
                <div>
                  <h3>{lottoDrawNumber}회차 로또</h3>
                  <p>아직 추첨되지 않은 본인 보유 용지입니다.</p>
                </div>
                <strong>{lottoTickets.length}장</strong>
              </div>

              {lottoTickets.length === 0 ? (
                <EmptyState>현재 회차에 보유한 로또가 없습니다.</EmptyState>
              ) : (
                <div className="asset-lotto-list">
                  {lottoTickets.map((ticket, index) => (
                    <article key={ticket.id}>
                      <header>
                        <strong>
                          {ticket.drawNumber}회차 · {index + 1}번 용지
                        </strong>
                        <small>{ticket.purchasedTurn}턴 구입</small>
                      </header>
                      <div>
                        {ticket.numbers.map((number) => (
                          <span key={number}>{number}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="asset-escape-card">
                <span>구치소 탈출권</span>
                <strong>{player.jailEscapeCards ?? 0}장</strong>
              </div>
            </section>
          )}
        </div>
      </section>

      {selectedProperty && (
        <div
          className="property-card-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedProperty.name} 부동산 카드`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedPropertyId(null);
            }
          }}
        >
          <PropertyCard
            property={selectedProperty}
            onClose={() => setSelectedPropertyId(null)}
          />
        </div>
      )}
    </div>
  );
}
