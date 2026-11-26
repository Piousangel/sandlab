# HANDOFF — 샌드랩 (현재분 ≤10KB · 줄 ≤150. 이력은 docs/archive/handoff-2026-*.md, 함정 정본은 docs/team/PITFALLS.md, 규칙은 docs/team/SHIFT.md)
갱신: 2026-11-27(01시 S1 작업 루틴) · 이전 2026-11-26(계획 루틴) · 북극성 주간 손댄 방문자 13(부분 5일치, 지표 11-26 파일) · 첫 붓기율 52%(13/25) · 방문자(UTC) 하루 약 5

## 지금 상태
- P12 컷오버 완료(#97, 11-21): prod sandlab.app = 새 셸 「Glass & Grain」(`src/ui-next/`). 72시간 판정 = 유지(DECISIONS 11-26, #108). #108 PR 머지 뒤 되돌리기 = revert PR(고위험·리뷰 2회) — `SANDLAB_UI=classic` 변수 경로는 next.config.ts가 빌드를 멈춘다.
- 72시간 확인 기한(11-23) 지남 — 판정 기록 없음. 지표 11-25(7일): landing 66 · first_stroke 14 · daily_start 16 · challenge_start 26 · challenge_clear 21 · gpu_unsupported 5 · 첫 붓기율 55%(11/20). 컷오버 전(11-22 파일): 46 · 2 · 8 · 15 · 8 · 8 → 핵심 흐름 끊김 없음, 실패 신호 늘지 않음(표본 작음).
- 11-21 이후 main 머지 0(지표 커밋만) — 루틴 한도·운영안 v2 재편 중.
- PR CI 초록 = 머지 조건(typecheck·lint:ui·contrast·margolus / vitest unit·sim / spill:verify 2갈래 / prod 빌드·verify-ads·갤러리 API / build:preview), 만성 실패 0.
- 광고: `ADS_ENABLED = false`(ads/config.ts), AdSense 결과 대기. 재심사 신청 금지(사람 몫).
- 오너 11-24: S1 = /play 월드 1~2 챌린지를 Steam 「Sandcastle Demo」급으로 — 1-1~1-3 버티컬 슬라이스 → 오너 10분 플레이 승인 → 확산.

## 진행 중·열린 PR
- [S3] #126 오늘의 레벨 2-2 Fuse(W2 둘째, Line 동사 첫 출시) + 공략 — PR review, 15:37 리뷰 머지 대기. 다음 S3: 2-3(스펙 3.3 Plank Bridge = line plank) — 도화선 실측 수치는 PR 본문.
- #119 `card/108-classic-removal` [S1] 72시간 판정 '유지' 기록 + classic 옛 화면 코드 삭제(24파일 −3196줄) — high-risk, 팀 내부 2중 리뷰 대기. cutover-e2e는 클라우드 환경에서 10/21(main도 같음) → 맥·라이브 21/21 확인 필요.
- `card/104-slice-g3-score` [S1 prepro] #104 관문 1 라운드 1 채점 = **보류**(A 5.5·B 6.2·C 5.3 배치 변경, 통과 0) + r2 요청 `challenge-board-v2r2.json`(B2·A2 pro + 라운드 1 혹평) — 문서 등급. 채점표 `docs/design/critiques/slice13-g3-score-1127.md`.
- #116 `card/112-home-daily-body` S2 홈·/daily 본문(draft) — QA 지적: 홈 소개 링크 6개 구분 불가(색·밑줄), /daily `sl-doc` 클래스 미정의, DailySpill children 중복 노출.
- #123(새 PR) `card/123-daily-d2-prepro` [S1 prepro] 데일리 D2 브리프·시안 요청 `daily-d2.json`(flash 2 + 혹평) — 문서 등급. 머지 → gen-assets → 다음 S1 기획 run이 D1~D5 채점.
- 열린 카드: #104 S1 prepro(review, #107 ready·CI 초록·충돌 없음) · #123 S1 prepro(review) · #112 S2(ready, 이어받기) · #115·#117·#105 S2(ready) · #108 S1(review, #119).

## 다음 할 일 (우선순위)
오늘(11-26) 카드 — 새 카드 0(기존 ready 카드로 슬롯이 찬다, S1 개발 단계 카드는 #107 머지 뒤):
1. [리뷰] #119(#108) high-risk 2중 리뷰 → `team-2review` → 머지 → 라이브 확인. 되돌리기 = revert PR(고위험).
2. [S1] #104 — r2 PR 머지 → gen-assets(B2·A2) → 다음 S1 run이 같은 격자 사본 절차(채점표 문서 머리말)로 r2 채점. 통과 → `stage:slice` 카드(1-3 보드 렌더, 목표 = 셀 틴트·윤곽 규칙을 수락 기준에). 미달 → 결정 요청 'S1 보드 방향'(B 밝은 종이 / A 어두운 따뜻한 / 크롬 유지 + 목표 규칙만).
3. [S2] #112 — #116 머지됨(11-26). ② 레벨 화면 11개 고유 노트 PR 올림(`card/112-level-screens`, 전 11개 ≥300단어). 다음: ③ learn 고유 장문(주 2편 이하) → ④ 틀 글 다듬기 → ⑤ docs/adsense 11-25 기록·얇은 페이지 검사.
4. [S2] #115 유입 출처 분류 → #117 Search Console 주간 수집 → #105(허브 H4의 llms.txt 생성기 부탁 `끝냄` 답 뒤, 노하우만).
5. [S1] 데일리 D2 → 카드 #123(브리프 `docs/team/specs/2026-11-26-daily-d2-brief.md`). 시안 생성 뒤 채점 → slice.
6. [S1] 실기기 확인: iOS Safari·안드로이드 홈 붓기·시트 끌기·데일리 클리어, Web Vitals LCP p75 ≤2.5s·CLS ≤0.1.
7. [S1] 북극성 관찰: `daily_start`가 /daily 마운트 때 나가 '퍼즐 시작'보다 넓다 — 데일리로 쏠리면 SpillPlayer 첫 RUN으로 옮길지(지표 끊김 주의).
8. 리뷰 보류: 넓은 화면 Spill HUD 메뉴 카드 위치(버튼 rect 기준), share-1440 썸네일 480 < 카드 560, 메뉴 doc 링크 전체 이동.
9. [운영] 운영안 v2 마무리: ① 루틴 재편 — 오너가 루틴 계정 로그인 + Slack 커넥터 연결 후 메인 세션이 `docs/team/routines/` 초안으로 생성(그 전엔 루틴 생성·수정 금지) ② 허브 정본 SHIFT·OPS 공통부 → 이 저장소 사본 동기화 Action ③ 하트비트 누락 감지 Actions cron(GitHub cron은 3~5시간 늦을 수 있다, archive playbook '배운 점') ④ 로그 절삭 PreToolUse hook(고위험·리뷰 2회) ⑤ `stop-unsaved-work` 안내의 브랜치 이름 `shift/` → `card/`(고위험).
- 오너 선택·할 일: 갤러리 Top을 작품 전 기간 순위로(워커 `sort=top`), AdSense 고정 300×250 단위 생성(`AD_SLOTS.play`), workers.dev 하위 도메인 활성(프리뷰 배포는 한 번도 안 함), main 브랜치 보호 필수 체크(`pr-guard / high-risk` 포함 — Actions가 main에 직접 커밋하는 워크플로 4개를 PR 방식으로 바꾼 뒤), Search Console·Bing 접근 방법.

## 현재 유효한 함정
- 정본은 [docs/team/PITFALLS.md](../../docs/team/PITFALLS.md) 맨 위 절 — 카드 영역의 줄만 읽는다. 새 함정은 그 파일에.

## 검증 상태
- main(#98, 11-21) 기준 PR CI 초록. 컷오버 게이트(#97): Lighthouse 모바일 중앙값 홈 2375·/daily 2405·/play 2330·/gallery 2411ms, CLS ≤0.037, cutover-e2e 21/21, head-parity·content-parity 차이 0(보고 `docs/perf/2026-11-20-p12-cutover-qa.json`).
- 검사 묶음: `pnpm qa:preview`(build:preview 뒤), `node scripts/qa/cutover-e2e.mjs --out <dir>`(`--base https://sandlab.app`이면 라이브, 쓰기 차단), 갤러리 `npx wrangler dev --port 8799 --local` + `python3 scripts/verify-gallery.py`.
