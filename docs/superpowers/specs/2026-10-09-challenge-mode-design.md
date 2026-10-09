# 설계: 챌린지 모드(목표+예산 퍼즐) + AdSense 콘텐츠 정비

- 날짜: 2026-10-09
- 브랜치: `feat/challenge-mode`
- 배경: 사용자가 "sandlab을 게임 형식으로 확장해서 실사용 가능한 수준으로" 만들자고 요청. 같은 세션에
  AdSense 콘솔 스크린샷을 공유 — sandlab.app이 **"주의 필요: 게시자 콘텐츠가 없는 화면에 Google 게재
  광고, 가치가 별로 없는 콘텐츠"**로 반려됨. 두 문제를 한 설계로 묶는다(레벨·재료 페이지가 곧 콘텐츠).
- 사용자 결정(브레인스토밍): 목적은 **sandlab.app 재방문 + 포털 수익 둘 다(공용 코어)**, 핵심 루프는
  **목표+예산 퍼즐**, 레벨은 **코드로 제작 + 실크롬 검증**, 콘텐츠 언어는 **영어만**, 그리고
  **"계속 발전해야 한다"** — 확장·콘텐츠 추가·데이터 기반 튜닝이 구조에 들어가 있어야 한다.

## 왜 지금 기능을 추가하는가 (인계서 경고에 대한 답)

인계서는 "기능 추가는 배급 회피의 세련된 형태일 수 있다"고 경고한다. 이 작업은 그 경고를 다음 근거로 넘는다:

1. **포털 2단계의 선행조건이다.** `2026-08-13-portal-embed-design.md` §1: 세 포털 모두 광고 SDK가
   라운드/레벨 경계를 전제한다. 연속 샌드박스엔 경계가 없다 — 레벨 클리어가 그 경계다.
2. **막혀 있는 AdSense 수익의 직접 원인을 푼다.** 반려 사유 둘 다 코드에서 원인이 확인됐다(아래).
3. **재방문 장치다.** 데일리는 "다시 올 이유"를 매일 새로 만든다. 성공 여부는 아래 계측 지표로 판단한다.

## 조사로 확인된 사실 (설계를 결정지은 것)

1. **AdSense 반려 원인**
   - 광고 로더가 루트 레이아웃(`src/app/layout.tsx:72`)에 있어 **모든 화면**에 실린다. 메인은 캔버스뿐이고
     크롤러가 읽는 텍스트는 재료명 18개 + 버튼 라벨이 전부(실측). 갤러리는 클라이언트 fetch라 정적
     HTML엔 `Loading…`만 있다 → "게시자 콘텐츠 없는 화면에 광고".
   - 색인 대상 페이지가 `/`, `/gallery` 2개뿐이고 둘 다 글이 거의 없다 → "가치 없는 콘텐츠".
   - ads.txt는 정상(https 200, `pub-9363381710674627, DIRECT`). 건드리지 않는다.
2. **시뮬은 결정적이다.** 난수는 `hash(블록좌표, tick)`(`shader.ts:38,124`)라 같은 초기 격자 + 같은 tick에
   같은 붓질이면 같은 결과. 모범답안 재생 검증이 가능하다. 단 **레벨 시작 시 tick을 0으로 리셋**해야 한다.
3. **브러시는 무조건 덮어쓴다**(`shader.ts` `paint`). 퍼즐에서 벽·불을 덮어 지울 수 있다 → 보호 필요.
4. **`engine.readback()`(`engine.ts:415`)이 격자 전체(1200×600×4B ≈ 2.9MB)를 CPU로 가져온다.** 판정을 CPU
   순수 함수로 둘 수 있다.
5. **헤드리스에 WebGPU가 없고**, CPU 근사(`scripts/art-physics.mjs`)는 GPU와 동일하지 않다 → 레벨
   클리어 가능성 검증은 실제 크롬(claude-in-chrome)에서만 유효하다.
6. 계측 `track()`(`worker/index.ts:53`)은 `blobs: [event, ref, country, sceneId]` 형태이고
   `/api/track`은 `TRACKABLE_EVENTS` 허용목록(`:373`)으로 받는다.

## 설계 원칙: 계속 발전하는 구조

- **목표 타입은 레지스트리.** 새 타입 = `judge` 함수 1개 + 테스트. 기존 레벨에 영향 없음.
- **레벨 포맷은 버전 필드(`v`)를 가진다.** 포맷이 바뀌면 마이그레이션 함수로 흡수.
- **레벨 추가 비용을 최소화.** 레벨 = 데이터 파일 1개. `/play/verify`가 전 레벨을 실크롬에서 일괄 검증.
- **데이터로 튜닝.** 레벨별 시작/클리어/리셋/잉크를 계측해 이탈 레벨의 난이도를 조정한다.
- **확장 후보는 이 문서 "다음 단계"에 명시** — 범위 밖이지만 구조가 막지 않게 한다.

## 1. 챌린지 코어 (`src/lib/challenge/`)

엔진(`engine.ts`) 위에 얹는 순수 TS 모듈. sandlab.app과 `portal/`이 공유한다. 네트워크 의존 없음.

### 1.1 엔진 변경 (최소)

- `Params`에 `paintEmptyOnly : u32` 추가(48B → 64B로 패딩). `paint`에서 플래그가 켜져 있고 대상 칸이
  비어 있지 않으면 return. 일반 모드는 0이라 기존 동작 불변.
- `SandEngine.resetTick()` 추가(레벨 시작·Reset 시 tick=0, cur=0). 결정적 재생의 전제.
- 변경 후 `node scripts/verify-margolus.mjs` 7/7 재확인. 물리 규칙은 건드리지 않는다
  (인계서 "시뮬 품질에 더 붓지 마라"는 물리 품질 얘기이고 이 변경은 입력 마스크다).

### 1.2 레벨 포맷 (`levels/*.ts`)

```ts
interface Level {
  v: 1
  id: string                 // 'fire-01' (일반) / 'd-001' (데일리 풀). URL·기록 키, 불변
  title: string              // 'Put out the fire'
  blurb: string              // 레벨 페이지 본문(영어, 직접 작성)
  hint: string
  shapes: Shape[]            // 순서대로 격자에 그림
  palette: Record<string, number>   // 재료 slug → 잉크 예산(픽셀)
  goals: Goal[]              // 전부 AND
  stars: [three: number, two: number] // 잉크 상한. 클리어했지만 둘 다 초과 = 1성
  solution: Stroke[]         // 모범답안
}
type Shape =
  | { kind: 'rect';   mat: string; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; mat: string; x: number; y: number; r: number }
  | { kind: 'line';   mat: string; x0: number; y0: number; x1: number; y1: number; t: number }
interface Stroke { tick: number; mat: string; r: number; pts: [x: number, y: number][] } // 틱당 1점
```

- 좌표는 격자 좌표(1200×600 고정 — 바꾸지 않는다).
- `buildGrid(level): Uint32Array` — 도형을 그려 초기 격자를 만든다. 수명 있는 재료는 `materials.ts`의
  lifetime으로 초기화(셰이더 `mk(mat, life)`와 동일 인코딩).

### 1.3 목표와 판정

```ts
type Zone = { x: number; y: number; w: number; h: number } | 'all'
type Goal =
  | { type: 'fill';    zone: Zone; mat: string; min: number }  // 구역 내 mat 비율 ≥ min (0..1)
  | { type: 'clear';   zone: Zone; mat: string }               // 구역 내 mat 0개
  | { type: 'reach';   zone: Zone; mat: string }               // 구역 내 mat ≥ 1개
  | { type: 'protect'; zone: Zone; mat: string; min: number }  // 초기 대비 남은 비율 ≥ min
```

- `judge(cells, level, initialCounts): GoalStatus[]` — 순수 함수. 목표별 `{ met, progress }`.
- 레지스트리: `GOALS: Record<type, { judge, describe }>`. `describe`는 HUD·레벨 페이지 문구를 만든다.
- **클리어 = 모든 목표가 2초 연속 met.** 판정 주기 0.5초 → 4회 연속.
- readback은 챌린지 모드에서만, 0.5초 간격, 이전 readback이 끝나기 전엔 건너뛴다(중첩 금지).

### 1.4 잉크

- 플레이어 붓질이 덮은 **고유 격자 픽셀 수**를 재료별로 센다(CPU 비트셋 720k비트 ≈ 90KB).
  캡슐 래스터화는 셰이더와 같은 선분거리 기준, 가장자리 확률 침식은 무시(약간 과대계상 — 플레이어에게
  불리한 쪽이라 공정성 문제 없음).
- `paintEmptyOnly`로 실제로 안 칠해진 칸도 잉크로 센다("부은 양"). 이미 덮은 픽셀은 다시 세지 않는다.
- 예산 소진 시 해당 재료 붓질 비활성. Reset 시 잉크·격자·tick 모두 초기화.

### 1.5 플레이 규칙

- 실시간(시뮬은 멈추지 않음). 실패 상태 없음, 언제든 Reset. 지우개 없음.
- 별점: 클리어 시점 총 잉크로 `stars` 비교.
- 진행 저장(localStorage, 전부 try/catch): `{ [levelId]: { stars, bestInk } }`. 저장 실패해도 플레이는 정상.

## 2. 화면과 라우트 (sandlab.app, 정적 export)

| 경로 | 내용 | 광고 |
|---|---|---|
| `/play` | 레벨 목록(제목·blurb·내 별점·잠금 없음) | ✅ |
| `/play/[id]` | 캔버스 + HUD, 아래 정적 글(목표 설명·접힌 힌트·사용 재료 링크) | ❌ |
| `/daily` | 오늘의 레벨 + 결과 공유 + 오늘 통계 | ❌ |
| `/materials` | 재료 목록 + 반응 매트릭스 | ✅ |
| `/materials/[slug]` | 재료별 가이드(성질·반응·등장 레벨 링크) | ✅ |
| `/about`, `/privacy` | 소개, 개인정보처리방침(D1 IP 해시·localStorage·AdSense 쿠키 고지) | ✅ |
| `/play/verify` | 개발용 일괄 검증, `noindex`, sitemap 제외 | ❌ |

- `/play/[id]`·`/materials/[slug]`는 `generateStaticParams`로 빌드 시 생성.
- **HUD**: 목표 구역 점선 사각형(HTML 오버레이 — 캔버스 레터박스 좌표 변환은 기존 포인터 변환을 재사용),
  목표별 진행률, 팔레트 칩(기존 칩 재사용) + 남은 잉크 게이지, Reset, Hint, 클리어 시 별점 카드
  (다음 레벨 / 다시 / 공유).
- 메인 `/` 도크에 `Challenges` 진입 버튼 추가. 메인은 그 외 불변.
- 스타일은 기존 컨벤션(인라인 스타일, measure/env() 기반 반응형)을 따른다.
- 재료 가이드 본문은 재료마다 **직접 작성**한다. 반응 수치(확률·결과)는 `materials.ts`에서 자동 삽입.
  템플릿 문장 찍어내기는 오히려 저가치 판정 위험이 있어 금지.

## 3. AdSense 정비

- 루트 레이아웃의 로더 `<script>` 제거 → `<AdLoader/>` 컴포넌트로 옮겨 위 표의 ✅ 페이지에서만 렌더.
  자동광고는 대시보드에서 꺼둔 상태 유지(기존 결정), 갤러리 하단 유닛 계획은 이번엔 갤러리에서 로더를
  빼므로 보류(갤러리 정적 HTML이 `Loading…`이라 반려 사유 재발 위험).
- `google-adsense-account` 메타 태그(소유권 확인)는 루트에 유지.
- `sitemap.ts`에 새 정적 페이지 전부 추가(`/play/verify` 제외).
- 재심사 요청은 사용자가 콘솔에서 직접. 결과까지 수 주, 통과 보장 없음.

## 4. 데일리

- **날짜 경계는 UTC.** `dayNumber = floor((Date.now() - LAUNCH_UTC) / 86400000)`,
  레벨 = `DAILY_POOL[dayNumber % DAILY_POOL.length]`(순차 — 큐레이션 순서 유지). 순수 함수.
- 풀이 한 바퀴 돌면 재사용(카드에 `#번호`는 계속 증가). 소진 전에 레벨을 계속 추가하는 게 운영 원칙.
- 공유 카드(텍스트): `Sandlab Daily #12 ⭐⭐⭐ 4,210 ink` + `https://sandlab.app/daily`.
  공유는 사용자 클릭으로만(기존 activation 함정 준수), 클립보드 실패를 성공으로 표시하지 않는다.
- **D1**: `daily_results(day INTEGER, level_id TEXT, ink INTEGER, stars INTEGER, created_at INTEGER,
  ip TEXT, PRIMARY KEY(day, ip))` — ip는 기존 `ipHash()`. 하루 IP당 1건(첫 클리어만).
- **API**
  - `POST /api/daily` `{ day, levelId, ink, stars }` — day가 서버 기준 오늘(±1일 허용, 시간대 경계)이고
    levelId가 그 날 레벨인지, ink/stars 범위가 유효한지 검증. 중복은 409.
  - `GET /api/daily/:day/stats` → `{ clears, inkPercentiles: [p10,p25,p50,p75,p90], stars: [n1,n2,n3] }`,
    60초 캐시. 클라이언트는 "상위 N%"만 표시. **순위표 없음**(워커에 GPU가 없어 서버 재생 검증 불가 →
    조작돼도 피해가 작은 집계만).

## 5. 계측

- `TRACKABLE_EVENTS`에 `challenge_start`, `challenge_clear`, `challenge_reset` 추가.
  `sceneId` 슬롯에 levelId, `doubles`에 잉크(클리어 시)를 싣도록 `track()`에 선택 인자 추가.
- 판단 지표: 레벨별 클리어율·리셋 수(난이도 튜닝), 데일리 일별 제출 수(재방문), `/play` 유입.

## 6. 포털 (`portal/`)

- 같은 `src/lib/challenge/`와 레벨 팩을 import. 네트워크·데일리·광고 없음, 진행은 localStorage.
- 레벨 선택 → 플레이 → 클리어 카드. 클리어 시 `onRoundEnd(levelId)` 훅 호출(현재 no-op) —
  광고 SDK(`commercialBreak` 등)를 붙일 자리.
- 포털 규칙(외부 링크·sandlab.app 언급 금지)은 기존 그대로.

## 7. 레벨 콘텐츠

- 출시 단계별: 일반 10개(2단계) → 20개(3단계), 데일리 풀 30개(4단계).
- 난이도 곡선: 1~3은 재료 1종·목표 1개(튜토리얼), 이후 반응 조합(물+용암→돌로 다리 만들기,
  씨앗+물로 식물 키워 닿기, 산으로 금속 뚫기, 화약 연쇄 등)과 `protect` 조합.
- **모든 레벨의 필수 검증**: ① 모범답안 재생 → 클리어 ② 60초 방치 → 미클리어 ③ 모범답안 잉크 ≤ 3성 기준.

## 8. 테스트와 검증

**vitest (헤드리스)**
- `judge`: 목표 4종 경계값(정확히 min, min 직하, 빈 구역, `'all'`, 초기 0개인 protect).
- 잉크: 겹친 붓질 중복 미계상, 격자 경계 클리핑, 예산 소진.
- `buildGrid`: 도형 순서·클리핑·수명 인코딩.
- 레벨 정합성(전 레벨): 좌표가 격자 안, 재료 slug 존재, `three ≤ two ≤ 예산합`, id 유일,
  모범답안 잉크 ≤ 예산, `v` 일치.
- 데일리 선택 결정성, UTC 경계.
- 2초 연속 클리어 판정(상태 머신).

**Worker**: `scripts/verify-gallery.py` 스타일로 `verify-daily.py` — 제출·중복 409·잘못된 day/levelId
거부·통계·레이트리밋(`wrangler dev --port 8799 --local` 필요).

**엔진**: `verify-margolus.mjs` 7/7, `pnpm typecheck`, `pnpm lint`, `pnpm test`, 포털 빌드.

**실크롬(claude-in-chrome)**: `/play/verify` 전 레벨 표 통과, 레벨 1·5·10 직접 플레이, 구조물 보호,
잉크 게이지, 클리어 카드, 데일리 공유, 모바일 폭(375px) 레이아웃.

**AdSense**: `out/`에서 `adsbygoogle`이 ✅ 페이지에만 있는지 grep, 콘텐츠 페이지 정적 HTML 텍스트량
측정, `sitemap.xml` 포함 확인.

## 9. 출시 순서 (각 단계: 구현 → 리뷰 → 배포)

1. **AdSense 정비** — AdLoader 이동, `/materials`(+18쪽), `/about`, `/privacy`, sitemap → 배포 → 재심사 요청
2. **챌린지 코어 + 일반 레벨 10개 + `/play`** — 셰이더 플래그, judge, 잉크, HUD, 진행 저장, `/play/verify`
3. **레벨 20개 + 계측**
4. **데일리** — D1 마이그레이션, API, 공유 카드, 풀 30개
5. **포털 레벨 팩 + `onRoundEnd` 훅**

## 범위 밖 / 다음 단계 후보

emitter(지속 소스), 시간 제한, 움직이는 장치, 유저 레벨 에디터(UGC — 갤러리 장면에 목표 붙이기),
광고 SDK 실연동, 순위표(입력 기록 서버 재생 검증이 생기면), 한국어 페이지,
fibercalc.site·quickminigames.site AdSense 정비(별도 레포).
