import type { CSSProperties } from "react";
import "./PlayerDock.css";

import type { PlayerTokenData } from "./PlayerToken";

interface PlayerDockProps {
  side: "left" | "right";
  players: PlayerTokenData[];
  activePlayerId: string;
  itemNamesByPlayer?: Record<string, string[]>;
}

export function PlayerDock({
  side,
  players,
  activePlayerId,
  itemNamesByPlayer = {},
}: PlayerDockProps) {
  const dockPlayers = players.filter((_, index) =>
    side === "left" ? index % 2 === 0 : index % 2 === 1,
  );

  return (
    <aside
      className={`player-dock player-dock--${side}`}
      aria-label={`${side === "left" ? "왼쪽" : "오른쪽"} 플레이어 UI`}
    >
      {dockPlayers.map((player) => {
        const active = player.id === activePlayerId;
        const itemNames = itemNamesByPlayer[player.id] ?? [];
        const style = {
          ["--player-color" as string]: player.color,
        } as CSSProperties;

        return (
          <div
            className={`player-card${active ? " player-card--active" : ""}${player.isBankrupt ? " player-card--bankrupt" : ""}${player.isJailed ? " player-card--jailed" : ""}`}
            key={player.id}
            style={style}
            aria-current={active ? "true" : undefined}
          >
            <span className="player-card__token">{player.shortName}</span>
            <span className="player-card__info">
              <strong>{player.name}</strong>
              <small>
                {player.isBankrupt
                  ? "파산"
                  : player.isJailed
                    ? `구치소 · 실패 ${player.jailFailedAttempts ?? 0}/3${(player.jailEscapeCards ?? 0) > 0 ? ` · 탈출권 ${player.jailEscapeCards}장` : ""}`
                    : active
                      ? "현재 차례"
                      : "대기 중"}
              </small>

              {itemNames.length > 0 && (
                <span
                  className="player-card__items"
                  title={itemNames.join(", ")}
                >
                  {itemNames.map((name, index) => (
                    <em key={`${name}-${index}`}>{name}</em>
                  ))}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
