# HANDOFF — 샌드랩 (현재분 ≤10KB · 줄 ≤150. 이력은 docs/archive/handoff-2026-*.md, 함정 정본은 docs/team/PITFALLS.md, 규칙은 docs/team/SHIFT.md)
갱신: 2026-11-27(계획 루틴) · 북극성 주간 손댄 방문자 14(부분 6일치, 지표 11-27 파일) · 첫 붓기율 52%(14/27) · 방문자(UTC) 하루 약 5 · 데일리 클리어 7일 3

## 지금 상태
- P12 컷오버 완료(#97, 11-21): prod sandlab.app = 새 셸 「Glass & Grain」(`src/ui-next/`). 72시간 판정 = 유지(DECISIONS 11-26, #108). #108 PR 머지 뒤 되돌리기 = revert PR(고위험·리뷰 2회) — `SANDLAB_UI=classic` 변수 경로는 next.config.ts가 빌드를 멈춘다.
- 72시간 확인 기한(11-23) 지남 — 판정 기록 없음. 지표 11-25(7일): landing 66 · first_stroke 14 · daily_start 16 · challenge_start 26 · challenge_clear 21 · gpu_unsupported 5 · 첫 붓기율 55%(11/20). 컷오버 전(11-22 파일): 46 · 2 · 8 · 15 · 8 · 8 → 핵심 흐름 끊김 없음, 실패 신호 늘지 않음(표본 작음).
- 11-21 이후 main 머지 0(지표 커밋만) — 루틴 한도·운영안 v2 재편 중.
- PR CI 초록 = 머지 조건(typecheck·lint:ui·contrast·margolus / vitest unit·sim / spill:verify 2갈래 / prod 빌드·verify-ads·갤러리 API / build:preview), 만성 실패 0.
- 광고: `ADS_ENABLED = false`(ads/config.ts), AdSense 결과 대기. 재심사 신청 금지(사람 몫).
- 오너 11-24: S1 = /play 월드 1~2 챌린지를 Steam 「Sandcastle Demo」급으로 — 1-1~1-3 버티컬 슬라이스 → 오너 10분 플레이 승인 → 확산.

## 진행 중·열린 PR
- [S3] #135 오늘의 레벨 2-3 Plank Bridge(W2 셋째, 불 없음·Line 판자 첫 출시) + 공략 — PR review, 15:37 리뷰 머지 대기. 다음 S3: 2-4(스펙 3.3 Oil Film — 기름막 점화, salts-16 100%가 게이트). 판자 실측 수치는 PR 본문.
- #130 `card/104-slice-g3-score` [S1 prepro] 슬라이스 관문 1 라운드 1 **보류**(A 5.5·B 6.2·C 5.3, 통과 0) + r2 요청 B2·A2(목표 = 셀 영역 틴트·윤곽) — 문서 등급, review. 머지 → gen-assets → #104 r2 채점. r2도 미달이면 결정 요청 `S1 보드 방향`(B 밝은 종이 / A 어두운 따뜻한 / 현 크롬 + 목표 규칙만).
- #131 `card/131-daily-d2-g3-score` [S1 prepro] 데일리 D2 관문 1 라운드 1 **보류**(A 6.2·B 7.0·C 6.6·현 5.2, 통과 0) + r2 요청 B2·B3(flash 2장, 오늘 층 2배·팔레트 색만) — PR #134 머지(11-27 21:37 리뷰) → gen-assets → 다음 S1 기획 run이 r2 채점. 미달이면 결정 요청 `데일리 D2 방향`.
- 열린 카드: #104 S1 prepro(review, #130) · #131 S1 prepro(review, 위 PR) · #132 S1 prepro(ready, slice 구현 지도) · #112 S2(ready, 2-2 노트 빈 절 먼저) · #115·#117·#105 S2(ready).
- 11-26 머지: #119(classic 삭제, high-risk) · #116·#128(#112 1·2단계) · #124(D2 브리프) · #127(2-2 Fuse) · #107(슬라이스 프리프로). #119 후속 메모: deploy.yml 41행 낡은 주석·고아 `fetchHist`(카드 없음, 고위험 경로라 S1 뒤).

## 다음 할 일 (우선순위)
오늘(11-27) 카드 — 새 카드 #131·#132(S1 4칸이 놀지 않게):
1. [리뷰] 10:37 #130 머지(S1 먼저, D-1126-03) → gen-assets r2.
2. [S1] #131 r1 채점 끝(보류) → 리뷰가 PR 머지 → gen-assets r2(B2·B3) → 다음 S1 기획 run이 같은 격자 절차로 채점, 통과면 계획 루틴이 D2 `stage:slice` 카드.
3. [S1] 14:07 #132 1-1~1-3 slice 구현 지도(목표 셀 영역 렌더·재료×배경 대비·PR ≤3장 분할, 코드 없음).
4. [S1] 16:07(r2 생성됐으면) 또는 다음 01:07 #104 r2 채점 → 통과면 계획 루틴이 #132 분할대로 `stage:slice` 카드.
5. [S3] 11:37 오늘의 레벨 2-3 → PR 올림(#135). 다음 11:37은 2-4 Oil Film. 남는 시간 #112(2-2 노트 → ③ learn 장문 → ④ 틀 글 → ⑤ adsense 기록) → #115 → #117 → #105(허브 H4 `끝냄` 뒤, 노하우만).
6. [S1] 실기기 확인: iOS Safari·안드로이드 홈 붓기·시트 끌기·데일리 클리어, Web Vitals LCP p75 ≤2.5s·CLS ≤0.1.
7. [S1] 북극성 관찰: `daily_start`가 /daily 마운트 때 나가 '퍼즐 시작'보다 넓다 — 데일리로 쏠리면 SpillPlayer 첫 RUN으로 옮길지(지표 끊김 주의).
8. 리뷰 보류(polish 후보): 넓은 화면 Spill HUD 메뉴 카드 위치(버튼 rect 기준), share-1440 썸네일 480 < 카드 560, 메뉴 doc 링크 전체 이동.
9. [운영] 운영안 v2 마무리: ① 루틴 재편 — 오너가 루틴 계정 로그인 + Slack 커넥터 연결 후 메인 세션이 `docs/team/routines/` 초안으로 생성(그 전엔 루틴 생성·수정 금지) ② 허브 정본 SHIFT·OPS 공통부 → 이 저장소 사본 동기화 Action ③ 하트비트 누락 감지 Actions cron(GitHub cron은 3~5시간 늦을 수 있다, archive playbook '배운 점') ④ 로그 절삭 PreToolUse hook(고위험·리뷰 2회) ⑤ `stop-unsaved-work` 안내의 브랜치 이름 `shift/` → `card/`(고위험).
- 오너 선택·할 일: 갤러리 Top을 작품 전 기간 순위로(워커 `sort=top`), AdSense 고정 300×250 단위 생성(`AD_SLOTS.play`), workers.dev 하위 도메인 활성(프리뷰 배포는 한 번도 안 함), main 브랜치 보호 필수 체크(`pr-guard / high-risk` 포함 — Actions가 main에 직접 커밋하는 워크플로 4개를 PR 방식으로 바꾼 뒤), Search Console·Bing 접근 방법.

## 현재 유효한 함정
- 정본은 [docs/team/PITFALLS.md](../../docs/team/PITFALLS.md) 맨 위 절 — 카드 영역의 줄만 읽는다. 새 함정은 그 파일에.

## 검증 상태
- main(#98, 11-21) 기준 PR CI 초록. 컷오버 게이트(#97): Lighthouse 모바일 중앙값 홈 2375·/daily 2405·/play 2330·/gallery 2411ms, CLS ≤0.037, cutover-e2e 21/21, head-parity·content-parity 차이 0(보고 `docs/perf/2026-11-20-p12-cutover-qa.json`).
- 검사 묶음: `pnpm qa:preview`(build:preview 뒤), `node scripts/qa/cutover-e2e.mjs --out <dir>`(`--base https://sandlab.app`이면 라이브, 쓰기 차단), 갤러리 `npx wrangler dev --port 8799 --local` + `python3 scripts/verify-gallery.py`.
