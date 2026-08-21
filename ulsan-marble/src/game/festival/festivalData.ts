import type {
  FestivalDefinition,
  FestivalId,
} from "./festivalTypes";

export const FESTIVAL_IDS: FestivalId[] = [
  "ULSAN_INDUSTRY",
  "NAM_WHALE",
  "JUNG_MADUHEE",
  "BUK_SOEBURI",
  "DONG_SHIPBUILDING",
  "ULJU_ONGGI",
];

export const FESTIVAL_DEFINITIONS: Record<
  FestivalId,
  FestivalDefinition
> = {
  ULSAN_INDUSTRY: {
    id: "ULSAN_INDUSTRY",
    name: "울산공업축제",
    shortName: "공업축제",
    theme: "CITY",
    districtId: null,
    tollMultiplier: 1.1,
    kicker: "ALL IN! ULSAN",
    description: "산업과 문화가 함께 빛나는 울산 대표 축제",
    effectLabel: "울산 전체 통행료 +10%",
    assets: {
      symbolSrc: "/assets/festivals/city/municipal-logo.png",
      logoSrc: "/assets/festivals/city/brand-logo.png",
      mascots: [
        {
          src: "/assets/festivals/city/mascot-main.png",
          alt: "울산 해울이 키드형 마스코트",
          role: "MAIN",
        },
        {
          src: "/assets/festivals/city/mascot-ship.png",
          alt: "울산 조선 산업 마스코트",
          role: "SUB",
        },
        {
          src: "/assets/festivals/city/mascot-car.png",
          alt: "울산 자동차 산업 마스코트",
          role: "SUB",
        },
        {
          src: "/assets/festivals/city/mascot-cheoyong.png",
          alt: "울산 처용 마스코트",
          role: "SMALL",
        },
      ],
    },
  },
  NAM_WHALE: {
    id: "NAM_WHALE",
    name: "울산고래축제",
    shortName: "고래축제",
    theme: "WHALE",
    districtId: "NAM",
    tollMultiplier: 1.2,
    kicker: "WHALE FESTIVAL",
    description: "고래와 바다가 어우러지는 남구 대표 축제",
    effectLabel: "남구 통행료 +20%",
    assets: {
      symbolSrc: "/assets/festivals/nam/symbol.png",
      logoSrc: "/assets/festivals/nam/logo.png",
      mascots: [
        {
          src: "/assets/festivals/nam/mascot-main.png",
          alt: "남구 장생이 손 흔드는 마스코트",
          role: "MAIN",
        },
        {
          src: "/assets/festivals/nam/mascot-alt.png",
          alt: "남구 장생이 보조 마스코트",
          role: "SUB",
        },
        {
          src: "/assets/festivals/nam/mascot-small.png",
          alt: "남구 장생이 작은 마스코트",
          role: "SMALL",
        },
      ],
    },
  },
  JUNG_MADUHEE: {
    id: "JUNG_MADUHEE",
    name: "태화강 마두희축제",
    shortName: "마두희축제",
    theme: "TRADITION",
    districtId: "JUNG",
    tollMultiplier: 1.2,
    kicker: "TAEHWAGANG MADUHEE",
    description: "큰 줄을 함께 당기는 중구 전통 화합 축제",
    effectLabel: "중구 통행료 +20%",
    assets: {
      symbolSrc: "/assets/festivals/jung/symbol.png",
      logoSrc: "/assets/festivals/jung/logo.png",
      mascots: [
        {
          src: "/assets/festivals/jung/mascot-main.png",
          alt: "중구 붉은 원피스 마스코트",
          role: "MAIN",
        },
      ],
    },
  },
  BUK_SOEBURI: {
    id: "BUK_SOEBURI",
    name: "울산쇠부리축제",
    shortName: "쇠부리축제",
    theme: "FIRE",
    districtId: "BUK",
    tollMultiplier: 1.2,
    kicker: "SOEBURI FESTIVAL",
    description: "불과 쇠, 산업의 뿌리를 만나는 북구 대표 축제",
    effectLabel: "북구 통행료 +20%",
    assets: {
      symbolSrc: "/assets/festivals/buk/symbol.png",
      logoSrc: "/assets/festivals/buk/logo.png",
      mascots: [
        {
          src: "/assets/festivals/buk/mascot-main.png",
          alt: "북구 불꽃 마스코트",
          role: "MAIN",
        },
        {
          src: "/assets/festivals/buk/mascot-sub.png",
          alt: "북구 초록 잎 마스코트",
          role: "SUB",
        },
      ],
    },
  },
  DONG_SHIPBUILDING: {
    id: "DONG_SHIPBUILDING",
    name: "울산조선해양축제",
    shortName: "조선해양축제",
    theme: "OCEAN",
    districtId: "DONG",
    tollMultiplier: 1.2,
    kicker: "SHIPBUILDING & SEA",
    description: "조선 산업과 바다를 즐기는 동구 대표 축제",
    effectLabel: "동구 통행료 +20%",
    assets: {
      symbolSrc: "/assets/festivals/dong/symbol.png",
      mascots: [
        {
          src: "/assets/festivals/dong/mascot-main.gif",
          alt: "동구 춤추는 방어진 용가자미 마스코트",
          role: "MAIN",
        },
        {
          src: "/assets/festivals/dong/mascot-scene.gif",
          alt: "동구 등대와 파도 장면",
          role: "SCENE",
        },
        {
          src: "/assets/festivals/dong/mascot-sub.gif",
          alt: "동구 응원하는 방어진 용가자미 마스코트",
          role: "SUB",
        },
      ],
      departureMascotSrc:
        "/assets/festivals/dong/mascot-departure.gif",
      completionMascotSrc:
        "/assets/festivals/dong/mascot-thanks.gif",
    },
  },
  ULJU_ONGGI: {
    id: "ULJU_ONGGI",
    name: "울산옹기축제",
    shortName: "옹기축제",
    theme: "ONGGI",
    districtId: "ULJU",
    tollMultiplier: 1.2,
    kicker: "ONGGI FESTIVAL",
    description: "외고산 옹기마을에서 만나는 울주군 대표 축제",
    effectLabel: "울주군 통행료 +20%",
    assets: {
      symbolSrc: "/assets/festivals/ulju/symbol.png",
      mascots: [
        {
          src: "/assets/festivals/ulju/mascot-main.png",
          alt: "울주군 양팔을 펼친 해뜨미 마스코트",
          role: "MAIN",
        },
        {
          src: "/assets/festivals/ulju/mascot-sub.png",
          alt: "울주군 응원하는 해뜨미 마스코트",
          role: "SUB",
        },
      ],
    },
  },
};

export function getFestivalDefinition(
  festivalId: FestivalId,
): FestivalDefinition {
  return FESTIVAL_DEFINITIONS[festivalId];
}
