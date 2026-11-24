# HANDOFF — 샌드랩 (현재분 ≤10KB · 줄 ≤150. 이력은 docs/archive/handoff-2026-*.md, 함정 정본은 docs/team/PITFALLS.md, 규칙은 docs/team/SHIFT.md)
갱신: 2026-11-24 · 북극성 주간 손댄 방문자 11(부분, 측정 11-20부터) · 방문자(UTC) 하루 약 5

## 지금 상태
- P12 컷오버 완료(#97, 11-21): prod sandlab.app = 새 셸 「Glass & Grain」(`src/ui-next/`). 되돌리기 런북 = DECISIONS 11-20 'P12 컷오버'(가장 빠른 길: `gh variable set SANDLAB_UI --body classic` + `gh workflow run deploy --ref main`).
- 72시간 확인 기한(11-23) 지남 — 판정 기록 없음. 지표 11-25(7일): landing 66 · first_stroke 14 · daily_start 16 · challenge_start 26 · challenge_clear 21 · gpu_unsupported 5 · 첫 붓기율 55%(11/20). 컷오버 전(11-22 파일): 46 · 2 · 8 · 15 · 8 · 8 → 핵심 흐름 끊김 없음, 실패 신호 늘지 않음(표본 작음).
- 11-21 이후 main 머지 0(지표 커밋만) — 루틴 한도·운영안 v2 재편 중.
- PR CI 초록 = 머지 조건(typecheck·lint:ui·contrast·margolus / vitest unit·sim / spill:verify 2갈래 / prod 빌드·verify-ads·갤러리 API / build:preview), 만성 실패 0.
- 광고: `ADS_ENABLED = false`(ads/config.ts), AdSense 결과 대기. 재심사 신청 금지(사람 몫).
- 오너 11-24: S1 = /play 월드 1~2 챌린지를 Steam 「Sandcastle Demo」급으로 — 1-1~1-3 버티컬 슬라이스 → 오너 10분 플레이 승인 → 확산.

## 진행 중·열린 PR
- #99 `docs/challenge-board-concepts` 챌린지 판 v2 시안 3안 Gemini 요청(오너 11-21 '시험관 도크 수준') — S1 슬라이스의 시안 관문 입력.

## 다음 할 일 (우선순위)
1. [S1] 72시간 판정을 DECISIONS에 기록(위 숫자, 판단 기준 ①~⑤) → 유지면 옛 코드 삭제 PR: SandCanvas·GalleryBrowser·ResultCard·ChallengePlayer·DailyPlayer, classic.ts null들, sheet.test LEGACY, gallery.test '옛 갤러리와 대조', shareLinks.golden.test 소스 검사, ci.yml '되돌리기 빌드', verify-ads classic 분기, `PREVIEW_SWAPS` 홈 SandCanvas 줄. 그 뒤 되돌리기 = revert PR(고위험 — 리뷰 2회).
2. [S1] 1-1~1-3 버티컬 슬라이스: #99 시안 → 혹평 채점 통과 전 개발 금지 → 구현(전후 녹화) → 48시간 내부 써 보기(솔버 클리어율 밴드) → 오너 10분 플레이.
3. [S2] SEO·GEO: Search Console 색인 상태(컷오버 뒤 'noindex로 제외' 없음 확인 — 오너 접근 필요), 공략 롱테일 유입 확인 방법, 유입 태그 7일 direct 46·google 17.
4. [S1] 데일리 D2: 390에서 병 112px이라 낙하가 작음 → 병 확대 또는 미니 병, 결과 "+1 stratum" → 병 전환, "왜 별을 놓쳤나" 한 줄.
5. [S1] 실기기 확인: iOS Safari·안드로이드 홈 붓기·시트 끌기·데일리 클리어, Web Vitals LCP p75 ≤2.5s·CLS ≤0.1.
6. [S1] 북극성 관찰: `daily_start`가 /daily 마운트 때 나가 '퍼즐 시작'보다 넓다 — 데일리로 쏠리면 SpillPlayer 첫 RUN으로 옮길지(지표 끊김 주의).
7. 리뷰 보류: 넓은 화면 Spill HUD 메뉴 카드 위치(버튼 rect 기준), share-1440 썸네일 480 < 카드 560, 메뉴 doc 링크 전체 이동.
8. [운영] 운영안 v2 마무리: ① 루틴 재편 — 오너가 루틴 계정 로그인 + Slack 커넥터 연결 후 메인 세션이 `docs/team/routines/` 초안으로 생성(그 전엔 루틴 생성·수정 금지) ② 허브 정본 SHIFT·OPS 공통부 → 이 저장소 사본 동기화 Action ③ 하트비트 누락 감지 Actions cron ④ 로그 절삭 PreToolUse hook(고위험·리뷰 2회) ⑤ `stop-unsaved-work` 안내의 브랜치 이름 `shift/` → `card/`(고위험).
- 오너 선택·할 일: 갤러리 Top을 작품 전 기간 순위로(워커 `sort=top`), AdSense 고정 300×250 단위 생성(`AD_SLOTS.play`), workers.dev 하위 도메인 활성(프리뷰 배포는 한 번도 안 함), main 브랜치 보호 필수 체크(`pr-guard / high-risk` 포함 — Actions가 main에 직접 커밋하는 워크플로 4개를 PR 방식으로 바꾼 뒤), Search Console·Bing 접근 방법.

## 현재 유효한 함정
- 정본은 [docs/team/PITFALLS.md](../../docs/team/PITFALLS.md) 맨 위 절 — 카드 영역의 줄만 읽는다. 새 함정은 그 파일에.

## 검증 상태
- main(#98, 11-21) 기준 PR CI 초록. 컷오버 게이트(#97): Lighthouse 모바일 중앙값 홈 2375·/daily 2405·/play 2330·/gallery 2411ms, CLS ≤0.037, cutover-e2e 21/21, head-parity·content-parity 차이 0(보고 `docs/perf/2026-11-20-p12-cutover-qa.json`).
- 검사 묶음: `pnpm qa:preview`(build:preview 뒤), `node scripts/qa/cutover-e2e.mjs --out <dir>`(`--base https://sandlab.app`이면 라이브, 쓰기 차단), 갤러리 `npx wrangler dev --port 8799 --local` + `python3 scripts/verify-gallery.py`.
