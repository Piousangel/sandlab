# 데일리 출시 로그

| 날짜 | 출시물 | URL | 검증 | 메모 |
|---|---|---|---|---|
| 2026-11-11 | 공략 템플릿 + W1 8레벨 공략 | /play/1-1/guide ~ /play/1-8/guide | typecheck·build·verify-ads·spill:verify 8/8·guide 테스트 통과 (lint: eslint 미설치로 못 돌림) | 시뮬 해 공간 탐색으로 공략 근거 확보. 1-6 너무 쉬움·결과 카드 팁 오해 → 백로그 |
| 2026-11-12 | 결과 카드 팁 수정 (젬 별 저장 안내) | /play/1-3, 1-4, 1-8 결과 카드 | typecheck·test 1034 통과(verify.test 제외)·view.test 신규 케이스 | 젬을 다 먹고 par만 놓치면 "Gem star saved — par is N, chase it in a fresh run" |
| 2026-11-13 | Spill 1-9 Overflow + 공략 | /play/1-9, /play/1-9/guide | typecheck·test(verify.test 제외)·build·verify-ads 통과, spill:verify 9/9 PASS | 넓은 트레이의 오답 절반(파티 쪽 컷은 전부 stalled). 지표 D1 쿼리 전부 실패 → 사람 확인 필요 |
| 2026-11-14 | 첫 화면 실험 1: 데스크톱 홈 최신 Spill 레벨 카드 | / (데스크톱) → /play/1-9 | typecheck·test 1042(verify.test 제외)·build·verify-ads (결과는 PR) | 7일 뒤(11-21) challenge_start 변화로 판단. 카드 클릭 계측 없음 |
| 2026-11-15 | Spill 1-10 Twin Cups + 공략 | /play/1-10, /play/1-10/guide | typecheck·test·spill:verify 10/10·build·verify-ads (결과는 PR) | 데스크톱 홈 카드가 자동으로 1-10을 가리킴(실험 1 변수 동일). 카드 클릭 계측은 여전히 없음 |
| 2026-11-16 | 유입 계측 `landing` 이벤트(?ref= 태그·referrer 분류) + 주간 회고·큰 기능 스펙 2 | 전 페이지(비가시) | typecheck·test 1057·spill:verify·build·verify-ads (결과는 PR) | 11-23 지표 파일에서 채널별 유입 확인 |
| 2026-11-17 | /daily를 Spill 엔진으로 교체(폰·CPU, 날짜별 레벨, 공유 문구) + daily_start/daily_clear 계측 | /daily | typecheck·test 1062·spill:verify 10/10·build·verify-ads·로컬 빌드 /daily 렌더 확인 | 옛 challenge 코드·/api/daily는 롤백용으로 유지(후속 정리). 기대: 7일 daily_start ≥ 20 |
| 2026-11-17 (20시) | 출시 확인: #28 머지·deploy success, 마케팅 보강·portfolio.md 신설 | docs | 문서만(출시 아님) | 라이브 /daily는 프록시로 미확인 |
| 2026-11-18 | Spill 2-1 Wooden Door + 공략 + 판정기(연소 중 정체 안 걸림) + 불 전용 실패 문구 + 월드 첫 레벨 맛보기 개방 | /play/2-1, /play/2-1/guide | typecheck·test·spill:verify·build·verify-ads (결과는 PR) | 독립 리뷰 반영(문구 spark만, 2-1 잠금 예외). 봇 2종은 미구현 — 다음 세션 |
| 2026-11-19 | Spill UI 개편 1단계(크림 토큰·SVG HUD·목표 링 칩·입체 RUN) — 혹평 5.5 수정 후 재리뷰 대기 | /play/*, /daily | typecheck·test 통과, 나머지 PR 참조 | 390/360 실캡처 못 함 |
| 2026-11-20 | 03시 QA: /daily 결과 카드 Share가 레벨 링크를 공유하던 버그 수정(데일리 문구·계측) + /daily·/gallery h1 정리 + scripts/qa 상시화, docs/team/bugs.md 신설 | /daily, /gallery | typecheck·test·spill:verify·build·verify-ads·margolus·gallery (PR) | 라이브 프록시 403 → 로컬 prod로 점검 |
| 2026-11-20 (06시) | 회의·P5 리서치 1·기획 v1, '일일 출시 vs prod diff 0' 조정(DECISIONS) | docs | 문서만(출시는 16시 P5 — prod 조각: 데일리 공유 문구 v2) | 라이브 프록시 000으로 미확인 |
| 2026-11-20 (13시) | 리디자인 P11a: 선택 관 한 번 붓기(프리뷰)·재료/도크 키보드 로빙·Lighthouse 압축 측정 스크립트(P10 기준선 정정, 실제 미달 3곳 특정) | / (프리뷰), scripts/qa | typecheck·unit·lint:ui·contrast·home-rack e2e 22/22·Lighthouse(PR) | 측정 PR(북극성)은 16시 몫 |
| 2026-11-20 (16시) | 북극성 측정 PR: 익명 기기 id(AE blob5)·first_stroke·홈 landing 표시·?ref=threads·지표 파일 북극성 줄·Privacy 고지 | /api/track, /, /privacy | typecheck·unit 1552·lint:ui·build·verify-ads 통과, CI 참조 | AE SQL은 원격 실행 못 함(첫 지표 수집에서 확인) |
| 2026-11-24 | [운영] 운영안 v2 기반 문서: SHIFT·OPS 사본(정본 허브), CLAUDE.md 절대 규칙·`pnpm verify` 하나, 인계서 현재분 7KB(전문은 docs/archive, 함정은 docs/team/PITFALLS.md), 옛 OPERATING·SESSION-GUIDE·cycle·direction·playbook·routine-prompt·charter 보관, 데일리 스킬 v2화, 카드 템플릿·decisions/open.json·루틴 초안·.claude/agents | 팀 문서(사용자 화면 변화 없음) | verify·필독 세트 바이트 표·독립 리뷰 2회 | 북극성 11(부분) |
| 2026-11-24 (01시) | [S1 #104] 프리프로: 1-1~1-3 진단·레퍼런스(Sandcastle 등, 검색 요약)·채점표 브리프 + 독립 혹평 6/10 반영, Gemini 시안 요청 갱신(#99 대체, pro 3장+혹평 1) | docs/team/specs, docs/design | 문서만 — pnpm verify | 측정 없음(프리프로) |
| 2026-11-27 (09시) | [S1·prepro] 데일리 D2 관문 1 r1 채점 보류(A 6.2·B 7.0·C 6.6·현 5.2, 독립 reviewer·격자 사본) + r2 요청 B2·B3 flash 2장(≈₩200, 카드 누적 ≈₩500) (#131) | 팀 문서(사용자 화면 변화 없음) | verify·격자 사본·흑백 | 측정 없음(데일리 공식 클리어는 슬라이스 머지 +14일) |
| 2026-11-26 (09시) | [S1·prepro] 데일리 D2 브리프: 390 지층 병 첫 화면 밖 실측(y=747~765/844)·시안 2방향 요청(flash, ≈₩300)·"왜 별을 놓쳤나" 문장 규칙·채점표 D1~D5 (#123) | 팀 문서(사용자 화면 변화 없음) | verify·독립 혹평 | 측정 없음(데일리 공식 클리어는 슬라이스 머지 +14일) |
| 2026-11-26 (01시) | [S1·high-risk] #108 P12 72시간 판정 '유지' 기록 + classic 옛 화면 코드 삭제(SandCanvas·GalleryBrowser·ResultCard·ChallengePlayer·DailyPlayer 등), classic 빌드는 next.config가 멈춤 | 화면 변화 없음(/, /gallery, 결과 화면 번들만 줄어듦) | verify·main 대비 out/ 페이지 목록·head·본문 텍스트 diff 0 | 북극성 13(부분, 11-26 파일) |
| 2026-11-25 (14시) | [S2] #112 1단계: 홈 캔버스 아래 소개 절(HomeAbout)·/daily 규칙 본문 절(정적 HTML) | /, /daily | `pnpm verify` 통과, 빌드 실측 홈 main 65→470단어·/daily 11→316 | 측정 없음(색인 확인은 보강 뒤) |
| 2026-11-26 (11시) | [S3 #126] 오늘의 레벨 2-2 Fuse(불꽃 1개·도화선 1줄로 판자 문 2개, Line 동사 첫 출시) + 공략 `/play/2-2/guide` 562단어 | /play/2-2, /play/2-2/guide, sitemap | spill:verify 2-2 PASS·불꽃 단독 276칸 전수 0클리어·explore 무작위 0%(441표본)·통로 수평 도화선 4.2% | 머지 +14일 공략 노출·2-2 start/clear |
| 2026-11-26 (14시) | [S2] #112 2단계: 레벨 화면 11개(1-1~1-10·2-1)에 레벨 고유 노트(목표 장면·원리·막히는 지점 2~3개, `src/content/level-notes.ts`) | /play/<id> 11개 | `pnpm verify` 통과, 빌드 실측 `<main>` 194~282→309~400단어(전 11개 ≥300) | 측정 없음(색인 확인은 보강 뒤) |
| 2026-11-27 (01시) | [S1·prepro] #104 관문 1 라운드 1 채점: 시안 A·B·C 160×240 격자 사본 + 독립 reviewer S1~S6 → 보류(5.5·6.2·5.3, 통과선 7/7.5) · r2 요청(B2·A2 pro + Gemini 혹평, ≈₩500) | 팀 문서(사용자 화면 변화 없음) | verify·격자 사본 채점 | 측정 없음(슬라이스 전) |
| 2026-11-27 (11시) | [S3 #135] 오늘의 레벨 2-3 Plank Bridge(판자 1줄로 구덩이 건너기, 불 없음·Line 판자 첫 출시) + 공략 `/play/2-3/guide` 526단어 | /play/2-3, /play/2-3/guide, sitemap | spill:verify 2-3 ALL PASS·explore 무작위 0.5%(13363후보 중 400표본)·구덩이 수평 판자 293개 전수 11.9%(35) | 머지 +14일 공략 노출·2-3 start/clear |
| 2026-11-27 (14시) | [S1·prepro] #132 slice 구현 지도: 렌더 경로 지도·목표 셀 영역 = 본 층 backdrop 1안(프레임 비용 0)·재료×배경(B2/A2) 대비 표(색 출처 파일:줄)·slice PR 3장 분할 | 팀 문서(사용자 화면 변화 없음) | verify·대비 계산 스크립트(scratchpad) | 측정 없음(슬라이스 전) |
| 2026-11-27 (16시) | [S1·prepro] #104 관문 1 라운드 2 채점: B2·A2 격자 사본 3장 + 독립 reviewer → 미달(6.0·6.5) · 결정 요청 `S1 보드 방향` | docs 전용 | 문서 등급, verify | 이 PR · 측정 없음 |
| 2026-11-28 (01시) | [S1·slice] #139 목표 = 셀 영역: Spill 보드 목표를 점선 사각형 대신 물색 15% 틴트·둘레 1셀 윤곽·눈금 3개로(본 층 backdrop, 레벨 로드 때 1회 굽기). 색은 현 크롬 기준, 테마 값은 보드 방향 결정 뒤 | /play·/daily·홈 오늘 카드 보드 | backdrop.test.ts(rect 밖 틴트 0·안 상수 0·에디터 불변)·contrast 윤곽/틴트 3.71·윤곽/배경 4.17·verify | 측정 없음(슬라이스 진행 중) |
