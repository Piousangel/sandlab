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
| 2026-11-25 (14시) | [S2] #112 1단계: 홈 캔버스 아래 소개 절(HomeAbout)·/daily 규칙 본문 절(정적 HTML) | /, /daily | `pnpm verify` 통과, 빌드 실측 홈 main 65→470단어·/daily 11→316 | 측정 없음(색인 확인은 보강 뒤) |
