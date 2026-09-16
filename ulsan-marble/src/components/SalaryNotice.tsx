import "./SalaryNotice.css";
export interface SalaryNoticeData {
  id: number;

  playerName: string;

  settlementTurn: number;
  salaryCycle: number;

  baseSalary: number;
  increaseAmount: number;
  policyBonus: number;

  amount: number;
  nextSalaryTurn: number;
}

interface SalaryNoticeProps {
  notice: SalaryNoticeData | null;
}

function formatMoney(
  amount: number,
): string {
  return `${amount.toLocaleString("ko-KR")}만원`;
}

function formatSignedMoney(
  amount: number,
): string {
  if (amount === 0) {
    return "0만원";
  }

  const sign =
    amount > 0
      ? "+"
      : "-";

  return `${sign}${Math.abs(amount).toLocaleString("ko-KR")}만원`;
}

export function SalaryNotice({
  notice,
}: SalaryNoticeProps) {
  if (!notice) {
    return null;
  }

  const policyClassName =
    notice.policyBonus > 0
      ? "is-positive"
      : notice.policyBonus < 0
        ? "is-negative"
        : "";

  return (
    <div
      className="salary-notice"
      role="status"
      aria-live="polite"
    >
      <div className="salary-notice__header">
        <span>
          ULSAN MARBLE PAYROLL
        </span>

        <strong>
          월급 지급 명세서
        </strong>
      </div>

      <div className="salary-notice__meta">
        <div>
          <span>수령인</span>
          <b>{notice.playerName}</b>
        </div>

        <div>
          <span>지급 기준</span>
          <b>
            제{notice.settlementTurn}턴 정기급여
          </b>
        </div>
      </div>

      <div className="salary-notice__breakdown">
        <div>
          <span>기본급</span>
          <b>
            {formatMoney(
              notice.baseSalary,
            )}
          </b>
        </div>

        <div>
          <span>누적 정기 인상</span>
          <b className="is-positive">
            {formatSignedMoney(
              notice.increaseAmount,
            )}
          </b>
        </div>

        <div>
          <span>시장 정책</span>
          <b className={policyClassName}>
            {formatSignedMoney(
              notice.policyBonus,
            )}
          </b>
        </div>
      </div>

      <div className="salary-notice__total">
        <span>실지급액</span>

        <strong>
          {formatMoney(
            notice.amount,
          )}
        </strong>
      </div>

      <div className="salary-notice__footer">
        <span>
          제{notice.salaryCycle}회 급여
        </span>

        <span>
          다음 지급 · 제{notice.nextSalaryTurn}턴
        </span>
      </div>
    </div>
  );
}