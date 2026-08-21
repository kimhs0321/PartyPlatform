import "./BankActivityNotice.css";
import type { BankNoticeData } from "../game/bank/bankTypes";

interface BankActivityNoticeProps {
  notice: BankNoticeData | null;
}

export function BankActivityNotice({ notice }: BankActivityNoticeProps) {
  if (!notice) return null;

  return (
    <aside
      className={`bank-activity-notice bank-activity-notice--${notice.tone.toLowerCase()}`}
      aria-live="polite"
    >
      <strong>{notice.title}</strong>
      <span>{notice.message}</span>
    </aside>
  );
}
