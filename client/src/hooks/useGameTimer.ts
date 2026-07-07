import { useEffect, useMemo, useState } from "react";

type UseGameTimerArgs = {
  timerEndsAt: number | null;
  serverNow?: number;
  tickMs?: number;
  paused?: boolean;
  remainingTimeMs?: number | null;
};

export function useGameTimer({
  timerEndsAt,
  serverNow,
  tickMs = 1000,
  paused = false,
  remainingTimeMs = null,
}: UseGameTimerArgs) {
  const [clientNow, setClientNow] = useState(Date.now());

  const serverOffset = useMemo(() => {
    if (!serverNow) return 0;
    return serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    if (paused) return;

    const timer = window.setInterval(() => {
      setClientNow(Date.now());
    }, tickMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [tickMs, paused]);

  const syncedNow = clientNow + serverOffset;

  const remainingSeconds =
    paused && remainingTimeMs !== null
      ? Math.max(0, Math.ceil(remainingTimeMs / 1000))
      : timerEndsAt !== null
      ? Math.max(0, Math.ceil((timerEndsAt - syncedNow) / 1000))
      : 0;

  return {
    remainingSeconds,
    isExpired: !paused && timerEndsAt !== null && remainingSeconds <= 0,
    syncedNow,
  };
}