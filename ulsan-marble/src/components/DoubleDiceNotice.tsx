import "./DoubleDiceNotice.css";

export interface DoubleDiceNoticeData {
  id: number;
  tone: "EXTRA_ROLL" | "JAIL";
  title: string;
  message: string;
}

interface DoubleDiceNoticeProps {
  notice: DoubleDiceNoticeData | null;
}

export function DoubleDiceNotice({ notice }: DoubleDiceNoticeProps) {
  if (!notice) return null;

  return (
    <div
      key={notice.id}
      className={`double-dice-notice double-dice-notice--${notice.tone.toLowerCase()}`}
      role="status"
      aria-live="polite"
    >
      <strong>{notice.title}</strong>
      <span>{notice.message}</span>
    </div>
  );
}
