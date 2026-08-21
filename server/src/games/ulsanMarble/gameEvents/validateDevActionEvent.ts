import type {
  UlsanMarbleDevActionPayload,
} from "../../../../../shared/ulsanMarbleProtocol";

export function validateDevActionEvent(
  payload:
    UlsanMarbleDevActionPayload,
): void {
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "개발자 명령은 운영 환경에서 사용할 수 없습니다.",
    );
  }

  switch (payload.action) {
    case "TELEPORT_ACTIVE_PLAYER":
      if (
        !Number.isInteger(
          payload.position,
        ) ||
        payload.position < 0
      ) {
        throw new Error(
          "이동할 칸 위치가 올바르지 않습니다.",
        );
      }
      return;

    case "MOVE_ACTIVE_PLAYER":
      if (
        !Number.isInteger(
          payload.steps,
        )
      ) {
        throw new Error(
          "이동 칸 수가 올바르지 않습니다.",
        );
      }
      return;

    case "ROLL_FIXED_DICE":
      if (
        payload.values.length !== 2 ||
        payload.values.some(
          (value) =>
            !Number.isInteger(value) ||
            value < 1 ||
            value > 6,
        )
      ) {
        throw new Error(
          "주사위 값이 올바르지 않습니다.",
        );
      }
      return;

    default:
      throw new Error(
        "지원하지 않는 개발자 명령입니다.",
      );
  }
}