import { useEffect, useMemo, useState } from "react";
import type { PlayerTokenData } from "./PlayerToken";
import {
  INSURANCE_DURATION_TURNS,
  INSURANCE_PLANS,
} from "../game/insurance/insuranceRules";
import type {
  InsurancePlanType,
  InsuranceShopError,
  InsurablePropertyAsset,
  PendingInsuranceShop,
} from "../game/insurance/insuranceTypes";
import { getDevelopmentStageLabel } from "../game/property/propertyDevelopment";
import "./InsuranceShopModal.css";

interface InsuranceShopModalProps {
  shop: PendingInsuranceShop | null;
  player: PlayerTokenData | null;
  assets: InsurablePropertyAsset[];
  turnNumber: number;
  error: InsuranceShopError | null;
  canInteract: boolean;
  onBuy: (propertyId: string, planType: InsurancePlanType) => void;
  onClose: () => void;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function getErrorMessage(error: InsuranceShopError | null): string | null {
  switch (error) {
    case "NO_PENDING_SHOP":
      return "현재 이용할 수 있는 보험사가 없습니다.";
    case "PLAN_NOT_FOUND":
      return "보험 상품 정보를 찾지 못했습니다.";
    case "PROPERTY_NOT_OWNED":
      return "해당 부동산의 소유 정보를 확인할 수 없습니다.";
    case "PROPERTY_NOT_DEVELOPED":
      return "미개발 토지는 재난 복구비가 없어 보험에 가입할 수 없습니다.";
    case "INSUFFICIENT_FUNDS":
      return "보험료를 납부할 현금이 부족합니다.";
    case "DOWNGRADE_NOT_ALLOWED":
      return "종합형 보험이 유지되는 동안 기본형으로 낮출 수 없습니다.";
    default:
    case "PAYMENT_FAILED":
      return "보험료 또는 보험 계약 처리에 실패했습니다.";  
      return null;
  }
}

function getActionLabel(
  asset: InsurablePropertyAsset,
  planType: InsurancePlanType,
): string {
  if (!asset.isContractActive) return "보험 가입 신청";
  if (asset.contract?.planType === planType) {
    return `${INSURANCE_DURATION_TURNS}턴 보장 연장`;
  }
  if (
    asset.contract?.planType === "BASIC" &&
    planType === "COMPREHENSIVE"
  ) {
    return `종합형 전환 및 ${INSURANCE_DURATION_TURNS}턴 연장`;
  }
  return "보험 가입 신청";
}

export function InsuranceShopModal({
  shop,
  player,
  assets,
  turnNumber,
  error,
  canInteract,
  onBuy,
  onClose,
}: InsuranceShopModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] =
    useState<string>("");
  const [selectedPlanType, setSelectedPlanType] =
    useState<InsurancePlanType>("BASIC");

  useEffect(() => {
    if (!shop) return;

    setSelectedPropertyId(assets[0]?.property.id ?? "");
    setSelectedPlanType("BASIC");
  }, [assets, shop]);

  const selectedAsset = useMemo(
    () =>
      assets.find(
        (asset) => asset.property.id === selectedPropertyId,
      ) ??
      assets[0] ??
      null,
    [assets, selectedPropertyId],
  );

  if (!shop || !player) return null;

  const errorMessage = getErrorMessage(error);
  const selectedPlan = INSURANCE_PLANS[selectedPlanType];
  const selectedPremium = selectedAsset
    ? selectedPlanType === "BASIC"
      ? selectedAsset.basicPremium
      : selectedAsset.comprehensivePremium
    : 0;
  const downgradeBlocked =
    selectedPlanType === "BASIC" &&
    selectedAsset?.isContractActive &&
    selectedAsset.contract?.planType === "COMPREHENSIVE";

  const canSubmit =
    canInteract &&
    Boolean(selectedAsset) &&
    !downgradeBlocked &&
    player.money >= selectedPremium;

  return (
    <div
      className="insurance-application"
      role="dialog"
      aria-modal="true"
      aria-label="울산안심보험 부동산 재해보험 청약"
    >
      <section className="insurance-application__document">
        <header className="insurance-application__masthead">
          <div className="insurance-application__brand">
            <span aria-hidden="true">◇</span>
            <div>
              <small>ULSAN SAFE INSURANCE</small>
              <strong>울산안심보험</strong>
            </div>
          </div>

          <div className="insurance-application__title">
            <span>PROPERTY DISASTER COVERAGE</span>
            <h2>부동산 재해보험 청약서</h2>
          </div>

          <button
            type="button"
            disabled={!canInteract}
            onClick={onClose}
          >
            이용 종료
          </button>
        </header>

        <div className="insurance-application__policy-strip">
          <dl>
            <div>
              <dt>계약자</dt>
              <dd>{player.name}</dd>
            </div>
            <div>
              <dt>보유 현금</dt>
              <dd>{formatMoney(player.money)}</dd>
            </div>
            <div>
              <dt>보장 개시</dt>
              <dd>보험료 납부 즉시</dd>
            </div>
          </dl>
          <span>청약번호 SAFE-{shop.tileId}-{player.id}</span>
        </div>

        {assets.length === 0 ? (
          <div className="insurance-application__empty">
            <span aria-hidden="true">◇</span>
            <strong>청약 가능한 부동산이 없습니다.</strong>
            <p>개발지·건물·랜드마크를 보유한 뒤 다시 방문하세요.</p>
            <button
              type="button"
              disabled={!canInteract}
              onClick={onClose}
            >
              보험사 이용 종료
            </button>
          </div>
        ) : (
          <div className="insurance-application__body">
            <section className="insurance-application__selection">
              <div className="insurance-form-heading">
                <span>01</span>
                <div>
                  <h3>피보험 부동산 선택</h3>
                  <p>재난 복구비 보장을 적용할 부동산을 선택합니다.</p>
                </div>
              </div>

              <div className="insurance-application__asset-list">
                {assets.map((asset) => {
                  const selected =
                    selectedAsset?.property.id === asset.property.id;

                  return (
                    <button
                      type="button"
                      key={asset.property.id}
                      className={selected ? "is-selected" : ""}
                      disabled={!canInteract}
                      onClick={() =>
                        setSelectedPropertyId(asset.property.id)
                      }
                    >
                      <div>
                        <strong>{asset.property.name}</strong>
                        <span>
                          {getDevelopmentStageLabel(
                            asset.ownership.stage,
                          )}{" "}
                          · 현재가 {formatMoney(asset.currentPrice)}
                        </span>
                      </div>

                      {asset.isContractActive && asset.contract ? (
                        <small className="is-active">
                          {INSURANCE_PLANS[asset.contract.planType].name}
                          {" · "}
                          {asset.remainingTurns}턴 남음
                        </small>
                      ) : asset.contract ? (
                        <small className="is-expired">
                          만료 · {asset.contract.expiresAfterTurn}턴 종료
                        </small>
                      ) : (
                        <small>미가입</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="insurance-application__coverage">
              <div className="insurance-form-heading">
                <span>02</span>
                <div>
                  <h3>보험상품 및 보장내용</h3>
                  <p>보험료와 재난 복구비 보장률을 확인합니다.</p>
                </div>
              </div>

              <div className="insurance-application__plans">
                {(
                  Object.values(INSURANCE_PLANS) as Array<
                    (typeof INSURANCE_PLANS)[keyof typeof INSURANCE_PLANS]
                  >
                ).map((plan) => {
                  const premium = selectedAsset
                    ? plan.type === "BASIC"
                      ? selectedAsset.basicPremium
                      : selectedAsset.comprehensivePremium
                    : 0;
                  const selected = selectedPlanType === plan.type;
                  const blocked =
                    plan.type === "BASIC" &&
                    selectedAsset?.isContractActive &&
                    selectedAsset.contract?.planType ===
                      "COMPREHENSIVE";

                  return (
                    <button
                      type="button"
                      key={plan.type}
                      className={`${selected ? "is-selected" : ""} ${
                        plan.type === "COMPREHENSIVE"
                          ? "is-comprehensive"
                          : ""
                      }`}
                      disabled={!canInteract ||blocked}
                      onClick={() => setSelectedPlanType(plan.type)}
                    >
                      <span>{plan.name}</span>
                      <strong>{formatMoney(premium)}</strong>
                      <dl>
                        <div>
                          <dt>보험료율</dt>
                          <dd>
                            현재가의{" "}
                            {Math.round(plan.premiumRate * 100)}%
                          </dd>
                        </div>
                        <div>
                          <dt>복구비 보장</dt>
                          <dd>
                            {Math.round(plan.coverageRate * 100)}%
                          </dd>
                        </div>
                        <div>
                          <dt>본인 부담</dt>
                          <dd>
                            {Math.round(
                              (1 - plan.coverageRate) * 100,
                            )}
                            %
                          </dd>
                        </div>
                        <div>
                          <dt>보장 기간</dt>
                          <dd>{INSURANCE_DURATION_TURNS}턴</dd>
                        </div>
                      </dl>
                      <small>
                        {blocked
                          ? "종합형 유지 중 선택 불가"
                          : selected
                            ? "선택된 보험상품"
                            : "상품 선택"}
                      </small>
                    </button>
                  );
                })}
              </div>

              {selectedAsset && (
                <article className="insurance-application__summary">
                  <div className="insurance-application__summary-title">
                    <span>청약 내용 확인</span>
                    <strong>{selectedAsset.property.name}</strong>
                  </div>

                  <dl>
                    <div>
                      <dt>피보험 부동산</dt>
                      <dd>{selectedAsset.property.name}</dd>
                    </div>
                    <div>
                      <dt>현재 평가액</dt>
                      <dd>{formatMoney(selectedAsset.currentPrice)}</dd>
                    </div>
                    <div>
                      <dt>가입 상품</dt>
                      <dd>{selectedPlan.name}</dd>
                    </div>
                    <div>
                      <dt>일시납 보험료</dt>
                      <dd>{formatMoney(selectedPremium)}</dd>
                    </div>
                    <div>
                      <dt>재난 복구비 보장</dt>
                      <dd>
                        {Math.round(selectedPlan.coverageRate * 100)}%
                      </dd>
                    </div>
                    <div>
                      <dt>계약자 본인 부담</dt>
                      <dd>
                        {Math.round(
                          (1 - selectedPlan.coverageRate) * 100,
                        )}
                        %
                      </dd>
                    </div>
                  </dl>

                  {selectedAsset.contract && (
                    <div className="insurance-application__existing">
                      <span>기존 계약</span>
                      <strong>
                        {
                          INSURANCE_PLANS[
                            selectedAsset.contract.planType
                          ].name
                        }
                      </strong>
                      <small>
                        {selectedAsset.isContractActive
                          ? `${selectedAsset.remainingTurns}턴 남음 · ${selectedAsset.contract.expiresAfterTurn}턴까지`
                          : `${selectedAsset.contract.expiresAfterTurn}턴 만료`}
                      </small>
                    </div>
                  )}

                  <p>
                    가입 즉시 효력이 발생합니다. 같은 상품 재가입 또는
                    상위 상품 전환 시 기존 만료일에서{" "}
                    {INSURANCE_DURATION_TURNS}턴 연장됩니다. 부동산 매각
                    시 보험은 환급 없이 소멸합니다.
                  </p>

                  <button
                    type="button"
                    className="insurance-application__submit"
                    disabled={!canSubmit}
                    onClick={() =>
                      onBuy(
                        selectedAsset.property.id,
                        selectedPlanType,
                      )
                    }
                  >
                    {getActionLabel(
                      selectedAsset,
                      selectedPlanType,
                    )}
                  </button>

                  <div
                    className="insurance-application__seal"
                    aria-hidden="true"
                  >
                    보장개시
                  </div>
                </article>
              )}
            </section>
          </div>
        )}

        {errorMessage && (
          <p className="insurance-application__error" role="alert">
            {errorMessage}
          </p>
        )}

        {assets.length > 0 && (
          <footer className="insurance-application__footer">
            <span>
              재난 발생 시 계약 조건에 따라 복구비가 자동 보상됩니다.
            </span>
            <button
              type="button"
              disabled={!canInteract}
              onClick={onClose}
            >
              보험사 이용 종료
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
