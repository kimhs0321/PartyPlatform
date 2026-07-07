import { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";

export type ChatMessage = {
  playerId: string;
  playerName: string;
  text: string;
  createdAt: number;
};

type ChatPanelProps = {
  title: string;
  messages: ChatMessage[];
  value: string;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatPanel({
  title,
  messages,
  value,
  placeholder = "채팅을 입력하세요.",
  disabled = false,
  emptyText = "아직 채팅이 없습니다.",
  onChange,
  onSend,
}: ChatPanelProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <h2>{title}</h2>
        <span>{messages.length}개 메시지</span>
      </div>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">{emptyText}</p>
        ) : (
          messages.map((message) => (
            <div
              className="chat-item"
              key={`${message.playerId}-${message.createdAt}`}
            >
              <strong>{message.playerName}</strong>
              <span>{message.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="chat-input">
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim() && !disabled) {
              onSend();
            }
          }}
        />

        <button onClick={onSend} disabled={disabled || !value.trim()}>
          전송
        </button>
      </div>
    </section>
  );
}