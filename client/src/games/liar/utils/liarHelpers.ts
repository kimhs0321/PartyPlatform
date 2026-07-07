export function phaseLabel(phase: string) {
          switch (phase) {
            case "READY_CHECK":
              return "준비";
            case "DESCRIPTION":
              return "설명";
            case "REACTION":
              return "평가";
            case "DISCUSSION":
              return "토론";
            case "VOTING":
              return "투표";
            case "LIAR_GUESS":
              return "라이어 추측";  
            case "RESULT":
              return "결과";
            case "TIE_SPEECH":
              return "최후 변론";
            case "REVOTE":
              return "재투표";
            case "GAME_END":
              return "게임 종료";   
            default:
              return phase;
          }
        }

export function statusLabel(status?: string) {
          switch (status) {
            case "ACTIVE":
              return "진행";
            case "DONE":
              return "완료";
            case "WAITING":
              return "대기";
            case "LEFT":
              return "퇴장";
            default:
              return "-";
          }
        }

export function formatScore(score: number) {
          return Number.isInteger(score)
            ? score.toString()
            : score.toFixed(1);
        }

