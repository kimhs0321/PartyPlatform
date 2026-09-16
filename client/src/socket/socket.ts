import { io } from "socket.io-client";

const SERVER_URL =
  `${window.location.protocol}//${window.location.hostname}:3000`;

const PLAYER_SESSION_ID_KEY =
  "party-platform-player-session-id";

function getOrCreatePlayerSessionId(): string {
  const saved =
    window.sessionStorage.getItem(
      PLAYER_SESSION_ID_KEY,
    );

  if (saved) {
    return saved;
  }

  const randomId =
    typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  const playerId = `player-${randomId}`;

  window.sessionStorage.setItem(
    PLAYER_SESSION_ID_KEY,
    playerId,
  );

  return playerId;
}

export const playerSessionId =
  getOrCreatePlayerSessionId();

export const socket = io(SERVER_URL, {
  autoConnect: false,
  auth: {
    playerSessionId,
  },
});