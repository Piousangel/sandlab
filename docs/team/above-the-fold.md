# 첫 화면(above the fold)

사용자 결정(11-13): 최상단은 사이트에서 가장 중요한 땅이다. 매일 회의 상시 안건([OPERATING.md](./OPERATING.md) 3장).

## 현황 (2026-11-13, 실사이트 확인)

**홈 데스크톱 1366×768**
- 상단 바: "Sandlab · no install · no sign-up · share as a link"와 Daily / Challenges / Learn / Materials / About.
- 화면 대부분이 어두운 빈 캔버스다. 가운데 "Sandlab — Pour sand, water, lava — watch them react."와 "Click and drag to pour sand"가 있다.
- 하단에 재료 18개 팔레트, Publish, Gallery, Record 10s clip이 있다.
- **데일리·Spill 레벨·공략으로 가는 카드가 첫 화면에 없다.** 상단 바의 작은 텍스트 링크뿐이다.

**홈 모바일 390×844**
- 캔버스는 작고 재료 그리드가 화면 대부분을 차지한다.
- 맨 아래에 "Daily #35 · Put out the fire →"와 "All 20 challenges" 카드가 있다(좋음).

**판단 메모**
- 샌드박스는 첫 경험(바로 만지기)으로서 핵심 훅이라 유지한다.
- 다만 하루 1개씩 쌓는 콘텐츠(Spill 레벨·공략)가 첫 화면에서 보이지 않는다.

## 아이디어 풀 (회의에서 골라 실험)
- 데스크톱: 캔버스 위나 옆에 "Today's puzzle / Newest level: 1-9 Overflow" 카드 1장을 둔다.
- 모바일: 재료 그리드를 접고, 데일리 카드를 캔버스 바로 아래로 올린다.
- 빈 캔버스 대신 첫 방문에 프리셋 장면(물·용암 반응)을 자동 재생한다. 정적 첫인상을 줄인다.
- 공략 페이지 상단에 "이 레벨 플레이" 버튼을 둔다(검색 유입 → 플레이 전환).

## 실험 기록
| 시작일 | 가설 | 변경(PR) | 측정 지표 | 7일 뒤 결과 | 결정 |
|---|---|---|---|---|---|
| 2026-11-14 | 데스크톱 첫 화면에 최신 Spill 레벨 카드가 있으면 콘텐츠 진입이 늘어난다 | 홈 좌상단 카드 'Play 1-9 Overflow →' (daily/2026-11-14-home-puzzle-card) | AE challenge_start 7일 합(기준 28), 홈 방문 대비 | 11-21 확인 | 대기 |
