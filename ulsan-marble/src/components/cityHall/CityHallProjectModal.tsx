import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import type { PlayerTokenData } from "../PlayerToken";
import type { StockIndustryData } from "../../game/stock/stockTypes";
import { getDevelopmentStageLabel } from "../../game/property/propertyDevelopment";
import {
  CITY_HALL_DEVELOPMENT_SUPPORT_RATE,
  CITY_HALL_PROPERTY_TAX_SUPPORT_RATE,
  getCityHallApplicationLabel,
  getCityHallProjectCategoryLabel,
} from "../../game/cityHall/cityHallRules";
import type {
  CityHallApplicationType,
  CityHallPropertyOption,
  PendingCityHallSelection,
} from "../../game/cityHall/cityHallTypes";
import "./CityHallProjectModal.css";

interface CityHallProjectModalProps {
  selection: PendingCityHallSelection | null;
  player: PlayerTokenData | null;
  industries: StockIndustryData[];
  properties: CityHallPropertyOption[];
  canInteract: boolean;

  onSubmit: (
    applicationType: CityHallApplicationType,
    propertyId: string,
  ) => void;

  onClose: () => void;
}

interface ApplicationDefinition {
  type: CityHallApplicationType;
  department: string;
  title: string;
  description: string;
  effect: string;
  propertyFilter: (property: CityHallPropertyOption) => boolean;
}

const APPLICATIONS: ApplicationDefinition[] = [
  {
    type: "DEVELOPMENT_PERMIT",
    department: "도시계획과",
    title: "개발제한 해제 신청",
    description:
      "개발 제한 또는 개발 제한 예정 상태인 보유 부동산의 행정 제한을 즉시 해제합니다.",
    effect: "선택 부동산 개발 제한 즉시 해제",
    propertyFilter: (property) => property.isRestricted,
  },
  {
    type: "DEVELOPMENT_SUPPORT",
    department: "지역개발과",
    title: "개발비 지원 신청",
    description:
      "개발 가능한 보유 부동산 한 곳에 다음 개발 공사비 지원을 승인합니다.",
    effect: `다음 개발비 ${Math.round(
      CITY_HALL_DEVELOPMENT_SUPPORT_RATE * 100,
    )}% 지원`,
    propertyFilter: (property) => property.canDevelop,
  },
  {
    type: "PROPERTY_TAX_SUPPORT",
    department: "세정지원과",
    title: "부동산세 지원 신청",
    description:
      "보유 부동산 한 곳에 다음 정기 부동산세 납부 지원을 승인합니다.",
    effect: `다음 부동산세 ${Math.round(
      CITY_HALL_PROPERTY_TAX_SUPPORT_RATE * 100,
    )}% 지원`,
    propertyFilter: () => true,
  },
];

export function CityHallProjectModal({
  selection,
  player,
  industries,
  properties,
  canInteract,
  onSubmit,
  onClose,
}: CityHallProjectModalProps) {
  const [applicationType, setApplicationType] =
    useState<CityHallApplicationType>("DEVELOPMENT_PERMIT");
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    if (!selection) return;

    const firstAvailableApplication = APPLICATIONS.find((item) =>
      properties.some(item.propertyFilter),
    );
    setApplicationType(
      firstAvailableApplication?.type ?? "DEVELOPMENT_PERMIT",
    );
    setPropertyId("");
  }, [properties, selection?.activatedTerm.instanceId]);

  const application =
    APPLICATIONS.find((item) => item.type === applicationType) ??
    APPLICATIONS[0];

  const eligibleProperties = useMemo(
    () =>
      application
        ? properties.filter(application.propertyFilter)
        : [],
    [application, properties],
  );

  useEffect(() => {
    if (
      propertyId &&
      eligibleProperties.some((property) => property.propertyId === propertyId)
    ) {
      return;
    }

    setPropertyId(eligibleProperties[0]?.propertyId ?? "");
  }, [eligibleProperties, propertyId]);

  if (!selection || !player || !application) return null;

  const term = selection.activatedTerm;
  const selectedIndustry = term.targetIndustryId
    ? industries.find((industry) => industry.id === term.targetIndustryId)
    : null;
  const selectedProperty = properties.find(
    (property) => property.propertyId === selection.propertyId,
  );
  const noAvailableApplication = APPLICATIONS.every(
    (item) => !properties.some(item.propertyFilter),
  );
  const completed = selection.stage === "COMPLETED";
  const formNumber = `ULS-${String(term.selectedTurn).padStart(3, "0")}-${term.instanceId
    .slice(-5)
    .toUpperCase()}`;

  const handleSubmit = () => {
    if (!canInteract || completed || !propertyId) return;
    onSubmit(applicationType, propertyId);
  };

  return (
    <div
      className="city-hall-project-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-hall-application-title"
    >
      <section
        className={[
          "city-hall-project-modal",
          completed ? "is-completed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="city-hall-project-modal__official-header">
          <div className="city-hall-project-modal__seal" aria-hidden="true">
            <span>울산</span>
          </div>
          <div>
            <small>ULSAN METROPOLITAN CITY</small>
            <strong>울산광역시청</strong>
            <span>시민 민원·행정지원 접수창구</span>
          </div>
          <dl>
            <div>
              <dt>문서번호</dt>
              <dd>{formNumber}</dd>
            </div>
            <div>
              <dt>처리상태</dt>
              <dd>{completed ? "처리완료" : "신청대기"}</dd>
            </div>
          </dl>
        </header>

        <section className="city-hall-project-modal__policy-notice">
          <div>
            <span>시청 도착 자동 발동</span>
            <small>{getCityHallProjectCategoryLabel(term.project.category)}</small>
          </div>
          <h2>{term.project.name}</h2>
          <p>{term.project.summary}</p>
          <strong>
            {term.project.effectDescription}
            {selectedIndustry ? ` · ${selectedIndustry.name} 적용` : ""}
          </strong>
          <em>
            {term.activeFromTurn}턴부터 {term.expiresAfterTurn}턴까지 · 총 {term.project.durationTurns}턴
          </em>
        </section>

        <div className="city-hall-project-modal__document">
          <div className="city-hall-project-modal__document-title">
            <span>울산광역시 행정지원 민원서식</span>
            <h2 id="city-hall-application-title">민원신청서</h2>
            <p>
              단기 시정사업은 자동 시행되며, 도착 플레이어는 별도의 개인
              행정지원을 한 건 신청합니다.
            </p>
          </div>

          <dl className="city-hall-project-modal__applicant">
            <div>
              <dt>신청인</dt>
              <dd>
                <i style={{ ["--applicant-color" as string]: player.color }}>
                  {player.shortName}
                </i>
                {player.name}
              </dd>
            </div>
            <div>
              <dt>접수 턴</dt>
              <dd>{term.selectedTurn}턴</dd>
            </div>
            <div>
              <dt>처리기관</dt>
              <dd>울산광역시청</dd>
            </div>
          </dl>

          {!completed ? (
            <>
              <fieldset className="city-hall-project-modal__services">
                <legend>1. 신청 민원 선택</legend>
                {APPLICATIONS.map((item) => {
                  const matchingProperties = properties.filter(
                    item.propertyFilter,
                  );
                  const disabled = matchingProperties.length === 0;

                  return (
                    <label
                      key={item.type}
                      className={[
                        "city-hall-service",
                        applicationType === item.type ? "is-selected" : "",
                        disabled ? "is-disabled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        type="radio"
                        name="city-hall-application"
                        value={item.type}
                        checked={applicationType === item.type}
                        disabled={!canInteract || disabled}
                        onChange={() => setApplicationType(item.type)}
                      />
                      <span className="city-hall-service__check" aria-hidden="true" />
                      <span className="city-hall-service__body">
                        <small>{item.department}</small>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                        <b>{item.effect}</b>
                      </span>
                      <em>
                        {disabled
                          ? "신청 대상 없음"
                          : `${matchingProperties.length}건 신청 가능`}
                      </em>
                    </label>
                  );
                })}
              </fieldset>

              <section className="city-hall-project-modal__target">
                <div>
                  <span>2. 대상 부동산</span>
                  <strong>{application.department} 처리 대상</strong>
                </div>

                <label>
                  <span>부동산 선택</span>
                  <select
                    value={propertyId}
                    disabled={!canInteract || eligibleProperties.length === 0}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setPropertyId(event.target.value)
                    }
                  >
                    {eligibleProperties.length === 0 ? (
                      <option value="">신청 가능한 부동산이 없습니다</option>
                    ) : (
                      eligibleProperties.map((property) => (
                        <option
                          key={property.propertyId}
                          value={property.propertyId}
                        >
                          {property.propertyName} · {getDevelopmentStageLabel(property.stage)}
                          {property.isRestricted ? " · 개발 제한" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <div className="city-hall-project-modal__pledge">
                  <span>신청 내용 확인</span>
                  <p>
                    선택한 부동산과 지원 내용을 확인했으며, 동일 종류의 기존
                    미사용 지원이 있다면 이번 승인 내용으로 대체됩니다.
                  </p>
                </div>
              </section>

              <footer className="city-hall-project-modal__footer">
                <div>
                  <span>접수 담당</span>
                  <strong>울산광역시 민원행정과</strong>
                </div>
                {noAvailableApplication ? (
                  <button
                    type="button"
                    className="is-secondary"
                    disabled={!canInteract}
                    onClick={onClose}
                  >
                    신청 대상 없음 · 시청 나가기
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canInteract || !propertyId}
                    onClick={handleSubmit}
                  >
                    민원 신청서 제출
                  </button>
                )}
              </footer>
            </>
          ) : (
            <section className="city-hall-project-modal__receipt">
              <span>민원 처리 결과</span>
              <h3>
                {selection.applicationType
                  ? getCityHallApplicationLabel(selection.applicationType)
                  : "행정지원 신청"}
              </h3>
              <dl>
                <div>
                  <dt>신청인</dt>
                  <dd>{player.name}</dd>
                </div>
                <div>
                  <dt>대상 부동산</dt>
                  <dd>{selectedProperty?.propertyName ?? "확인 불가"}</dd>
                </div>
                <div>
                  <dt>처리 결과</dt>
                  <dd>{selection.resultText ?? "승인 처리되었습니다."}</dd>
                </div>
              </dl>
              <button
                type="button"
                disabled={!canInteract}
                onClick={onClose}
              >
                처리 완료 확인
              </button>
            </section>
          )}
        </div>

        {completed && (
          <div className="city-hall-project-modal__approval-stamp" aria-hidden="true">
            <span>울산광역시</span>
            <strong>승인</strong>
            <small>처리완료</small>
          </div>
        )}
      </section>
    </div>
  );
}
