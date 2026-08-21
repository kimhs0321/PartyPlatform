import "./SalaryNotice.css";
export interface SalaryNoticeData {
  id: number;
  playerName: string;
  amount: number;
}

interface SalaryNoticeProps {
  notice: SalaryNoticeData | null;
}

export function SalaryNotice({ notice }: SalaryNoticeProps) {
  if (!notice) return null;

  return (
    <div className="salary-notice" role="status" aria-live="polite">
      <strong>{notice.playerName}</strong>
      <span>출발지를 통과해 월급 {notice.amount}만원을 받았습니다.</span>
    </div>
  );
}
