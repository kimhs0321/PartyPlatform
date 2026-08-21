import "./JailTurnModal.css";

import {
  JAIL_BAIL_AMOUNT,
  JAIL_FORCED_RELEASE_FINE,
  JAIL_MAX_FAILED_DOUBLE_ATTEMPTS,
} from "../game/jail/jailRules";

import type {
  JailActionError,
} from "../game/jail/jailTypes";

import type {
  PlayerTokenData,
} from "./PlayerToken";

interface JailTurnModalProps {
  player:
    PlayerTokenData | null;

  error:
    JailActionError | null;

  busy: boolean;
  canInteract: boolean;

  onPayBail: () => void;
  onTryDouble: () => void;
  onUseEscapeCard: () => void;
}

function getErrorMessage(
  error:
    JailActionError | null,
): string | null {
  switch (error) {
    case "INSUFFICIENT_FUNDS":
      return "보석금을 낼 현금이 부족합니다. 더블 도전 또는 탈출권을 선택하세요.";

    case "NO_ESCAPE_CARD":
      return "보유한 구치소 탈출권이 없습니다.";

    case "ACTION_IN_PROGRESS":
      return "현재 구치소 행동을 처리하고 있습니다.";

    case "NO_ACTIVE_PRISONER":
      return "수감 상태인 현재 플레이어를 찾지 못했습니다.";

    default:
      return null;
  }
}

export function JailTurnModal({
  player,
  error,
  busy,
  canInteract,
  onPayBail,
  onTryDouble,
  onUseEscapeCard,
}: JailTurnModalProps) {
  if (!player?.isJailed) {
    return null;
  }

  const attempts =
    Math.max(
      0,
      player.jailFailedAttempts ?? 0,
    );

  const remainingAttempts =
    Math.max(
      0,
      JAIL_MAX_FAILED_DOUBLE_ATTEMPTS -
        attempts,
    );

  const escapeCards =
    Math.max(
      0,
      player.jailEscapeCards ?? 0,
    );

  const errorMessage =
    getErrorMessage(error);

  const disabled =
    busy || !canInteract;

  return (
    <div className="jail-turn-overlay">
      <section
        className="jail-turn-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jail-turn-title"
      >
        <div className="jail-turn-modal__header">
          <div>
            <span>
              구치소 수감 중
            </span>

            <h2 id="jail-turn-title">
              {player.name}의 선택
            </h2>
          </div>

          <div className="jail-turn-modal__attempts">
            실패 {attempts}/
            {JAIL_MAX_FAILED_DOUBLE_ATTEMPTS}
          </div>
        </div>

        <p className="jail-turn-modal__description">
          더블 도전은 실패해도 별도 관리비가 없습니다.
          세 번째 실패 시{" "}
          {JAIL_FORCED_RELEASE_FINE.toLocaleString(
            "ko-KR",
          )}
          만원 벌금을 납부하고 출소하며,
          그 차례에는 이동하지 않습니다.
        </p>

        <div className="jail-turn-modal__choices">
          <button
            type="button"
            onClick={onPayBail}
            disabled={
              disabled ||
              player.money <
                JAIL_BAIL_AMOUNT
            }
          >
            <strong>
              보석금 납부
            </strong>

            <span>
              {JAIL_BAIL_AMOUNT.toLocaleString(
                "ko-KR",
              )}
              만원 납부 후 즉시 주사위 이동
            </span>
          </button>

          <button
            type="button"
            onClick={onTryDouble}
            disabled={disabled}
          >
            <strong>
              더블 도전
            </strong>

            <span>
              남은 도전 {remainingAttempts}회
              · 성공하면 나온 수만큼 이동
            </span>
          </button>

          <button
            type="button"
            onClick={onUseEscapeCard}
            disabled={
              disabled ||
              escapeCards <= 0
            }
          >
            <strong>
              구치소 탈출권 사용
            </strong>

            <span>
              보유 {escapeCards}장 · 사용 후
              즉시 주사위 이동
            </span>
          </button>
        </div>

        {errorMessage && (
          <p
            className="jail-turn-modal__error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        {busy && (
          <div className="jail-turn-modal__busy">
            구치소 행동을 처리하고 있습니다…
          </div>
        )}

        {!busy && !canInteract && (
          <div className="jail-turn-modal__busy">
            {player.name}님의 선택을 기다리고 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}