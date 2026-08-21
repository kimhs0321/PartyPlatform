import { useEffect, useMemo, useState } from "react";
import type { PlayerTokenData } from "./PlayerToken";
import {
  getAvailableShareCount,
  getStockPrice,
  getStockQuote,
} from "../game/stock/stockMarket";
import { getStockHolding } from "../game/stock/stockTrading";
import type {
  StockCompanyData,
  StockIndustryData,
  StockMarketMap,
  StockPortfolioMap,
  StockTradeError,
} from "../game/stock/stockTypes";
import "./StockMarketModal.css";

interface StockMarketModalProps {
  open: boolean;
  player: PlayerTokenData;
  industries: StockIndustryData[];
  companies: StockCompanyData[];
  market: StockMarketMap;
  portfolios: StockPortfolioMap;
  error: StockTradeError | null;
  onBuy: (companyId: string, quantity: number) => void;
  onSell: (companyId: string, quantity: number) => void;
  onClose: () => void;
}

type MarketView = "ALL" | "OWNED";

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}만원`;
}

function formatRate(rate: number): string {
  const percentage = rate * 100;
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

function getChangeClass(value: number): string {
  if (value > 0) return "is-up";
  if (value < 0) return "is-down";
  return "is-flat";
}

function getErrorLabel(error: StockTradeError | null): string | null {
  switch (error) {
    case "INVALID_QUANTITY":
      return "거래 수량을 확인해 주세요.";
    case "INSUFFICIENT_FUNDS":
      return "현금이 부족합니다.";
    case "INSUFFICIENT_SHARES":
      return "시장에 남아 있는 주식이 부족합니다.";
    case "INSUFFICIENT_HOLDING":
      return "보유 수량이 부족합니다.";
    case "TRADING_UNAVAILABLE":
      return "현재 거래할 수 없는 종목입니다.";
    case "NOT_TRADING_PHASE":
      return "현재는 주식 거래 단계가 아닙니다.";
    case "COMPANY_NOT_FOUND":
      return "종목 정보를 찾을 수 없습니다.";
    default:
      return null;
  }
}

export function StockMarketModal({
  open,
  player,
  industries,
  companies,
  market,
  portfolios,
  error,
  onBuy,
  onSell,
  onClose,
}: StockMarketModalProps) {
  const [marketView, setMarketView] = useState<MarketView>("ALL");
  const [industryId, setIndustryId] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    companies[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const filteredCompanies = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("ko-KR");

    return companies.filter((company) => {
      const holding = getStockHolding(portfolios, player.id, company.id);
      const matchesView =
        marketView === "ALL" || (holding?.quantity ?? 0) > 0;
      const matchesIndustry =
        industryId === "ALL" || company.industry === industryId;
      const matchesSearch =
        keyword.length === 0 ||
        company.name.toLocaleLowerCase("ko-KR").includes(keyword) ||
        company.ticker.toLocaleLowerCase("ko-KR").includes(keyword);

      return matchesView && matchesIndustry && matchesSearch;
    });
  }, [
    companies,
    industryId,
    marketView,
    player.id,
    portfolios,
    searchText,
  ]);

  useEffect(() => {
    if (!open) return;

    if (
      !filteredCompanies.some(
        (company) => company.id === selectedCompanyId,
      )
    ) {
      setSelectedCompanyId(filteredCompanies[0]?.id ?? "");
    }

    setQuantity(1);
  }, [filteredCompanies, open, selectedCompanyId]);

  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyId) ??
    filteredCompanies[0] ??
    null;

  const selectedQuote = selectedCompany
    ? getStockQuote(market, selectedCompany.id)
    : null;

  const selectedHolding = selectedCompany
    ? getStockHolding(portfolios, player.id, selectedCompany.id)
    : null;

  const currentPrice = selectedCompany
    ? getStockPrice(market, selectedCompany.id)
    : 0;

  const availableShares = selectedCompany
    ? getAvailableShareCount(selectedCompany, portfolios)
    : 0;

  const safeQuantity = Math.max(1, Math.trunc(quantity || 1));
  const totalPrice = currentPrice * safeQuantity;

  const selectedHoldingQuantity = selectedHolding?.quantity ?? 0;
  const selectedAveragePrice = selectedHolding?.averagePurchasePrice ?? 0;
  const selectedMarketValue = selectedHoldingQuantity * currentPrice;
  const selectedInvestment = selectedHoldingQuantity * selectedAveragePrice;
  const selectedProfitLoss = selectedMarketValue - selectedInvestment;
  const selectedProfitLossRate =
    selectedInvestment > 0 ? selectedProfitLoss / selectedInvestment : 0;

  const maxBuyQuantity =
    currentPrice > 0
      ? Math.max(
          0,
          Math.min(
            availableShares,
            Math.floor(player.money / currentPrice),
          ),
        )
      : 0;

  const portfolioSummary = useMemo(() => {
    let investedAmount = 0;
    let marketValue = 0;
    let holdingCount = 0;

    for (const company of companies) {
      const holding = getStockHolding(portfolios, player.id, company.id);
      if (!holding || holding.quantity <= 0) continue;

      const price = getStockPrice(market, company.id);
      investedAmount += holding.quantity * holding.averagePurchasePrice;
      marketValue += holding.quantity * price;
      holdingCount += 1;
    }

    const profitLoss = marketValue - investedAmount;
    const profitLossRate =
      investedAmount > 0 ? profitLoss / investedAmount : 0;

    return {
      investedAmount,
      marketValue,
      profitLoss,
      profitLossRate,
      holdingCount,
    };
  }, [companies, market, player.id, portfolios]);

  const selectedIndustryName = selectedCompany
    ? industries.find(
        (industry) => industry.id === selectedCompany.industry,
      )?.name ?? selectedCompany.industry
    : "";

  const errorLabel = getErrorLabel(error);

  if (!open) return null;

  return (
    <div className="stock-market-overlay" role="dialog" aria-modal="true">
      <section className="stock-market-modal">
        <header className="stock-market-modal__header">
          <div className="stock-market-modal__brand">
            <span>ULSAN EXCHANGE</span>
            <h2>울산 증권거래소</h2>
          </div>

          <div className="stock-market-modal__account-strip">
            <div>
              <span>주문 가능</span>
              <strong>{formatMoney(player.money)}</strong>
            </div>
            <div>
              <span>주식 평가액</span>
              <strong>{formatMoney(portfolioSummary.marketValue)}</strong>
            </div>
            <div>
              <span>평가손익</span>
              <strong className={getChangeClass(portfolioSummary.profitLoss)}>
                {formatMoney(portfolioSummary.profitLoss)}
              </strong>
            </div>
            <div>
              <span>수익률</span>
              <strong
                className={getChangeClass(
                  portfolioSummary.profitLossRate,
                )}
              >
                {formatRate(portfolioSummary.profitLossRate)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="stock-market-modal__close"
            onClick={onClose}
            aria-label="주식 거래소 닫기"
          >
            ×
          </button>
        </header>

        <div className="stock-market-modal__body">
          <aside className="stock-market-sidebar">
            <div className="stock-market-sidebar__tabs">
              <button
                type="button"
                className={marketView === "ALL" ? "is-active" : ""}
                onClick={() => setMarketView("ALL")}
              >
                시장 전체
              </button>
              <button
                type="button"
                className={marketView === "OWNED" ? "is-active" : ""}
                onClick={() => setMarketView("OWNED")}
              >
                보유 종목
                <small>{portfolioSummary.holdingCount}</small>
              </button>
            </div>

            <label className="stock-market-sidebar__search">
              <span>종목 검색</span>
              <input
                type="search"
                placeholder="종목명 또는 코드"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>

            <nav
              className="stock-market-sidebar__industries"
              aria-label="산업 테마"
            >
              <button
                type="button"
                className={industryId === "ALL" ? "is-active" : ""}
                onClick={() => setIndustryId("ALL")}
              >
                <span>전체 산업</span>
                <small>{companies.length}</small>
              </button>

              {industries.map((industry) => {
                const count = companies.filter(
                  (company) => company.industry === industry.id,
                ).length;

                return (
                  <button
                    type="button"
                    key={industry.id}
                    className={
                      industryId === industry.id ? "is-active" : ""
                    }
                    onClick={() => setIndustryId(industry.id)}
                  >
                    <span>{industry.name}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="stock-market-board">
            <header className="stock-market-board__header">
              <div>
                <span>
                  {marketView === "ALL" ? "시장 전체" : "보유 종목"}
                </span>
                <strong>{filteredCompanies.length}개 종목</strong>
              </div>
              <small>종목을 선택하면 오른쪽에서 바로 주문할 수 있습니다.</small>
            </header>

            <div className="stock-market-table">
              <div className="stock-market-table__head">
                <span>종목</span>
                <span>현재가</span>
                <span>등락</span>
                <span>보유</span>
              </div>

              <div className="stock-market-table__body">
                {filteredCompanies.length === 0 ? (
                  <div className="stock-market-table__empty">
                    조건에 맞는 종목이 없습니다.
                  </div>
                ) : (
                  filteredCompanies.map((company) => {
                    const quote = getStockQuote(market, company.id);
                    const holding = getStockHolding(
                      portfolios,
                      player.id,
                      company.id,
                    );
                    const changeRate = quote?.lastChangeRate ?? 0;
                    const price = quote?.currentPrice ?? company.basePrice;

                    return (
                      <button
                        type="button"
                        key={company.id}
                        className={`stock-market-table__row${
                          selectedCompany?.id === company.id
                            ? " is-selected"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedCompanyId(company.id);
                          setQuantity(1);
                        }}
                      >
                        <span className="stock-market-table__company">
                          <strong>{company.name}</strong>
                          <small>
                            {company.ticker} ·{" "}
                            {industries.find(
                              (industry) =>
                                industry.id === company.industry,
                            )?.name ?? company.industry}
                          </small>
                        </span>
                        <b>{formatMoney(price)}</b>
                        <em className={getChangeClass(changeRate)}>
                          {formatRate(changeRate)}
                        </em>
                        <i>{holding?.quantity ?? 0}주</i>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="stock-order-panel">
            {selectedCompany && selectedQuote ? (
              <>
                <header className="stock-order-panel__header">
                  <div>
                    <span>{selectedIndustryName}</span>
                    <h3>{selectedCompany.name}</h3>
                    <small>
                      {selectedCompany.ticker} ·{" "}
                      {selectedCompany.marketRole}
                    </small>
                  </div>

                  <b
                    className={
                      selectedQuote.status === "NORMAL"
                        ? "is-open"
                        : "is-closed"
                    }
                  >
                    {selectedQuote.status === "NORMAL"
                      ? "거래 가능"
                      : "거래 정지"}
                  </b>
                </header>

                <section className="stock-order-panel__price">
                  <span>현재가</span>
                  <strong>{formatMoney(selectedQuote.currentPrice)}</strong>
                  <em
                    className={getChangeClass(
                      selectedQuote.lastChangeRate,
                    )}
                  >
                    {formatRate(selectedQuote.lastChangeRate)}
                  </em>
                </section>

                <section className="stock-order-panel__holding">
                  <div>
                    <span>내 보유</span>
                    <strong>{selectedHoldingQuantity}주</strong>
                  </div>
                  <div>
                    <span>평균 매입가</span>
                    <strong>{formatMoney(selectedAveragePrice)}</strong>
                  </div>
                  <div>
                    <span>평가손익</span>
                    <strong className={getChangeClass(selectedProfitLoss)}>
                      {formatMoney(selectedProfitLoss)}
                    </strong>
                  </div>
                  <div>
                    <span>수익률</span>
                    <strong
                      className={getChangeClass(
                        selectedProfitLossRate,
                      )}
                    >
                      {formatRate(selectedProfitLossRate)}
                    </strong>
                  </div>
                </section>

                <section className="stock-order-panel__order">
                  <header>
                    <span>시장가 주문</span>
                    <strong>{formatMoney(totalPrice)}</strong>
                  </header>

                  <div className="stock-order-panel__quick">
                    {[1, 5, 10].map((value) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setQuantity(value)}
                      >
                        {value}주
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={maxBuyQuantity <= 0}
                      onClick={() =>
                        setQuantity(Math.max(maxBuyQuantity, 1))
                      }
                    >
                      최대 매수
                    </button>
                    <button
                      type="button"
                      disabled={selectedHoldingQuantity <= 0}
                      onClick={() =>
                        setQuantity(
                          Math.max(selectedHoldingQuantity, 1),
                        )
                      }
                    >
                      전량 매도
                    </button>
                  </div>

                  <label className="stock-order-panel__quantity">
                    <span>주문 수량</span>
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.max(1, current - 1),
                          )
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(selectedCompany.totalShares, 1)}
                        value={safeQuantity}
                        onChange={(event) =>
                          setQuantity(
                            Math.max(
                              1,
                              Math.trunc(
                                Number(event.target.value) || 1,
                              ),
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => current + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </label>

                  <dl className="stock-order-panel__summary">
                    <div>
                      <dt>시장 잔량</dt>
                      <dd>{availableShares}주</dd>
                    </div>
                    <div>
                      <dt>주문 총액</dt>
                      <dd>{formatMoney(totalPrice)}</dd>
                    </div>
                  </dl>

                  {errorLabel && (
                    <p className="stock-order-panel__error" role="alert">
                      {errorLabel}
                    </p>
                  )}

                  <div className="stock-order-panel__buttons">
                    <button
                      type="button"
                      className="stock-buy-button"
                      disabled={
                        selectedQuote.status !== "NORMAL" ||
                        availableShares < safeQuantity ||
                        player.money < totalPrice
                      }
                      onClick={() =>
                        onBuy(selectedCompany.id, safeQuantity)
                      }
                    >
                      <span>매수</span>
                      <strong>{safeQuantity}주</strong>
                    </button>

                    <button
                      type="button"
                      className="stock-sell-button"
                      disabled={
                        selectedHoldingQuantity < safeQuantity
                      }
                      onClick={() =>
                        onSell(selectedCompany.id, safeQuantity)
                      }
                    >
                      <span>매도</span>
                      <strong>{safeQuantity}주</strong>
                    </button>
                  </div>
                </section>

                <p className="stock-order-panel__description">
                  {selectedCompany.businessSummary}
                </p>
              </>
            ) : (
              <div className="stock-order-panel__empty">
                주문할 종목을 선택해 주세요.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
