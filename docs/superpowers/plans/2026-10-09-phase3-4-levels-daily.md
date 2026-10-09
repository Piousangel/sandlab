# Phase 3–4 — 레벨 20개·계측·데일리 챌린지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 챌린지를 20레벨로 늘리고(Phase 3), 플레이 계측을 붙이고, 매일 바뀌는 데일리 챌린지(공유 카드·오늘 통계)를 낸다(Phase 4). 모든 단계는 실서비스 데스크톱·모바일 폭에서 동작 확인 후 다음으로 간다(사용자 지시).

**Architecture:** 레벨은 기존 데이터 포맷. 데일리 풀은 손으로 만든 템플릿 레벨을 시드 파라미터로 변형한 생성기(`daily/generate.ts`)로 만들고, 생성된 풀 전체를 `/play/verify?set=daily`로 실크롬 검증해 측정 잉크로 별 기준을 확정한다(`daily/stars.json`). 서버는 기존 Worker+D1 패턴(ipHash, 레이트리밋, `track()`).

**Spec:** `docs/superpowers/specs/2026-10-09-challenge-mode-design.md` §4(데일리), §5(계측), §7(레벨), §9-3·4

## Global Constraints

- 실크롬 검증 게이트: 새/변경 레벨은 `/play/verify`에서 solution ✅(≤3★, 예산 내) + idle ✅ + 정적 지름길 테스트 ✅여야 병합.
- **실기기 확인 게이트(사용자 지시):** 각 단계 배포 후 prod에서 데스크톱 폭(≥1200)과 모바일 폭(≤430, 터치 입력)으로 확인. 탭이 보이지 않아 rAF가 멈추는 자동화 환경에선 `?autoplay`(Task 1)로 UI 전 경로를 돌리고, 실제 휴대폰은 체크리스트로 사용자에게 요청.
- 날짜 경계 UTC. 데일리 순위표 없음(통계·백분위만). IP는 기존 `ipHash()`만 저장.
- 공유는 사용자 클릭으로만, 클립보드 실패를 성공으로 표시하지 않는다(인계서 함정).
- 광고: `/daily` ❌(캔버스 페이지), `/play` ✅ 유지.
- 계측 이벤트에 개인 식별자 금지(levelId·잉크만).
- 검증: `pnpm test`, `pnpm typecheck`, `pnpm build`, `node scripts/verify-ads.mjs`, `node scripts/verify-margolus.mjs`, `python3 scripts/verify-daily.py`(wrangler dev 필요).

## Review Focus

- 데일리 날짜 계산이 시간대·자정 경계에서 어긋나면 사용자마다 다른 레벨을 받는다 → `dayNumber`는 UTC ms만 쓰고 테스트로 경계 고정.
- 생성기가 같은 시드에 다른 레벨을 내면 "모두 같은 퍼즐" 약속이 깨진다 → 결정성 테스트.
- 서버가 위조된 ink/stars를 그대로 받으면 통계가 오염된다 → 범위 검증(0 < ink ≤ 예산합, stars 1..3, 오늘의 levelId 일치), IP당 하루 1건.
- 공유 텍스트에 로컬 날짜가 섞이면 번호가 어긋난다 → `#${dayNumber}`만.
- autoplay가 프로덕션 사용자에게 노출되면 안 된다 → 쿼리 플래그로만, 링크 없음, 결과 저장(saveBest) 안 함.

---

## Phase 3

### Task 1: `?autoplay` — 탭 표시와 무관한 실제 UI E2E

**Files:** Modify `src/components/ChallengePlayer.tsx`

- `?autoplay=1`이면 `eng.start()` 대신 `engine.advance()/settle()` + MessageChannel 루프로 진행하고 `onTick`에 `brushAt(level.solution)`(+ `areaFor`·`inkCap`)을 건다. 판정 인터벌·HUD·클리어 카드는 그대로(실제 경로). saveBest는 호출하지 않는다.
- 클리어 시 `document.body.dataset.autoplay = 'cleared:<stars>:<ink>'`, 3600틱 초과 시 `'timeout'` — 자동화가 읽는다.
- 검증: prod 배포 전 로컬에서 10개 레벨 `?autoplay=1`을 데스크톱 폭·모바일 폭(창 430px)으로 돌려 전부 `cleared`, 레이아웃 가로 넘침 0.
- 커밋 `test(challenge): ?autoplay 실제 UI E2E 경로`.

### Task 2: 계측 — challenge_start / clear / reset

**Files:** Create `worker/track.ts` + `worker/track.test.ts`; Modify `worker/index.ts`(`/api/track`), `src/lib/sand/gallery.ts`(`trackEvent` 시그니처), `src/components/ChallengePlayer.tsx`

- `parseTrack(body): { event, ref?, value? } | null` 순수 함수: `event`가 허용목록(`kofi_click`, `challenge_start`, `challenge_clear`, `challenge_reset`)이고, `ref`는 `/^[a-z0-9-]{1,40}$/`, `value`는 0..1e7 정수만. 그 외 null.
- 테스트(먼저): 허용 이벤트·ref 형식·value 범위·알 수 없는 이벤트 거부·ref 없는 kofi_click 허용.
- `track(env, event, req, ref, value)` — `doubles: [1, value ?? 0]`.
- 클라이언트: 레벨 로드 시 `challenge_start`, Reset 시 `challenge_reset`, 클리어 시 `challenge_clear`(value=ink). autoplay에선 보내지 않는다.

### Task 3: 레벨 11–20 + 실크롬 튜닝

**Files:** Create `src/lib/challenge/levels/*.ts`(10개), Modify `levels/index.ts`, `levels.test.ts`(개수 20)

Phase 2에서 실측된 제약(액체 수평 확산 느림, 덩어리 가연물 순식간에 전소, 두꺼운 용암은 돌 껍질로 봉인, 기체는 이제 상승)에 맞는 메커니즘만 쓴다. 후보(검증에서 안 되면 교체, ledger Ruling):

| id | 메커니즘 | 목표 |
|---|---|---|
| layer-cake | 밀도 성층(기름<물) | fill(윗칸, oil, .6) + fill(아랫칸, water, .6) |
| steam-vent | 물+용암→증기, 기체 상승 | reach(위 구역, steam) |
| burn-the-bridge | 불이 나무 판자를 태워 모래를 떨어뜨림 | reach(구덩이 바닥, sand) — 불은 판자 끝 근처만 칠 가능 |
| two-leaks | 구멍 두 개에서 떨어지는 용암, 얼음 마개 | protect(마을) + survive |
| acid-stairs | 산이 돌·금속 판을 차례로 뚫음 | reach(바닥 방, acid) |
| deep-roots | 씨앗+물, 더 높은 탱크 | reach(높은 띠, plant) |
| double-fuse | 화약 갈래길로 장작 두 더미 | clear(A, wood) + clear(B, wood) |
| float-and-burn | 기름 막 + 불, 물 위 장작 두 개 | clear 두 구역 |
| salt-and-sand | 소금은 녹고 모래는 남음 | clear(대야, salt) + protect(대야, sand, .8) |
| finale | 용암 다리 + 화약 | reach(다리 너머, gunpowder) 후 clear(장작) |

- 각 레벨: blurb ≥40단어(직접 작성, 실제 동작 근거), hint, paintArea(+areaFor), 지름길 테스트 통과.
- `/play/verify` ALL PASS까지 반복 → 커밋 `feat(challenge): 레벨 11–20`.

### Task 4: Phase 3 배포 + 실서비스 확인

- `pnpm run deploy` 전 사용자 승인(이번 세션 사용자 지시 "배포하고 쭉쭉"이 단계별 배포를 포함하는지 애매하면 확인).
- prod: `/play` 20개, `/play/<새 id>` 200, `?autoplay=1` 데스크톱·모바일 폭 cleared, 메인 샌드박스 회귀 없음, verify-ads OK.
- 사용자 휴대폰 체크리스트 전달(아래 §부록).

## Phase 4

### Task 5: 데일리 순수 로직

**Files:** Create `src/lib/challenge/daily/{day.ts,generate.ts,templates.ts}` + tests

- `LAUNCH_UTC = Date.UTC(2026, 9, 12)`(첫 데일리 #1). `dayNumber(nowMs) = floor((nowMs - LAUNCH_UTC)/86400000) + 1`, 런치 전은 1.
- `dailyLevel(n): Level` = `DAILY_POOL[(n - 1) % DAILY_POOL.length]`, id `daily-<n>`이 아니라 풀 항목 id(`d-001`…) — 공유·통계 키는 `day`.
- `generate.ts`: 템플릿(`fill`, `displace`, `crust`, `acid`, `sprout`, `fuse`, `dissolve`, `plug`, `slick`, `layers`) × 시드 → Level. mulberry32 시드 난수로 위치(±80px)·폭(±20%)·예산(측정 후 확정)만 바꾼다. 같은 시드 = 같은 Level(테스트).
- `DAILY_POOL` = 30개(템플릿 10 × 시드 3), 각 항목은 levels.test의 정합성·지름길 테스트를 그대로 통과해야 한다(테스트를 풀에도 적용).
- 테스트: UTC 경계(23:59:59.999Z → n, 00:00:00.000Z → n+1), 런치 전 1, 풀 순환, 생성 결정성, 풀 정합성.

### Task 6: 데일리 풀 실크롬 검증 + 별 기준 확정

- `/play/verify?set=daily`로 30개 검증. 실패 시드는 다른 시드로 교체(ledger). 측정 잉크로 `stars = [ceil(ink*1.15), ceil(ink*1.5)]`, 예산 = `max(stars[1], ink*2)`를 `daily/stars.json`에 기록하고 생성기가 읽는다. 재검증 ALL PASS.

### Task 7: 서버 — D1 + API

**Files:** `schema.sql`(daily_results), `worker/daily.ts` + test(순수 검증), `worker/index.ts` 라우트, `scripts/verify-daily.py`

- `daily_results(day INTEGER, level_id TEXT, ink INTEGER, stars INTEGER, created_at INTEGER, ip TEXT, PRIMARY KEY(day, ip))`.
- `validateDaily(body, nowMs)`(순수, 먼저 테스트): day ∈ {오늘-1, 오늘, 오늘+1}(UTC), levelId === dailyLevel(day).id, 1 ≤ ink ≤ 예산합, stars ∈ {1,2,3} 이고 `starsFor(ink)`와 일치.
- `POST /api/daily` — 검증 실패 400, 중복 409(INSERT OR IGNORE 후 changes 확인), 성공 201.
- `GET /api/daily/:day/stats` → `{ clears, inkPercentiles:[p10,p25,p50,p75,p90], stars:[n1,n2,n3] }`, `Cache-Control: max-age=60`.
- `verify-daily.py`(wrangler dev): 정상 제출 201, 중복 409, 잘못된 day/levelId/ink/stars 400, 통계 형식.
- 원격 D1 마이그레이션은 사용자 승인 후 `wrangler d1 execute sandlab-gallery --remote --file=schema.sql`(IF NOT EXISTS라 기존 테이블 무해).

### Task 8: /daily 화면 + 공유

**Files:** `src/app/daily/page.tsx`, `src/components/DailyPlayer.tsx`(ChallengePlayer 재사용 + 제출·통계·공유), sitemap(/daily), 홈·/play에서 링크

- 클라이언트가 `dayNumber(Date.now())`로 레벨 결정(정적 export라 서버 렌더 불가 — 페이지 정적 본문은 데일리 규칙 설명).
- 클리어 → POST(실패해도 결과는 보여줌) → 통계 GET → "상위 N%"(내 잉크가 p 몇 사이인지).
- 공유: `Sandlab Daily #${n} ${'⭐'.repeat(stars)} ${ink} ink\nhttps://sandlab.app/daily` — 버튼 클릭 시 `navigator.share` 있으면 share, 없으면 clipboard; 실패 시 텍스트 선택 상자 노출(거짓 'copied' 금지).
- 하루 1회 기록: localStorage `sandlab.daily.v1`에 `{ [day]: {stars, ink} }` — 재방문 시 결과 카드부터.
- 검증: 로컬 wrangler dev에서 autoplay로 클리어→제출→통계 표시, 중복 제출 409 처리, 데스크톱·모바일 폭.

### Task 9: Phase 4 배포 + 실서비스 확인

- 원격 D1 마이그레이션(승인) → 배포(승인) → prod `/daily` autoplay 데스크톱·모바일 폭, 실제 POST/GET 응답, 공유 텍스트, 다음날 경계는 단위 테스트로 대체.

## 부록: 사용자 휴대폰 체크리스트(단계별 배포 후)

1. `https://sandlab.app/play` → 아무 레벨 → 손가락으로 칠하기(스크롤되지 않고 칠해지는지)
2. 잉크 게이지 줄어듦, 다 쓰면 더 안 칠해짐
3. Reset, Hint, 클리어 카드의 Next level
4. iPhone Safari에서 열리는지(WebGPU 미지원이면 안내 문구가 보이는지)
5. `/daily`(Phase 4): 클리어 후 공유 버튼 → 카톡 등에 붙여넣기
