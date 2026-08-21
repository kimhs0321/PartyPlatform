import type { PlayerTokenData } from "../components/PlayerToken";

export const PROTOTYPE_LOCAL_PLAYER_ID = "player-1";

export const INITIAL_PLAYERS: PlayerTokenData[] = [
  {
    id: "player-1",
    name: "플레이어 1",
    shortName: "1",
    color: "#ff6b6b",
    position: 0,
    money: 2000,
    dock: "left",
  },
  {
    id: "player-2",
    name: "플레이어 2",
    shortName: "2",
    color: "#4dabf7",
    position: 0,
    money: 2000,
    dock: "left",
  },
  {
    id: "player-3",
    name: "플레이어 3",
    shortName: "3",
    color: "#ffd43b",
    position: 0,
    money: 2000,
    dock: "right",
  },
  {
    id: "player-4",
    name: "플레이어 4",
    shortName: "4",
    color: "#b197fc",
    position: 0,
    money: 2000,
    dock: "right",
  },
];

/* 아래부터 플랫폼 연결용 코드 추가 */

export type UlsanMarbleParticipantInput = {
  id: string;
  nickname: string;

  /*
   * 나중에 방에서 색상을 선택하는 기능을 추가할 때 사용한다.
   * 현재 플랫폼에서는 전달하지 않아도 된다.
   */
  color?: string;
};

const PLATFORM_PLAYER_COLORS = [
  "#ff6b6b", // 1번: 빨강
  "#4dabf7", // 2번: 파랑
  "#ffd43b", // 3번: 노랑
  "#b197fc", // 4번: 보라
  "#51cf66", // 5번: 초록
  "#ff922b", // 6번: 주황
  "#22b8cf", // 7번: 청록
  "#f06595", // 8번: 분홍
] as const;

export function createPlayersFromParticipants(
  participants: UlsanMarbleParticipantInput[],
  startingMoney: number,
): PlayerTokenData[] {
  const safeStartingMoney = Math.max(
    0,
    Math.round(startingMoney),
  );

  return participants.map((participant, index) => {
    const playerNumber = index + 1;
    const fallbackName = `플레이어 ${playerNumber}`;
    const trimmedNickname = participant.nickname.trim();

    return {
      id: participant.id,
      name: trimmedNickname || fallbackName,
      shortName: String(playerNumber),

      /*
       * 참가자가 직접 선택한 색상이 있으면 그것을 사용하고,
       * 없으면 참가 순서에 따라 기본 색상을 사용한다.
       */
      color:
        participant.color ??
        PLATFORM_PLAYER_COLORS[
          index % PLATFORM_PLAYER_COLORS.length
        ],

      position: 0,
      money: safeStartingMoney,
      dock: index % 2 === 0 ? "left" : "right",
      isBankrupt: false,
      isJailed: false,
      jailFailedAttempts: 0,
      jailEscapeCards: 0,
    };
  });
}