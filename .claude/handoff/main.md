# HANDOFF — 샌드랩 (현재분 ≤10KB · 줄 ≤150. 이력은 docs/archive/handoff-2026-*.md, 함정 정본은 docs/team/PITFALLS.md, 규칙은 docs/team/SHIFT.md)
갱신: 2026-11-28(계획 루틴) · 북극성 주간 손댄 방문자 15(지표 11-28 파일, 수집 11-27 11:08) · 첫 붓기율 52%(14/27) · 방문자(UTC) 하루 약 2~8 · 데일리 클리어 7일 3

## 지금 상태
- P12 컷오버 완료(#97, 11-21): prod sandlab.app = 새 셸 「Glass & Grain」(`src/ui-next/`). 72시간 판정 = 유지(DECISIONS 11-26, #108). #108 PR 머지 뒤 되돌리기 = revert PR(고위험·리뷰 2회) — `SANDLAB_UI=classic` 변수 경로는 next.config.ts가 빌드를 멈춘다.
- 72시간 확인 기한(11-23) 지남 — 판정 기록 없음. 지표 11-25(7일): landing 66 · first_stroke 14 · daily_start 16 · challenge_start 26 · challenge_clear 21 · gpu_unsupported 5 · 첫 붓기율 55%(11/20). 컷오버 전(11-22 파일): 46 · 2 · 8 · 15 · 8 · 8 → 핵심 흐름 끊김 없음, 실패 신호 늘지 않음(표본 작음).
- 11-21 이후 main 머지 0(지표 커밋만) — 루틴 한도·운영안 v2 재편 중.
- PR CI 초록 = 머지 조건(typecheck·lint:ui·contrast·margolus / vitest unit·sim / spill:verify 2갈래 / prod 빌드·verify-ads·갤러리 API / build:preview), 만성 실패 0.
- 광고: `ADS_ENABLED = false`(ads/config.ts), AdSense 결과 대기. 재심사 신청 금지(사람 몫).
- 오너 11-24: S1 = /play 월드 1~2 챌린지를 Steam 「Sandcastle Demo」급으로 — 1-1~1-3 버티컬 슬라이스 → 오너 10분 플레이 승인 → 확산.

## 진행 중·열린 PR
- [S1] #140 `card/139-target-backdrop` 목표 = 셀 영역(물색 15% 틴트·둘레 1셀 윤곽·눈금 3, 대비 3.71/4.17을 check-contrast에 고정) — 제품 등급, review. 색은 현 크롬 기준, 테마 값은 D-1128-01 뒤.
- [S1] #104 blocked — 관문 1 r2 미달(B2 6.0·A2 6.5, #138). 결정 `D-1128-01 S1 보드 방향`(open.json, 기본안 2, 마감 11-28 13:30, Slack ts 1795811992.529019).
- 열린 카드: #141 S1 prepro(review, PR 데일리 D2 r2 미달 — B2 7.4·B3 6.2, 결정 요청 `데일리 D2 방향` 기본안 1 = B2 미니 병 슬라이스) · #142 S1 prepro(ready, **13:30 뒤** A2 실제 렌더 채점) · #139 S1 slice(review, PR #140) · #104 S1(blocked) · #112·#115·#117·#105 S2(ready, #105는 허브 H4 `끝냄` 11-26 — 선행 조건 풀림).
- 11-27 머지: #134(D2 r1 보류) · #130(슬라이스 r1 보류) · #136(2-3 Plank Bridge, 출시) · #137(slice 구현 지도) · #138(슬라이스 r2 미달). #119 후속 메모: deploy.yml 41행 낡은 주석·고아 `fetchHist`(카드 없음, 고위험 경로라 S1 뒤).

## 다음 할 일 (우선순위)
오늘(11-28) 카드 — 새 카드 #141·#142, 결정 D-1128-01:
1. [S1] #141 데일리 D2 r2 **미달**(B2 7.4, D2 6 — 오늘 층 1.29배). 카드 코멘트의 결정 요청 `데일리 D2 방향`(기본안 1 B2 미니 병 + 수치 수락 기준)을 **20시 창** open.json에 올린다(카드는 PR 머지로 닫히니 놓치지 말 것).
2. [리뷰] 10:37 #140(제품, S1 먼저) 독립 리뷰 → 머지.
3. [결정] 13:30 D-1128-01 마감 — 답 `^D-1128-01: ?[1-3]$`만 인정. 답 없으면 기본안 2 `defaulted`(되돌릴 수 있음·high-risk 아님) → 운영·다음 계획 루틴이 open.json·DECISIONS 반영. 답 1이면 #142 닫고 impl-map ②(재료 명암, 현 크롬) 카드.
4. [S1] 14:07 #142 A2 실제 렌더 캡처 채점(src 변경 0) → 통과면 impl-map ① 색 확정·② 카드(`stage:slice`), 미달이면 #104에 다음 안.
5. [S3] 11:37 오늘의 레벨 2-4 Oil Film(스펙 3.3, salts-16 100% 게이트). CI 2-3 갈래 22분(제한 25분) — 무거운 레벨은 표본 수 조정 필요. 남는 시간 #112 → #115 → #117 → #105.
6. [S1] 16:07 polish 칸: #140 리뷰 지적 반영 또는 빈 슬롯(정상).
7. [S1] 실기기 확인: iOS Safari·안드로이드 홈 붓기·시트 끌기·데일리 클리어, Web Vitals LCP p75 ≤2.5s·CLS ≤0.1.
8. [S1] 북극성 관찰: `daily_start`가 /daily 마운트 때 나가 '퍼즐 시작'보다 넓다 — 데일리로 쏠리면 SpillPlayer 첫 RUN으로 옮길지(지표 끊김 주의).
9. 리뷰 보류(polish 후보): 넓은 화면 Spill HUD 메뉴 카드 위치(버튼 rect 기준), share-1440 썸네일 480 < 카드 560, 메뉴 doc 링크 전체 이동.
10. [운영] 운영안 v2 마무리: ① 루틴 재편 — 오너가 루틴 계정 로그인 + Slack 커넥터 연결 후 메인 세션이 `docs/team/routines/` 초안으로 생성(그 전엔 루틴 생성·수정 금지) ② 허브 정본 SHIFT·OPS 공통부 → 이 저장소 사본 동기화 Action ③ 하트비트 누락 감지 Actions cron ④ 로그 절삭 PreToolUse hook(고위험·리뷰 2회) ⑤ `stop-unsaved-work` 안내의 브랜치 이름 `shift/` → `card/`(고위험).
- 운영 메모: 11-27 20시 요약이 blocked 카드의 결정 요청(#104 16:35)을 '열린 결정 없음'으로 놓쳤다 — blocked 카드 `결정 요청:` 코멘트 수집을 계획·운영 둘 다 확인.
- 오너 선택·할 일: 갤러리 Top을 작품 전 기간 순위로(워커 `sort=top`), AdSense 고정 300×250 단위 생성(`AD_SLOTS.play`), workers.dev 하위 도메인 활성(프리뷰 배포는 한 번도 안 함), main 브랜치 보호 필수 체크(`pr-guard / high-risk` 포함 — Actions가 main에 직접 커밋하는 워크플로 4개를 PR 방식으로 바꾼 뒤), Search Console·Bing 접근 방법.

## 현재 유효한 함정
- 정본은 [docs/team/PITFALLS.md](../../docs/team/PITFALLS.md) 맨 위 절 — 카드 영역의 줄만 읽는다. 새 함정은 그 파일에.

## 검증 상태
- main(#98, 11-21) 기준 PR CI 초록. 컷오버 게이트(#97): Lighthouse 모바일 중앙값 홈 2375·/daily 2405·/play 2330·/gallery 2411ms, CLS ≤0.037, cutover-e2e 21/21, head-parity·content-parity 차이 0(보고 `docs/perf/2026-11-20-p12-cutover-qa.json`).
- 검사 묶음: `pnpm qa:preview`(build:preview 뒤), `node scripts/qa/cutover-e2e.mjs --out <dir>`(`--base https://sandlab.app`이면 라이브, 쓰기 차단), 갤러리 `npx wrangler dev --port 8799 --local` + `python3 scripts/verify-gallery.py`.
