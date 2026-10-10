# 경쟁·깨는 맛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** 클리어 연출, 연속 기록·분포, 친구 도전장, 리플레이 검증 순위표.
**Spec:** `docs/superpowers/specs/2026-10-10-competition-juice-design.md`
**Architecture:** 순수 로직은 `src/lib/challenge/{celebrate,streak,challenge-link,replay-record}.ts`·`worker/{daily,leaderboard}.ts`에 두고 테스트. UI는 ChallengePlayer/DailyPlayer에 얹는다. 리플레이 재생은 autoplay와 같은 advance 루프 재사용.

## Global Constraints
- 실크롬 게이트: 단계마다 로컬 데스크톱 폭 + 412px iframe, 그린 뒤 상태까지 확인 → 배포 → prod 재확인.
- autoplay·리플레이 관람은 기록 저장·prod 제출을 하지 않는다(판정 POST만 예외 — J3).
- 공유는 클릭으로만, 거짓 'copied' 금지. `prefers-reduced-motion` 존중.
- D1 변경은 ALTER ADD COLUMN/CREATE IF NOT EXISTS만(기존 데이터 보존).
- 검증: `pnpm test`, `pnpm typecheck`, `pnpm build`, `node scripts/verify-ads.mjs`, `python3 scripts/verify-daily.py`.

## Review Focus
- 리플레이가 실제 플레이와 다른 틱에 기록되면 정직한 기록이 반박된다 → 기록은 engine.onTick(시뮬 직전)에서, 재생도 같은 지점.
- 판정 스팸으로 정직한 기록을 숨길 수 있다 → run당 IP 1표, 숨김 조건 refuted ≥ max(2, verified+1).
- 도전장 `vs`·`by` 조작/XSS → 정수·이름 정제, React 텍스트 렌더만.
- 연속 기록 UTC 경계 → day 번호 기준(로컬 날짜 아님).

### J1 — Task 1: 순수 로직(연속 기록·히스토그램·NEW BEST 판정) + 테스트
- `streak(days: number[], today: number): number` — 오늘 또는 어제로 끝나는 연속 길이(테스트: 빈, 오늘만, 어제까지, 끊김, 중복).
- `isNewBest(prev: Best | undefined, next: Best): boolean`(progress.ts) — 첫 기록 true, 별↑ true, 같은 별 잉크↓ true.
- worker `summarize(rows, myInk?)` → `histogram {min,max,bins[10]}` + `belowMe`(내 잉크보다 많이 쓴 비율, myInk 있을 때) 테스트.
### J1 — Task 2: 클리어 연출 UI + 분포·연속 표시
- ChallengePlayer: 클리어 시 축포(엔진 브러시로 fire/steam 8발, 1.5초, inkCap·paintEmptyOnly 해제), 별 순차 CSS, 잉크 카운트업, NEW BEST 배지, vibrate.
- DailyPlayer: stats `?ink=` 요청, 미니 히스토그램(막대 10개, 내 구간 강조), "less ink than N%", 🔥 streak, 공유 문구에 streak.
- 실크롬 확인(autoplay로 클리어 → 연출 DOM 존재, 412px 넘침 0) → 배포.

### J2 — Task 3: 친구 도전장
- `src/lib/challenge/challenge-link.ts`: `parseVs(search, {n?})`, `buildChallengeUrl(base, ink, by, n?)`, `compareText` + 테스트(범위·정제·데일리 n 불일치 무시).
- ChallengePlayer: `vs` 배너, 클리어 시 비교 문구, "Challenge a friend" 공유(내 잉크 링크). /play/[id]와 /daily 모두.
- 실크롬(?vs=…로 열어 배너·비교) → 배포.

### J3 — Task 4: 리플레이 기록
- ChallengePlayer: 일반 플레이에서 `engine.onTick`으로 매 틱 브러시 기록 → `compressStrokes(ticks)`(연속 틱 같은 mat·r끼리 Stroke로 묶음) — 순수 함수 테스트(왕복: brushAt(compress(x), t) == x(t)).
- 검증: 로컬에서 autoplay로 기록한 리플레이를 다시 재생 → 같은 잉크(실크롬).
### J3 — Task 5: 서버 순위표·판정
- schema: `daily_results` ADD COLUMN id/name/replay/verified/refuted, `run_verdicts(run_id, ip, PK)`.
- POST /api/daily: 선택 `name`(cleanCreatorName), `replay`(≤64KB, Stroke[] 형식·틱 ≤3600·좌표 격자 내 검증), id 발급.
- GET /api/daily/:day/top, GET /api/daily/run/:id, POST /api/daily/run/:id/verdict — 순수 검증 함수 테스트 + verify-daily.py 확장.
### J3 — Task 6: 순위표·관람 UI
- DailyPlayer: 클리어 카드에 닉네임 입력(기존 creator 이름 있으면 자동) → 제출에 포함. 하단 "Today's top 20"(✓ verified N / unverified).
- `/daily/replay?id=` 관람 페이지: 재생(advance 루프) → 판정 POST → 결과 표시. 순위표 항목에서 링크.
- 실크롬: 로컬에서 제출→top 노출→관람 검증 ✓ 증가, 조작 리플레이(잉크 위조) → refuted. 412px. 배포 → prod 확인(prod엔 테스트 제출 안 함).
