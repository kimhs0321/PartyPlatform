# 울산마블 맵 프로토타입

울산마블을 기존 플랫폼에 붙이기 전에 독립 실행으로 검증하기 위한 첫 단계입니다.
현재는 60칸 보드 렌더링만 구현되어 있습니다.

## 포함된 기능

- 60칸 JSON 데이터 로드
- 16×16 그리드 외곽에 60칸 배치
- 시작칸 기준 시계방향 순서
- 부동산 권역색 표시
- 부동산 기본 가격 표시
- 특별칸별 시각 구분
- 대표 랜드마크 표시
- 화면 크기에 맞는 정사각형 보드
- 데이터 중복 ID 및 위치 검증

## 아직 포함하지 않은 기능

- 플레이어 말
- 주사위
- 이동 애니메이션
- 턴 시스템
- 부동산 구매
- Socket.IO

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

## 핵심 파일

- `src/components/UlsanBoard.tsx`: 보드 전체
- `src/components/BoardTile.tsx`: 개별 칸
- `src/board/layout.ts`: 60칸 좌표 계산
- `src/data/board.json`: 보드 순서
- `src/data/properties.json`: 권역·가격 데이터
- `src/styles.css`: 전체 디자인

## 다음 구현 단계

플레이어 말 2~8개를 시작칸에 배치하고, 같은 칸에서 겹치지 않도록 슬롯을 나누는 기능입니다.


## npm 설치 오류가 날 때

이 프로젝트는 프로젝트 폴더의 `.npmrc`에서 공식 npm 레지스트리를 사용하도록 고정되어 있습니다.
기존 압축본에서 설치를 시도했다면 `node_modules`와 `package-lock.json`이 남아 있을 수 있으므로 새 압축본을 별도 폴더에 풀어 실행하세요.

```bash
npm install
npm run dev
```

레지스트리를 확인하려면 다음 명령을 사용하세요.

```bash
npm config get registry
```

출력은 `https://registry.npmjs.org/`이어야 합니다.


## 화면 크기

- 보드는 1600×960px를 기준으로 한 와이드형 레이아웃입니다.
- 각 칸은 최대 약 100×60px로 표시됩니다.
- 화면 폭이 좁아도 보드를 강제로 축소하지 않고 가로 스크롤을 사용합니다.
