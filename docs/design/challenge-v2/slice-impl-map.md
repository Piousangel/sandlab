# S1 슬라이스 1-1~1-3 구현 지도 (카드 #132, 2026-11-27 14시 작업 루틴)

> 상태: **stage:prepro — 설계·측정만, 제품 코드 0줄.** 관문 1(#104 r2 채점) 결과와 상관없이 slice 개발이 바로 시작되게, #130 채점의 구현 위험 2개(밝은 보드에서 재료 명암 손실 · 목표 = 셀 영역)를 미리 재고 PR ≤3장으로 쪼갠다.
> 입력: [브리프](../../team/specs/2026-11-24-s1-slice-brief.md) · [r1 채점](../critiques/slice13-g3-score-1127.md) · r2 요청 `docs/design/asset-requests/challenge-board-v2r2.json`. 대비 수치는 일회성 스크립트(세션 scratchpad, 저장소에 안 넣음)로 아래 표의 출처 색 상수에서 계산했다.

## 1. 지금 보드가 그려지는 길
| 층 | 파일·함수 | 하는 일 | 슬라이스에서 |
|---|---|---|---|
| 데이터 | `src/lib/spill/levels/w1/{first-drop,detour,two-pots}.ts` (`defineLevel`) | 타일(40×60) 단위 지도 + `targets[{id,kind,rect,mat,need}]` + `gems` | **무변경**. 목표 영역 데이터는 이미 있다 — `rect`(타일)·`mat`(water). 새 필드 불필요 |
| 시뮬 | `src/lib/spill/sim/*`, 셀 격자 160×240(`grid.ts` `TILE=4`) | 재료 id 격자 | **무변경**(`git diff --stat main -- src/lib/spill/sim` 빈 출력이 PR마다 검사) |
| 본 층 | `render/canvas.ts` `paintCells`(83행) → `SpillRenderer.draw`(140행) | 셀마다 `PALETTE[mat][noise]`(±6% 노이즈, 40행), 액체 윗면 1셀 `SURFACE`(49행), 빈 셀은 상수 1색(90행) → `putImageData` → CSS 정수 배율 `pixelated` | 여기에 배경 지도·목표 틴트·솔리드 윗면 빛/아랫면 그림자 |
| 발광 | `render/glow.ts` `GlowLayer.compose` | 저해상 blur 2회 → `lighter` 합성 | 무변경 |
| 덮개 | `render/overlay.ts` `OverlayRenderer.draw`(183행) → `drawTarget`(284행) | DPR 벡터 캔버스: 합법 칸·유령 동작·보석·**목표 = 점선 사각형 + 항아리 배지(진행 링)**·게이트·fx | 점선 사각형을 끄고 배지는 진행 링만 남김 |
| 액자 | `ui-next/spill/SpillHud.tsx` 196행 `.sl-sp-glass`(spill.css `background: var(--sl-kiln)`) | 보드 둘레 kiln 테두리 | 배경 방향(B2/A2)에 맞춘 잉크선 1개 |

`SpillRenderer` 사용처(렌더 규칙이 전역이라 전부 같이 바뀜): `components/spill/SpillPlayer.tsx`(309행, /play·/daily) · `SpillEditor.tsx`(89) · `SpillBench.tsx`(117) · `ui-next/home/HomeSections.tsx`(48, 홈 오늘 카드) · `ui-next/spill/DailyStart.tsx`(75). 공유 이미지 `ui-next/result/shareImage.ts`는 본 층 캔버스만 복사한다(덮개 미포함) → **목표 틴트를 본 층에 두면 공유 이미지에도 목표가 보이고**, 덮개에 두면 안 보인다. 전시실 썸네일 `ui-next/play/thumbPixels.ts`는 `MATS.color`로 따로 구워 옛 톤으로 남는다(브리프 §3 — 시안 선택 때 결정).

## 2. 목표 = 셀 영역 규칙 — 그리는 방법 1안과 비용
**안: 본 층 '배경 지도(backdrop)'.** `SpillRenderer`에 `setBackdrop(targets, theme)`를 더해 레벨 로드 때 한 번 `Uint32Array(160×240)`를 굽고, `paintCells` 90행의 빈 셀 상수 `PALETTE[0][0]`를 `backdrop[i]`로 바꾼다.
- 굽는 것: ① 빈 공간 세로 그라데이션(행마다 1색, 240단) ② 목표 rect 안 = 물색 15% 틴트 ③ rect 안쪽 둘레 1셀 = 물색 윤곽 ④ 눈금 = rect 좌·우 안쪽 열에서 `need` 25%·50%·75% 높이 행 1셀(채움량 ≠ 높이라 '대략'임을 감수, 정확 진행은 배지 링).
- 셀이 물·흙으로 차면 그 셀은 재료색이 덮는다 — 빈 셀만 backdrop을 보이므로 '차오름'이 셀 단위로 그대로 보인다(D7 일부를 공짜로).
- `setBackdrop`을 안 부른 사용처(에디터·벤치)는 지금 상수 1색 배열 그대로 → 회귀 없음. 첫 PR은 SpillPlayer·DailyStart·홈 카드만 켠다.
- 덮개: `drawTarget`의 점선 `strokeRect`(295행)를 backdrop이 켜진 경우 생략, 배지(진행 링)는 유지. `kind: 'bad'`(해골) 목표는 1-1~1-3에 없음 — 지금 그대로.

| 레벨 | 목표 rect(타일) | 셀 수 | 둘레 윤곽 셀 |
|---|---|---|---|
| 1-1 First Drop | pot [24,48,6,4] | 24×16 = 384 | 76 |
| 1-2 Detour | pot [31,52,8,6] | 32×24 = 768 | 108 |
| 1-3 Two Pots | left·right [3/27,54,10,4] ×2 | 2 × 40×16 = 1280 | 2 × 108 |

**비용**: 굽기 1회 38,400셀(레벨 로드·리셋 때만). 프레임당 비용 = 상수 읽기 → 배열 읽기 1회로 바뀔 뿐(분기·곱셈 추가 0). 덮개는 점선 1개가 빠져 오히려 줄어든다. **솔리드 윗면 빛·아랫면 그림자**(r2 §3 깊이)는 `SURFACE`처럼 프레임마다 위·아래 이웃 1회씩 읽기(정적 솔리드 셀만) — `/spill/bench` 전후 하락 ≤5%가 수락 기준(브리프 §8).
**무변경 확인**: 격자 1200×600(샌드박스)·Spill 160×240·레벨 id·`MATS.color`·공유 URL 전부 안 건드림. 표시 색은 렌더 팔레트에서 덮는다(`MATS.color` 직접 수정 금지 — 시뮬·썸네일 영향 차단).
**위험**: 파낸 흙 자리는 빈 셀이 되어 backdrop 그라데이션 + 이웃 솔리드의 윗면 빛이 생긴다 → 데일리 공유 모자이크(`model.ts` VEIL_BLOCK·VEIL_FLATTEN)에서 판 경로가 드러날 수 있다. ①번 PR 오답 검사에 모자이크 전후 비교를 넣는다.

## 3. 재료 × 배경 대비 (WCAG 상대 휘도, 노이즈 ±6% 양끝과 그라데이션 양끝 중 최솟값)
1-1~1-3 지도에 쓰이는 재료 = `W1_LEGEND`(`levels/draw.ts` 4행)의 `.`·`#`·`d`·`w` → empty·wall·dirt·water. sand·stone은 1-1~1-3에 없지만 reviewer 위험 1(밝은 재료)과 확산 대비로 같이 잰다.
| 재료 | 색(출처) | 현 empty #07090D (`materials.ts:32`) | B2 종이 #E9DFCC→#D6C7AC (r1 채점 23행·r2 요청 12행) | A2 어두운 #2E2520→#16110E (r2 요청 24행) |
|---|---|---|---|---|
| wall | #525A6B `sim/materials.ts:33` | **2.63 미달** | 3.80 | **1.97 미달** |
| dirt | #5C4632 `sim/materials.ts:34` | **2.10 미달** | 4.95 | **1.58 미달** |
| water | #2E6FD9 `sim/materials.ts:41` | 3.74 | **2.59 미달** | **2.81 미달** |
| water 윗면 | water + 흰 28% `render/canvas.ts:49` | 6.79 | **1.76 미달** | 5.11 |
| sand | #E8C87A `sim/materials.ts:40` | 10.72 | **1.07 미달** | 8.06 |
| stone | #79808C `sim/materials.ts:35` | 4.48 | **2.14 미달** | 3.36 |
| 목표 윤곽(water) vs 15% 틴트 | 위 water | 3.70 | **3.04 / 2.46 미달**(아래쪽) | **2.74 미달** / 3.44 |

재료끼리(배경 무관, 지금 색): dirt↔wall **1.28** · water↔wall 1.45 · water↔dirt 1.85 · stone↔wall 1.74 — D3(흙과 돌이 색 하나 차이)이 수치로 확인됨. 틴트 자체는 배경 대비 1.13~1.19(의도: '영역'만 보이게, 윤곽이 경계를 맡음).

**읽는 법**
1. **어느 방향이든 지금 재료색 그대로는 안 된다** — 현 화면도 wall·dirt가 미달. 그래서 슬라이스는 반드시 '렌더 팔레트 덮기'(`PALETTE`를 테마별로 생성)를 한다.
2. **B2(밝은 보드)는 구조적 상한이 있다**: 배경 L≈0.57~0.74에서 3:1을 지키려면 재료 휘도가 L≤0.157에 몰려 재료끼리 최대 비가 약 4.1뿐이다. 시험 후보(wall #2E2A27 · water #1F55B5 · dirt #8A5A30)로 재면 배경 대비 8.21·3.84·3.19는 통과지만 water↔dirt 1.19 — 흑백에서 물과 흙이 붙는다. B2는 명암 외 단서(흙 1셀 점박이·물 윗면 선·솔리드 윤곽)가 필수. sand는 B2에서 1.07이라 2-x·데일리 확산 때 별도 어두운 표시색이 필요.
3. **A2(어두운 따뜻한 보드)는 여유가 크다**: 배경 L≈0.006~0.02라 재료를 0.16~0.6 사다리로 벌릴 수 있다. 시험 후보(dirt #9A6A44 · wall #B5A894 · water #8FD0FF) = 배경 대비 2.89·5.64·7.90(dirt는 한 단 밝히면 통과), dirt↔wall 1.99 · water↔dirt 2.80. r2 A2 프롬프트의 '물을 밝은 하늘색으로'와 맞는다.
4. 위 후보 색은 **결정이 아니다** — 관문 1 통과 시안에서 색을 뽑아 ①번 PR이 확정하고, 그 PR이 `scripts/check-contrast.mjs` `PAIRS`에 보드 팔레트 쌍(재료×배경 3:1, 윤곽×틴트 3:1)을 추가해 회귀를 막는다. #104 r2 채점자에게 이 표를 근거로 'B2는 S5 상한이 낮다'를 넘긴다(점수는 채점자 몫).

## 4. slice PR 분할 (≤3장, 계획 루틴이 그대로 카드로)
### ① 보드 배경·목표 셀 영역 (`stage:slice`, 제품)
- 파일: `src/lib/spill/render/canvas.ts`(backdrop·테마 팔레트), `render/overlay.ts`(점선 생략 분기), `components/spill/SpillPlayer.tsx`·`ui-next/spill/DailyStart.tsx`·`ui-next/home/HomeSections.tsx`(setBackdrop 호출), `scripts/check-contrast.mjs`(보드 쌍), `render/render.test.ts`·`overlay.test.ts`.
- 수락 기준: 목표 rect 빈 셀 = 틴트, 둘레 1셀 = 윤곽, 눈금 3개 · 점선 사각형 없음·배지 링 유지 · 빈 공간 세로 그라데이션 · 에디터·벤치 화면 불변 · `contrast`에 보드 쌍 추가 후 통과 · 390·1440 1-1~1-3 전후 캡처.
- 오답 검사: 1-1 첫 프레임 픽셀 스냅샷에서 목표 rect 밖 셀이 틴트 색이면 실패(테스트) + 데일리 공유 모자이크 전후 비교에서 판 경로가 새로 보이면 실패.
### ② 재료 명암·HUD 정리 (`stage:slice`, 제품)
- 파일: `render/canvas.ts`(솔리드 윗면 빛·아랫면 그림자, 흙 1셀 점박이, 테마 재료색), `ui-next/spill/spill.css`(`.sl-sp-glass` 잉크선 1개), 필요 시 `SpillHud.tsx`(D5 진행 줄 위치 — P4 HUD 뒤 고정 높이 트레이라 원인 추정부터 390 캡처로 재검증).
- 수락 기준: 3장 표의 1-1~1-3 재료 전부 배경 대비 ≥3:1(테마 팔레트 기준) · 흑백 변환 캡처에서 wall·dirt·water·빈 공간 4단 구분 · `/spill/bench` 하락 ≤5% · 390에서 1-1·1-2·1-3 보드 폭 같음.
- 오답 검사: 흑백 1-3 캡처의 흙 마개 3개 평균 휘도와 주변 wall 평균 휘도 비 <1.5면 실패(스크립트로 측정, 눈대중 금지).
### ③ 클리어 순간·다듬기 (`stage:polish`)
- 파일: `render/fx.ts`(목표 테두리 빛·채움 반짝임), `render/audio.ts`(기존 효과음 재사용만), `render/overlay.ts`.
- 수락 기준: 브리프 §5 첫 10초 7~9초 구간(눈금 차오름 → 테두리 빛 → '통')을 390 녹화로 · reduced-motion에서 빛 생략 · G4 혹평 ≥7.
- 오답 검사: `latched` 전 프레임에 테두리 빛이 켜지면 실패(fx 테스트).

공통: PR마다 `git diff --stat main -- src/lib/spill/sim src/lib/spill/levels` 빈 출력, `pnpm verify`, cutover-e2e 골든셋 공유 링크 재생 불변. ①은 관문 1 통과 시안의 방향(B2/A2)에 의존 — 미달로 결정 요청 `S1 보드 방향`이 나가면 ①의 '목표 셀 영역'과 테마 팔레트 구조는 방향과 무관하게 먼저 갈 수 있다(색 값만 나중에).
