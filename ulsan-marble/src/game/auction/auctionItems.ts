import type { AuctionItemDefinition, AuctionItemId } from "./auctionTypes";

export const AUCTION_START_PRICE = 50;
export const AUCTION_MINIMUM_INCREMENT = 10;
export const AUCTION_RESPONSE_TIME_MS = 8_000;
export const MAX_AUCTION_ITEMS_PER_PLAYER = 3;

export const AUCTION_ITEMS: AuctionItemDefinition[] = [
  {
    id: "DICE_REROLL",
    name: "주사위 재굴림권",
    description: "이동 전에 주사위 2개를 한 번 다시 굴리고 두 번째 결과를 적용합니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "REACTION",
  },
  {
    id: "TOLL_EXEMPTION",
    name: "통행료 면제권",
    description: "통행료가 발생했을 때 1회 전액 면제받습니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "REACTION",
  },
  {
    id: "CONSTRUCTION_SUPPORT",
    name: "건설 지원권",
    description: "다음 건설비가 30% 감소합니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "AUTOMATIC",
  },
  {
    id: "TAX_DISCOUNT",
    name: "지방세 감면권",
    description: "다음 정기 부동산 세금이 50% 감소합니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "AUTOMATIC",
  },
  {
    id: "DISASTER_SUPPORT",
    name: "재난복구 지원권",
    description: "다음 자연재해 복구비가 50% 감소합니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "AUTOMATIC",
  },
  {
    id: "SAVINGS_GRACE",
    name: "적금 납입 유예권",
    description: "적금 납입 실패 1회를 무효로 하고 다음 납입일만 1턴 연장합니다.",
    rarity: "COMMON",
    copies: 2,
    useMode: "AUTOMATIC",
  },
  {
    id: "EMERGENCY_FLIGHT",
    name: "긴급 항공권",
    description: "자기 차례 주사위 전에 원하는 부동산 칸으로 이동합니다. 출발지 통과 급여는 없습니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "TARGETED",
  },
  {
    id: "TOLL_BOOST",
    name: "통행료 증폭권",
    description: "선택한 본인 부동산의 다음 통행료를 50% 증가시킵니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "TARGETED",
  },
  {
    id: "PROPERTY_DEFENSE",
    name: "부동산 방어권",
    description: "선택한 본인 부동산의 다음 가격 하락을 무효화합니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "TARGETED",
  },
  {
    id: "PORT_CARGO_INSURANCE",
    name: "항구 적하보험",
    description: "다음 울산항 계약 실패 시 투자금의 80%를 회수합니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "AUTOMATIC",
  },
  {
    id: "DEPOSIT_BONUS",
    name: "일반예금 우대권",
    description: "다음 일반예금 이자 지급액이 2배가 됩니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "AUTOMATIC",
  },
  {
    id: "STOCK_LOSS_PROTECTION",
    name: "주식 손실보전권",
    description: "선택한 보유 테마의 다음 시장 변동 손실액 중 50%를 현금으로 보전합니다.",
    rarity: "RARE",
    copies: 1,
    useMode: "TARGETED",
  },
];

const ITEM_MAP = new Map<AuctionItemId, AuctionItemDefinition>(
  AUCTION_ITEMS.map((item) => [item.id, item]),
);

export function getAuctionItemDefinition(
  itemId: AuctionItemId,
): AuctionItemDefinition {
  const item = ITEM_MAP.get(itemId);
  if (!item) throw new Error(`Unknown auction item: ${itemId}`);
  return item;
}
